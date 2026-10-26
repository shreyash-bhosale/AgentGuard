"""Unit tests for URL policy and SSRF defense engine."""

import ipaddress
import socket
from unittest.mock import patch
import pytest

from agentproof.url_policy import (
    BlockedReason,
    URLPolicy,
    is_ip_blocked,
    parse_numeric_ip,
    production_url_policy,
    sanitize_url_for_display,
)


@pytest.fixture
def policy():
    return URLPolicy(max_url_length=2048, allow_loopback_for_testing=False)


def test_valid_public_https_url(policy):
    with patch.object(policy, "_resolve_host", return_value=(["93.184.216.34"], None)):
        res = policy.validate_url("https://example.com/login?param=1")
        assert res.is_allowed is True
        assert res.scheme == "https"
        assert res.hostname == "example.com"
        assert res.resolved_ips == ["93.184.216.34"]


def test_valid_public_http_url(policy):
    with patch.object(policy, "_resolve_host", return_value=(["93.184.216.34"], None)):
        res = policy.validate_url("http://example.com/docs")
        assert res.is_allowed is True
        assert res.scheme == "http"


def test_disallowed_schemes(policy):
    blocked_urls = [
        "file:///etc/passwd",
        "data:text/html,<html>Evil</html>",
        "javascript:alert(1)",
        "ftp://example.com/resource",
        "ws://example.com/socket",
        "wss://example.com/secure-socket",
        "chrome://settings",
        "about:blank",
        "gopher://example.com",
    ]
    for u in blocked_urls:
        res = policy.validate_url(u)
        assert res.is_allowed is False
        assert res.blocked_reason == BlockedReason.UNSUPPORTED_SCHEME


def test_embedded_credentials_blocked(policy):
    res = policy.validate_url("https://admin:secret123@example.com/dashboard")
    assert res.is_allowed is False
    assert res.blocked_reason == BlockedReason.CREDENTIALS_DISALLOWED
    assert "secret123" not in res.url


def test_loopback_ipv4_and_ipv6_blocked(policy):
    loopback_targets = [
        "http://127.0.0.1/",
        "http://127.0.1.1:8080/",
        "http://127.255.255.254/",
        "http://[::1]/",
        "http://[0:0:0:0:0:0:0:1]/",
    ]
    for target in loopback_targets:
        res = policy.validate_url(target)
        assert res.is_allowed is False
        assert res.blocked_reason == BlockedReason.LOOPBACK_BLOCKED


def test_private_network_ips_blocked(policy):
    private_targets = [
        "http://10.0.0.1/",
        "http://10.254.0.1:8000/",
        "http://172.16.0.1/",
        "http://172.31.255.255/",
        "http://192.168.1.1/",
        "http://192.168.0.254/",
        "http://[fc00::1]/",
        "http://[fd12:3456:789a:1::1]/",
    ]
    for target in private_targets:
        res = policy.validate_url(target)
        assert res.is_allowed is False
        assert res.blocked_reason == BlockedReason.PRIVATE_IP_BLOCKED


def test_link_local_and_cloud_metadata_blocked(policy):
    metadata_targets = [
        "http://169.254.169.254/",
        "http://169.254.169.254/latest/meta-data/",
        "http://100.100.100.200/",
        "http://169.254.170.2/",
        "http://[fe80::169:254:169:254]/",
    ]
    for target in metadata_targets:
        res = policy.validate_url(target)
        assert res.is_allowed is False
        assert res.blocked_reason in (
            BlockedReason.METADATA_ENDPOINT_BLOCKED,
            BlockedReason.LINK_LOCAL_BLOCKED,
        )


def test_blocked_hostnames_and_internal_suffixes(policy):
    blocked_hosts = [
        "http://localhost/",
        "http://localhost:8000/",
        "http://sub.localhost/",
        "http://service.internal/",
        "http://server.local/",
        "http://dev.lan/",
        "http://portal.corp/",
        "http://router.home/",
        "http://metadata.google.internal/",
        "http://instance-data/",
    ]
    for target in blocked_hosts:
        res = policy.validate_url(target)
        assert res.is_allowed is False
        assert res.blocked_reason == BlockedReason.INTERNAL_DOMAIN_BLOCKED


