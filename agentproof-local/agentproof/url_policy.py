"""URL Validation and SSRF Protection Policy Engine for AgentGuard.

Provides strict, deterministic validation of URLs, hostnames, IP addresses,
DNS resolution, and outbound requests to prevent Server-Side Request Forgery (SSRF),
protocol abuse, loopback/private network scanning, and cloud metadata access.
"""

from dataclasses import dataclass, field
from enum import Enum
import ipaddress
import re
import socket
from typing import Optional
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode


# Bounded maximum URL length
DEFAULT_MAX_URL_LENGTH = 2048

# Allowed web navigation schemes
ALLOWED_SCHEMES = frozenset({"http", "https"})

# Blocked schemes that must never be loaded as top-level or subresource requests
BLOCKED_SCHEMES = frozenset({
    "file", "data", "javascript", "ftp", "ws", "wss", "chrome", "chrome-extension",
    "about", "edge", "view-source", "blob", "gopher", "dict", "ldap", "tftp",
})

# Specific cloud metadata and internal service IP addresses
CLOUD_METADATA_IPS = frozenset({
    "169.254.169.254",   # AWS, Azure, GCP, OpenStack instance metadata
    "100.100.100.200",   # Alibaba Cloud instance metadata
    "169.254.170.2",     # AWS ECS container agent metadata
    "fe80::169:254:169:254",  # IPv6 metadata
})

# Prohibited internal/private domain suffix patterns
BLOCKED_DOMAIN_SUFFIXES = (
    ".localhost",
    ".local",
    ".internal",
    ".lan",
    ".corp",
    ".home",
    ".intra",
    ".test",
    ".example",
    ".invalid",
    ".onion",
)

# Exact blocked hostnames
BLOCKED_HOSTNAMES = frozenset({
    "localhost",
    "metadata.google.internal",
    "metadata",
    "instance-data",
    "kubernetes.default",
    "kubernetes.default.svc",
    "kubernetes",
})


class BlockedReason(str, Enum):
    UNSUPPORTED_SCHEME = "unsupported_scheme"
    INVALID_HOST = "invalid_host"
    CREDENTIALS_DISALLOWED = "credentials_disallowed"
    LOOPBACK_BLOCKED = "loopback_blocked"
    PRIVATE_IP_BLOCKED = "private_ip_blocked"
    LINK_LOCAL_BLOCKED = "link_local_blocked"
    METADATA_ENDPOINT_BLOCKED = "metadata_endpoint_blocked"
    INTERNAL_DOMAIN_BLOCKED = "internal_domain_blocked"
    DNS_RESOLUTION_FAILED = "dns_resolution_failed"
    URL_TOO_LONG = "url_too_long"
    CONTROL_CHARACTERS = "control_characters"
    INVALID_PORT = "invalid_port"
    UNSAFE_REDIRECT = "unsafe_redirect"
    UNSAFE_SUBRESOURCE = "unsafe_subresource"
    MULTICAST_OR_RESERVED = "multicast_or_reserved"


@dataclass
class URLValidationResult:
    """Detailed result of URL policy inspection."""
    is_allowed: bool
    url: str
    normalized_url: str = ""
    hostname: str = ""
    port: Optional[int] = None
    scheme: str = ""
    resolved_ips: list[str] = field(default_factory=list)
    blocked_reason: Optional[BlockedReason] = None
    error: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "is_allowed": self.is_allowed,
            "url": self.url,
            "normalized_url": self.normalized_url,
            "hostname": self.hostname,
            "port": self.port,
            "scheme": self.scheme,
            "resolved_ips": self.resolved_ips,
            "blocked_reason": self.blocked_reason.value if self.blocked_reason else None,
            "error": self.error,
        }