def test_numeric_ip_representations(policy):
    # Dword integer representation for 127.0.0.1 (2130706433)
    res_int = policy.validate_url("http://2130706433/")
    assert res_int.is_allowed is False
    assert res_int.blocked_reason == BlockedReason.LOOPBACK_BLOCKED

    # Hex representation for 127.0.0.1 (0x7f000001)
    res_hex = policy.validate_url("http://0x7f000001/")
    assert res_hex.is_allowed is False
    assert res_hex.blocked_reason == BlockedReason.LOOPBACK_BLOCKED

    # Octal representation for 127.0.0.1 (0177.0.0.1)
    res_oct = policy.validate_url("http://0177.0.0.1/")
    assert res_oct.is_allowed is False
    assert res_oct.blocked_reason == BlockedReason.LOOPBACK_BLOCKED


def test_ipv4_mapped_ipv6(policy):
    # ::ffff:127.0.0.1
    res = policy.validate_url("http://[::ffff:127.0.0.1]/")
    assert res.is_allowed is False
    assert res.blocked_reason == BlockedReason.LOOPBACK_BLOCKED

    # ::ffff:192.168.1.1
    res_priv = policy.validate_url("http://[::ffff:192.168.1.1]/")
    assert res_priv.is_allowed is False
    assert res_priv.blocked_reason == BlockedReason.PRIVATE_IP_BLOCKED


def test_dns_resolution_failure_fails_closed(policy):
    with patch.object(policy, "_resolve_host", return_value=([], "DNS lookup failed for 'nonexistent-fake-domain.xyz'")):
        res = policy.validate_url("https://nonexistent-fake-domain.xyz/")
        assert res.is_allowed is False
        assert res.blocked_reason == BlockedReason.DNS_RESOLUTION_FAILED
        assert "DNS lookup failed" in res.error


def test_mixed_public_and_private_dns_fails_closed(policy):
    # Rebinding or split-horizon DNS returning both public and private A records
    with patch.object(policy, "_resolve_host", return_value=(["93.184.216.34", "10.0.0.5"], None)):
        res = policy.validate_url("https://split-dns-target.com/")
        assert res.is_allowed is False
        assert res.blocked_reason == BlockedReason.PRIVATE_IP_BLOCKED
        assert "contains blocked destination 10.0.0.5" in res.error


def test_control_character_injection_blocked(policy):
    crlf_urls = [
        "https://example.com/\r\nSet-Cookie:admin=1",
        "https://example.com/\x00evil",
        "https://example.com/\tpath",
    ]
    for target in crlf_urls:
        res = policy.validate_url(target)
        assert res.is_allowed is False
        assert res.blocked_reason == BlockedReason.CONTROL_CHARACTERS


def test_url_length_limit(policy):
    long_url = "https://example.com/" + ("a" * 2100)
    res = policy.validate_url(long_url)
    assert res.is_allowed is False
    assert res.blocked_reason == BlockedReason.URL_TOO_LONG


def test_invalid_port_blocked(policy):
    res_neg = policy.validate_url("https://example.com:0/")
    assert res_neg.is_allowed is False
    assert res_neg.blocked_reason == BlockedReason.INVALID_PORT

    res_high = policy.validate_url("https://example.com:70000/")
    assert res_high.is_allowed is False
    assert res_high.blocked_reason == BlockedReason.INVALID_PORT


def test_trailing_dot_hostname(policy):
    with patch.object(policy, "_resolve_host", return_value=(["93.184.216.34"], None)):
        res = policy.validate_url("https://example.com./path")
        assert res.is_allowed is True
        assert res.hostname == "example.com"


def test_idn_punycode_handling(policy):
    with patch.object(policy, "_resolve_host", return_value=(["93.184.216.34"], None)):
        res = policy.validate_url("https://xn--pple-43d.com/")
        assert res.is_allowed is True
        assert res.hostname == "xn--pple-43d.com"


def test_sanitize_url_for_display():
    raw = "https://user:secretpass@example.com/path?session=abc123xyz&token=secret#my-fragment"
    sanitized = sanitize_url_for_display(raw)
    assert "secretpass" not in sanitized
    assert "user@" not in sanitized
    assert "abc123xyz" not in sanitized
    assert "my-fragment" not in sanitized
    assert "[REDACTED_QUERY]" in sanitized
    assert "example.com/path" in sanitized


def test_subresource_validation(policy):
    assert policy.is_safe_subresource("https://cdn.example.com/style.css")[0] is True
    assert policy.is_safe_subresource("data:image/png;base64,iVBORw0KGgo=")[0] is True
    assert policy.is_safe_subresource("http://127.0.0.1/evil.js")[0] is False
    assert policy.is_safe_subresource("http://169.254.169.254/meta.js")[0] is False
    assert policy.is_safe_subresource("file:///etc/passwd")[0] is False