def is_ip_blocked(
    ip: ipaddress.IPv4Address | ipaddress.IPv6Address,
    allow_loopback_for_testing: bool = False,
) -> tuple[bool, Optional[BlockedReason], Optional[str]]:
    """Determine whether an IP address belongs to a prohibited or private range.

    Handles IPv4, IPv6, and IPv4-mapped IPv6 representations.
    """
    # Check if this is an IPv4-mapped IPv6 address (e.g., ::ffff:127.0.0.1)
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped

    ip_str = str(ip)

    # Cloud metadata checks
    if ip_str in CLOUD_METADATA_IPS:
        return True, BlockedReason.METADATA_ENDPOINT_BLOCKED, f"Cloud metadata IP target blocked: {ip_str}"

    # Loopback checks
    if ip.is_loopback:
        if allow_loopback_for_testing:
            return False, None, None
        return True, BlockedReason.LOOPBACK_BLOCKED, f"Loopback address blocked: {ip_str}"

    # Private network checks
    if ip.is_private:
        return True, BlockedReason.PRIVATE_IP_BLOCKED, f"Private network address blocked: {ip_str}"

    # Link-local checks
    if ip.is_link_local:
        return True, BlockedReason.LINK_LOCAL_BLOCKED, f"Link-local address blocked: {ip_str}"

    # Multicast or unspecified
    if ip.is_multicast or ip.is_unspecified:
        return True, BlockedReason.MULTICAST_OR_RESERVED, f"Multicast or unspecified address blocked: {ip_str}"

    # Reserved (e.g. 240.0.0.0/4)
    if getattr(ip, "is_reserved", False):
        return True, BlockedReason.MULTICAST_OR_RESERVED, f"Reserved address blocked: {ip_str}"

    # Carrier-Grade NAT (100.64.0.0/10)
    if isinstance(ip, ipaddress.IPv4Address):
        cgnat = ipaddress.IPv4Network("100.64.0.0/10")
        if ip in cgnat:
            return True, BlockedReason.PRIVATE_IP_BLOCKED, f"Carrier-Grade NAT address blocked: {ip_str}"

    return False, None, None


def parse_numeric_ip(host: str) -> Optional[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    """Parse integer, hex, octal, or standard IP literal into an IPAddress object safely."""
    # IPv6 in brackets
    clean_host = host.strip("[]")
    try:
        return ipaddress.ip_address(clean_host)
    except ValueError:
        pass

    # Check for single integer IPv4 representation (e.g. 2130706433 for 127.0.0.1)
    if clean_host.isdigit():
        try:
            val = int(clean_host)
            if 0 <= val <= 0xFFFFFFFF:
                return ipaddress.IPv4Address(val)
        except ValueError:
            pass

    # Check for hex representation (e.g. 0x7f000001)
    if clean_host.lower().startswith("0x"):
        try:
            val = int(clean_host, 16)
            if 0 <= val <= 0xFFFFFFFF:
                return ipaddress.IPv4Address(val)
        except ValueError:
            pass

    # Check for octal components (e.g. 0177.0.0.1)
    parts = clean_host.split(".")
    if len(parts) == 4:
        try:
            int_parts = []
            for p in parts:
                if p.startswith("0") and len(p) > 1 and not p.lower().startswith("0x"):
                    int_parts.append(int(p, 8))
                elif p.lower().startswith("0x"):
                    int_parts.append(int(p, 16))
                elif p.isdigit():
                    int_parts.append(int(p, 10))
                else:
                    return None
            if all(0 <= v <= 255 for v in int_parts):
                return ipaddress.IPv4Address(".".join(str(v) for v in int_parts))
        except (ValueError, OverflowError):
            pass

    return None


def sanitize_url_for_display(
    url: str,
    redact_query: bool = True,
    redact_fragment: bool = True,
) -> str:
    """Redact sensitive query parameters, fragments, and credentials for safe logging and response display."""
    if not url:
        return ""
    try:
        parts = urlsplit(url)
        # Strip credentials
        netloc = parts.netloc
        if "@" in netloc:
            netloc = netloc.split("@")[-1]

        query = "[REDACTED_QUERY]" if (redact_query and parts.query) else parts.query
        fragment = "" if redact_fragment else parts.fragment

        return urlunsplit((parts.scheme, netloc, parts.path, query, fragment))
    except Exception:
        # Fallback strip
        return re.sub(r"://[^@]+@", "://[REDACTED]@", url)


class URLPolicy:
    """Authoritative URL and SSRF validation policy engine."""

    def __init__(
        self,
        max_url_length: int = DEFAULT_MAX_URL_LENGTH,
        allow_loopback_for_testing: bool = False,
    ):
        self.max_url_length = max_url_length
        self.allow_loopback_for_testing = allow_loopback_for_testing

    def validate_url(self, raw_url: str) -> URLValidationResult:
        """Thoroughly validate a top-level URL against SSRF and syntax policies."""
        if not raw_url or not isinstance(raw_url, str):
            return URLValidationResult(
                is_allowed=False,
                url=str(raw_url or ""),
                blocked_reason=BlockedReason.INVALID_HOST,
                error="Target URL is required and must be a non-empty string.",
            )

        # 1. URL length validation
        if len(raw_url) > self.max_url_length:
            return URLValidationResult(
                is_allowed=False,
                url=raw_url[:120] + "...[TRUNCATED]",
                blocked_reason=BlockedReason.URL_TOO_LONG,
                error=f"URL exceeds maximum allowed length of {self.max_url_length} characters.",
            )

        # 2. Control character / CRLF injection checks
        if any(ord(c) < 32 or ord(c) == 127 for c in raw_url):
            return URLValidationResult(
                is_allowed=False,
                url=sanitize_url_for_display(raw_url),
                blocked_reason=BlockedReason.CONTROL_CHARACTERS,
                error="URL contains illegal control characters.",
            )

        # 3. URL parsing
        try:
            parsed = urlsplit(raw_url.strip())
        except Exception as exc:
            return URLValidationResult(
                is_allowed=False,
                url=sanitize_url_for_display(raw_url),
                blocked_reason=BlockedReason.INVALID_HOST,
                error=f"Malformed URL structure: {exc}",
            )

        scheme = (parsed.scheme or "").lower()

        # 4. Scheme validation
        if scheme not in ALLOWED_SCHEMES:
            return URLValidationResult(
                is_allowed=False,
                url=sanitize_url_for_display(raw_url),
                scheme=scheme,
                blocked_reason=BlockedReason.UNSUPPORTED_SCHEME,
                error=f"Scheme '{scheme}' is not permitted. Only HTTP and HTTPS are allowed.",
            )

        # 5. Embedded credentials check
        if parsed.username or parsed.password:
            return URLValidationResult(
                is_allowed=False,
                url=sanitize_url_for_display(raw_url),
                scheme=scheme,
                blocked_reason=BlockedReason.CREDENTIALS_DISALLOWED,
                error="URLs with embedded userinfo credentials are strictly disallowed.",
            )

        # 6. Hostname extraction and normalization
        raw_hostname = parsed.hostname
        if not raw_hostname:
            return URLValidationResult(
                is_allowed=False,
                url=sanitize_url_for_display(raw_url),
                scheme=scheme,
                blocked_reason=BlockedReason.INVALID_HOST,
                error="Target URL is missing a valid hostname.",
            )

        # Strip trailing dot
        clean_hostname = raw_hostname.rstrip(".").lower()

        # Check port bounds if explicitly supplied
        try:
            port = parsed.port
            if port is not None and not (1 <= port <= 65535):
                return URLValidationResult(
                    is_allowed=False,
                    url=sanitize_url_for_display(raw_url),
                    scheme=scheme,
                    hostname=clean_hostname,
                    blocked_reason=BlockedReason.INVALID_PORT,
                    error=f"Port '{port}' is out of valid range (1-65535).",
                )
        except ValueError:
            return URLValidationResult(
                is_allowed=False,
                url=sanitize_url_for_display(raw_url),
                scheme=scheme,
                hostname=clean_hostname,
                blocked_reason=BlockedReason.INVALID_PORT,
                error="Port is out of valid range (1-65535).",
            )

        # 7. Check blocked hostnames and domain suffixes
        if clean_hostname in BLOCKED_HOSTNAMES:
            if clean_hostname == "localhost" and self.allow_loopback_for_testing:
                pass
            else:
                return URLValidationResult(
                    is_allowed=False,
                    url=sanitize_url_for_display(raw_url),
                    scheme=scheme,
                    hostname=clean_hostname,
                    port=port,
                    blocked_reason=BlockedReason.INTERNAL_DOMAIN_BLOCKED,
                    error=f"Prohibited internal hostname '{clean_hostname}'.",
                )

        for suffix in BLOCKED_DOMAIN_SUFFIXES:
            if clean_hostname.endswith(suffix):
                if suffix == ".localhost" and self.allow_loopback_for_testing:
                    continue
                return URLValidationResult(
                    is_allowed=False,
                    url=sanitize_url_for_display(raw_url),
                    scheme=scheme,
                    hostname=clean_hostname,
                    port=port,
                    blocked_reason=BlockedReason.INTERNAL_DOMAIN_BLOCKED,
                    error=f"Hostname belongs to prohibited internal domain suffix '{suffix}'.",
                )

        # 8. Check for raw or obfuscated IP literals
        numeric_ip = parse_numeric_ip(clean_hostname)
        if numeric_ip is not None:
            blocked, reason, err_msg = is_ip_blocked(
                numeric_ip,
                allow_loopback_for_testing=self.allow_loopback_for_testing,
            )
            if blocked:
                return URLValidationResult(
                    is_allowed=False,
                    url=sanitize_url_for_display(raw_url),
                    scheme=scheme,
                    hostname=clean_hostname,
                    port=port,
                    resolved_ips=[str(numeric_ip)],
                    blocked_reason=reason,
                    error=err_msg,
                )

            # Valid public IP literal
            normalized = urlunsplit((scheme, parsed.netloc, parsed.path or "/", parsed.query, parsed.fragment))
            return URLValidationResult(
                is_allowed=True,
                url=raw_url,
                normalized_url=normalized,
                scheme=scheme,
                hostname=clean_hostname,
                port=port,
                resolved_ips=[str(numeric_ip)],
            )

        # 9. IDN / Punycode decoding and validation
        try:
            ascii_host = clean_hostname.encode("idna").decode("ascii")
        except Exception as exc:
            return URLValidationResult(
                is_allowed=False,
                url=sanitize_url_for_display(raw_url),
                scheme=scheme,
                hostname=clean_hostname,
                port=port,
                blocked_reason=BlockedReason.INVALID_HOST,
                error=f"IDN / Punycode host conversion failed: {exc}",
            )

        # 10. DNS Resolution and Multi-Record IP Validation
        resolved_ips, dns_err = self._resolve_host(ascii_host)
        if dns_err or not resolved_ips:
            return URLValidationResult(
                is_allowed=False,
                url=sanitize_url_for_display(raw_url),
                scheme=scheme,
                hostname=clean_hostname,
                port=port,
                blocked_reason=BlockedReason.DNS_RESOLUTION_FAILED,
                error=dns_err or "DNS returned no address records (A/AAAA).",
            )

        # Validate EVERY resolved address. If ANY record resolves to a blocked range, fail closed!
        for ip_str in resolved_ips:
            try:
                ip_obj = ipaddress.ip_address(ip_str)
                blocked, reason, err_msg = is_ip_blocked(
                    ip_obj,
                    allow_loopback_for_testing=self.allow_loopback_for_testing,
                )
                if blocked:
                    return URLValidationResult(
                        is_allowed=False,
                        url=sanitize_url_for_display(raw_url),
                        scheme=scheme,
                        hostname=clean_hostname,
                        port=port,
                        resolved_ips=resolved_ips,
                        blocked_reason=reason,
                        error=f"Resolved host '{clean_hostname}' contains blocked destination {ip_str}: {err_msg}",
                    )
            except ValueError:
                return URLValidationResult(
                    is_allowed=False,
                    url=sanitize_url_for_display(raw_url),
                    scheme=scheme,
                    hostname=clean_hostname,
                    port=port,
                    resolved_ips=resolved_ips,
                    blocked_reason=BlockedReason.DNS_RESOLUTION_FAILED,
                    error=f"DNS returned unparseable IP record: {ip_str}",
                )

        normalized = urlunsplit((scheme, parsed.netloc, parsed.path or "/", parsed.query, parsed.fragment))
        return URLValidationResult(
            is_allowed=True,
            url=raw_url,
            normalized_url=normalized,
            scheme=scheme,
            hostname=clean_hostname,
            port=port,
            resolved_ips=resolved_ips,
        )

    def _resolve_host(self, host: str) -> tuple[list[str], Optional[str]]:
        """Resolve all IPv4 and IPv6 records for the given hostname."""
        try:
            addr_info = socket.getaddrinfo(
                host,
                None,
                family=socket.AF_UNSPEC,
                type=socket.SOCK_STREAM,
                proto=socket.IPPROTO_TCP,
            )
            ips = []
            for entry in addr_info:
                sockaddr = entry[4]
                ip_addr = sockaddr[0]
                if ip_addr not in ips:
                    ips.append(ip_addr)
            return ips, None
        except socket.gaierror as exc:
            return [], f"DNS lookup failed for '{host}': {exc.strerror or exc}"
        except Exception as exc:
            return [], f"Unexpected error during DNS resolution of '{host}': {exc}"

    def is_safe_redirect(self, target_url: str) -> URLValidationResult:
        """Validate redirect destinations dynamically."""
        return self.validate_url(target_url)

    def is_safe_subresource(self, resource_url: str) -> tuple[bool, Optional[str]]:
        """Validate outbound subresource request URLs during browser routing."""
        if not resource_url:
            return False, "Empty resource URL"

        # Safe inline data URLs (e.g. data:image/png;base64,...) are permitted for images/fonts only
        if resource_url.lower().startswith("data:image/") or resource_url.lower().startswith("data:font/"):
            return True, None

        # Disallow non-http/https resources
        try:
            parts = urlsplit(resource_url)
            scheme = (parts.scheme or "").lower()
            if scheme not in ALLOWED_SCHEMES:
                return False, f"Subresource scheme '{scheme}' blocked"

            # Check for blocked host
            host = (parts.hostname or "").lower()
            if not host:
                return False, "Subresource missing hostname"

            # Numeric IP check
            numeric_ip = parse_numeric_ip(host)
            if numeric_ip is not None:
                blocked, _, err = is_ip_blocked(
                    numeric_ip,
                    allow_loopback_for_testing=self.allow_loopback_for_testing,
                )
                if blocked:
                    return False, err

            if host in BLOCKED_HOSTNAMES:
                if host == "localhost" and self.allow_loopback_for_testing:
                    return True, None
                return False, f"Subresource host '{host}' blocked"

            for suffix in BLOCKED_DOMAIN_SUFFIXES:
                if host.endswith(suffix):
                    if suffix == ".localhost" and self.allow_loopback_for_testing:
                        continue
                    return False, f"Subresource domain suffix '{suffix}' blocked"

            return True, None
        except Exception as exc:
            return False, f"Invalid subresource URL: {exc}"


# Default production instance (loopback strictly forbidden)
production_url_policy = URLPolicy(allow_loopback_for_testing=False)
