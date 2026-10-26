"""Browser Sandbox and Passive Capture Runtime for AgentGuard.

Uses Playwright-Python to execute bounded, isolated, passive inspection of suspicious URLs:
- Headless Chromium with ephemeral browser context per scan (no user profile, no storage state).
- Zero credential / zero cookie transmission on outbound requests.
- Strict route interception blocking SSRF targets, private IPs, and unauthorized subresources.
- Bounded DOM and form metadata extraction (zero input values collected).
- Viewport and full-page screenshot capture passed through ImageProcessor validation.
- Guaranteed cleanup of pages, contexts, listeners, and semaphores in finally blocks.
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
import logging
import time
from typing import Any, Optional
from urllib.parse import urlsplit

from agentproof.config import config
from agentproof.image_processor import default_image_processor, ImageProcessor
from agentproof.url_policy import (
    URLPolicy,
    production_url_policy,
    sanitize_url_for_display,
    BlockedReason,
)

logger = logging.getLogger("agentguard.browser_sandbox")

# Allowlisted response headers safe for security telemetry
SAFE_RESPONSE_HEADERS = frozenset({
    "content-type",
    "content-security-policy",
    "strict-transport-security",
    "x-frame-options",
    "x-content-type-options",
    "x-xss-protection",
    "referrer-policy",
    "server",
})

# Sensitive cookie name patterns to redact
SENSITIVE_COOKIE_PATTERNS = ("session", "token", "jwt", "auth", "key", "secret", "sid")


class BrowserUnavailableError(Exception):
    """Raised when Playwright or browser binary is not installed or available."""
    pass


class ScanTimeoutError(Exception):
    """Raised when browser scan exceeds overall wall-clock deadline."""
    pass


@dataclass
class BrowserCaptureResult:
    """Structured passive observation evidence captured from target URL."""
    success: bool
    status: str  # "completed", "partial", "blocked", "timed_out", "failed"
    requested_url: str
    final_url: str = ""
    http_status: Optional[int] = None
    title: str = ""
    redirect_chain: list[dict[str, Any]] = field(default_factory=list)
    dom_forms: list[dict[str, Any]] = field(default_factory=list)
    visible_text: str = ""
    page_metrics: dict[str, Any] = field(default_factory=dict)
    cookies_summary: list[dict[str, Any]] = field(default_factory=list)
    response_headers: dict[str, str] = field(default_factory=dict)
    network_telemetry: dict[str, Any] = field(default_factory=dict)
    screenshot_bytes: Optional[bytes] = None
    screenshot_meta: Optional[dict[str, Any]] = None
    error: Optional[str] = None
    warnings: list[str] = field(default_factory=list)
    duration_ms: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict[str, Any]:
        return {
            "success": self.success,
            "status": self.status,
            "requested_url": self.requested_url,
            "final_url": self.final_url,
            "http_status": self.http_status,
            "title": self.title,
            "redirect_chain": self.redirect_chain,
            "dom_forms": self.dom_forms,
            "visible_text": self.visible_text,
            "page_metrics": self.page_metrics,
            "cookies_summary": self.cookies_summary,
            "response_headers": self.response_headers,
            "network_telemetry": self.network_telemetry,
            "has_screenshot": self.screenshot_bytes is not None,
            "screenshot_meta": self.screenshot_meta,
            "error": self.error,
            "warnings": self.warnings,
            "duration_ms": self.duration_ms,
            "timestamp": self.timestamp,
        }


class BrowserManager:
    """Manages Playwright lifecycle, browser process pooling, and concurrency limits."""

    _instance: Optional["BrowserManager"] = None
    _lock = asyncio.Lock()

    def __init__(self):
        self._playwright = None
        self._browser = None
        self._loop = None
        self._semaphore = None
        self._init_error = None

    @classmethod
    async def get_instance(cls) -> "BrowserManager":
        if cls._instance is None:
            async with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def is_available(self) -> tuple[bool, Optional[str]]:
        """Check if Playwright is installed and capable of running."""
        try:
            import playwright.async_api
            return True, None
        except ImportError as exc:
            return False, f"Playwright-Python package not installed: {exc}"
        except Exception as exc:
            return False, f"Playwright runtime unavailable: {exc}"

    async def get_browser(self):
        """Acquire or start the shared headless Chromium browser process."""
        if not config.browser_triage_enabled:
            raise BrowserUnavailableError("Browser triage is disabled by server configuration.")

        is_avail, reason = self.is_available()
        if not is_avail:
            raise BrowserUnavailableError(reason or "Browser engine unavailable")

        from playwright.async_api import async_playwright

        try:
            curr_loop = asyncio.get_running_loop()
        except RuntimeError:
            curr_loop = None

        if self._loop is not None and self._loop != curr_loop:
            await self.close()

        self._loop = curr_loop

        if self._browser is None or not self._browser.is_connected():
            try:
                if self._playwright is None:
                    self._playwright = await async_playwright().start()

                # Conservative, hardened launch flags
                launch_args = [
                    "--disable-background-networking",
                    "--disable-background-timer-throttling",
                    "--disable-breakpad",
                    "--disable-client-side-phishing-detection",
                    "--disable-default-apps",
                    "--disable-extensions",
                    "--disable-hang-monitor",
                    "--disable-popup-blocking",
                    "--disable-prompt-on-repost",
                    "--disable-sync",
                    "--metrics-recording-only",
                    "--no-first-run",
                    "--safebrowsing-disable-auto-update",
                    "--password-store=basic",
                    "--use-mock-keychain",
                ]

                self._browser = await self._playwright.chromium.launch(
                    headless=config.browser_headless,
                    args=launch_args,
                    timeout=config.browser_nav_timeout * 1000,
                )
            except Exception as exc:
                self._init_error = str(exc)
                logger.error("Failed to launch Chromium browser: %s", exc)
                raise BrowserUnavailableError(f"Chromium browser failed to launch: {exc}") from exc

        return self._browser

    async def close(self):
        """Close browser process and stop Playwright runtime on server shutdown."""
        if self._browser:
            try:
                await self._browser.close()
            except Exception:
                pass
            self._browser = None

        if self._playwright:
            try:
                await self._playwright.stop()
            except Exception:
                pass
            self._playwright = None
        self._loop = None
        self._semaphore = None

    @property
    def semaphore(self) -> asyncio.Semaphore:
        try:
            curr_loop = asyncio.get_running_loop()
        except RuntimeError:
            curr_loop = None
        if self._semaphore is None or (self._loop is not None and self._loop != curr_loop):
            self._semaphore = asyncio.Semaphore(config.browser_max_concurrent_scans)
        return self._semaphore


class BrowserSandbox:
    """Executes safe, ephemeral passive scans against target URLs."""

    def __init__(
        self,
        manager: Optional[BrowserManager] = None,
        policy: Optional[URLPolicy] = None,
        image_processor: Optional[ImageProcessor] = None,
    ):
        self.manager = manager
        self.policy = policy or production_url_policy
        self.image_processor = image_processor or default_image_processor

    async def scan_url(
        self,
        target_url: str,
        capture_mode: str = "viewport",
    ) -> BrowserCaptureResult:
        """Execute a secure passive scan of a public website URL."""
        start_time = time.perf_counter()
        sanitized_requested = sanitize_url_for_display(target_url)

        # 1. Pre-navigation strict URL policy validation
        validation = self.policy.validate_url(target_url)
        if not validation.is_allowed:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return BrowserCaptureResult(
                success=False,
                status="blocked",
                requested_url=sanitized_requested,
                final_url=sanitized_requested,
                error=validation.error or "URL rejected by security policy.",
                duration_ms=elapsed_ms,
            )

        # 2. Acquire browser manager
        mgr = self.manager or await BrowserManager.get_instance()

        # Enforce overall wall-clock scan timeout
        try:
            return await asyncio.wait_for(
                self._execute_scan(mgr, validation.normalized_url, capture_mode, start_time),
                timeout=config.browser_total_timeout,
            )
        except asyncio.TimeoutError:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return BrowserCaptureResult(
                success=False,
                status="timed_out",
                requested_url=sanitized_requested,
                error=f"Scan timed out after {config.browser_total_timeout}s total limit.",
                warnings=["Overall scan deadline expired before completion."],
                duration_ms=elapsed_ms,
            )
        except BrowserUnavailableError as exc:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return BrowserCaptureResult(
                success=False,
                status="failed",
                requested_url=sanitized_requested,
                error=str(exc),
                duration_ms=elapsed_ms,
            )
        except Exception as exc:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.exception("Unexpected browser sandbox failure for %s", sanitized_requested)
            return BrowserCaptureResult(
                success=False,
                status="failed",
                requested_url=sanitized_requested,
                error=f"Internal browser sandbox error: {type(exc).__name__}",
                duration_ms=elapsed_ms,
            )

    async def _execute_scan(
        self,
        mgr: BrowserManager,
        normalized_url: str,
        capture_mode: str,
        start_time: float,
    ) -> BrowserCaptureResult:
        """Run the isolated ephemeral browser context."""
        sanitized_url = sanitize_url_for_display(normalized_url)
        warnings: list[str] = []
        redirect_chain: list[dict[str, Any]] = []
        observed_requests: list[dict[str, Any]] = []
        blocked_subresources: list[str] = []

        # Acquire concurrency semaphore
        async with mgr.semaphore:
            browser = await mgr.get_browser()

            # Create ephemeral, non-persistent context with zero credentials
            context = await browser.new_context(
                storage_state=None,
                accept_downloads=False,
                service_workers="block",
                permissions=[],
                geolocation=None,
                ignore_https_errors=False,
                viewport={
                    "width": config.browser_viewport_width,
                    "height": config.browser_viewport_height,
                },
                user_agent="AgentGuard-Security-Observation-Agent/1.0 (+https://agentguard.local)",
            )

            page = None
            try:
                page = await context.new_page()

                # Defenses in depth: dismiss dialogs, cancel downloads, close unexpected popups
                page.on("dialog", lambda dialog: asyncio.create_task(dialog.dismiss()))
                page.on("download", lambda download: asyncio.create_task(download.cancel()))
                page.on("popup", lambda popup: asyncio.create_task(popup.close()))

                # Intercept and validate outbound network requests
                async def handle_route(route):
                    req = route.request
                    req_url = req.url

                    # Check resource against SSRF and subresource policies
                    is_safe, reason = self.policy.is_safe_subresource(req_url)
                    if not is_safe:
                        blocked_subresources.append(sanitize_url_for_display(req_url))
                        await route.abort("blockedbyclient")
                        return

                    # Zero-knowledge outbound request: strip Cookie and Authorization headers
                    raw_headers = req.headers
                    sanitized_headers = {
                        k: v for k, v in raw_headers.items()
                        if k.lower() not in ("cookie", "authorization", "proxy-authorization")
                    }

                    if len(observed_requests) < config.browser_max_telemetry_requests:
                        observed_requests.append({
                            "method": req.method,
                            "resource_type": req.resource_type,
                            "url": sanitize_url_for_display(req_url),
                        })

                    await route.continue_(headers=sanitized_headers)

                await page.route("**/*", handle_route)

                # Navigation with explicit timeout
                response = None
                nav_error = None
                try:
                    response = await page.goto(
                        normalized_url,
                        wait_until="domcontentloaded",
                        timeout=config.browser_nav_timeout * 1000,
                    )
                except Exception as exc:
                    nav_error = str(exc)
                    warnings.append(f"Navigation error: {type(exc).__name__}")

                # Gentle bounded wait for layout stabilization (500ms max)
                try:
                    await page.wait_for_timeout(500)
                except Exception:
                    pass

                # Final URL and HTTP status
                final_page_url = page.url or normalized_url
                sanitized_final_url = sanitize_url_for_display(final_page_url)
                http_status = response.status if response else None

                # Validate final redirected URL against policy
                if final_page_url != normalized_url:
                    final_validation = self.policy.validate_url(final_page_url)
                    if not final_validation.is_allowed:
                        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                        return BrowserCaptureResult(
                            success=False,
                            status="blocked",
                            requested_url=sanitized_url,
                            final_url=sanitized_final_url,
                            http_status=http_status,
                            error=f"Redirect target blocked by policy: {final_validation.error}",
                            duration_ms=elapsed_ms,
                        )

                # Record redirect hops from request if present
                if response and response.request.redirected_from:
                    curr = response.request.redirected_from
                    hops = []
                    while curr and len(hops) < config.browser_max_redirects:
                        hops.append({
                            "url": sanitize_url_for_display(curr.url),
                            "method": curr.method,
                        })
                        curr = curr.redirected_from
                    redirect_chain = list(reversed(hops))

                # Safe response headers extraction
                resp_headers_dict: dict[str, str] = {}
                if response:
                    raw_resp_headers = response.headers
                    for k, v in raw_resp_headers.items():
                        if k.lower() in SAFE_RESPONSE_HEADERS:
                            resp_headers_dict[k.lower()] = v[:200]  # bounded header length

                # DOM inspection: extract title, bounded text, and form metadata
                title = ""
                visible_text = ""
                dom_forms = []
                metrics = {
                    "links_count": 0,
                    "scripts_count": 0,
                    "iframes_count": 0,
                    "has_password_field": False,
                }

                try:
                    title = (await page.title() or "")[:200]
                except Exception:
                    pass

                try:
                    # Extract sanitized DOM structure with zero form values
                    dom_data = await page.evaluate("""
                    () => {
                        const forms = Array.from(document.querySelectorAll('form')).map(f => {
                            const hasPassword = f.querySelector('input[type="password"]') !== null;
                            const action = f.getAttribute('action') || '';
                            const method = (f.getAttribute('method') || 'GET').toUpperCase();
                            return {
                                action: action,
                                method: method,
                                hasPasswordField: hasPassword
                            };
                        });

                        // Extract visible text without script/style tags
                        const clone = document.body ? document.body.cloneNode(true) : null;
                        let text = '';
                        if (clone) {
                            const scripts = clone.querySelectorAll('script, style, noscript');
                            scripts.forEach(s => s.remove());
                            text = clone.innerText || clone.textContent || '';
                        }

                        return {
                            forms: forms,
                            visibleText: text.replace(/\\s+/g, ' ').trim(),
                            linksCount: document.querySelectorAll('a').length,
                            scriptsCount: document.querySelectorAll('script').length,
                            iframesCount: document.querySelectorAll('iframe').length,
                            hasPasswordField: document.querySelector('input[type="password"]') !== null
                        };
                    }
                    """)
                    if dom_data:
                        dom_forms = dom_data.get("forms", [])[:10]  # Bounded form list
                        raw_text = dom_data.get("visibleText", "")
                        visible_text = raw_text[:config.browser_max_dom_text_chars]
                        metrics["links_count"] = dom_data.get("linksCount", 0)
                        metrics["scripts_count"] = dom_data.get("scriptsCount", 0)
                        metrics["iframes_count"] = dom_data.get("iframesCount", 0)
                        metrics["has_password_field"] = dom_data.get("hasPasswordField", False)
                except Exception as exc:
                    warnings.append(f"DOM extraction warning: {exc}")

                # Cookie metadata summary: zero values recorded
                cookies_summary = []
                try:
                    raw_cookies = await context.cookies()
                    for c in raw_cookies[:30]:
                        c_name = c.get("name", "")
                        # Mask sensitive cookie names
                        if any(pattern in c_name.lower() for pattern in SENSITIVE_COOKIE_PATTERNS):
                            display_name = c_name[:2] + "***[MASKED]"
                        else:
                            display_name = c_name[:64]

                        cookies_summary.append({
                            "name": display_name,
                            "domain": c.get("domain", ""),
                            "path": c.get("path", ""),
                            "secure": bool(c.get("secure", False)),
                            "httpOnly": bool(c.get("httpOnly", False)),
                            "sameSite": c.get("sameSite", "None"),
                        })
                except Exception as exc:
                    warnings.append(f"Cookie inspection warning: {exc}")

                # Screenshot capture and validation via ImageProcessor
                screenshot_bytes = None
                screenshot_meta = None
                try:
                    full_page_mode = (capture_mode == "full_page")
                    raw_screenshot = await page.screenshot(
                        type="png",
                        full_page=full_page_mode,
                        timeout=5000,
                    )
                    # Pass through strict ImageProcessor validation & normalization
                    img_res = self.image_processor.process_image(raw_screenshot, target_format="PNG")
                    if img_res.success:
                        screenshot_bytes = img_res.normalized_bytes
                        screenshot_meta = {
                            "width": img_res.width,
                            "height": img_res.height,
                            "megapixels": img_res.megapixels,
                            "size_bytes": img_res.size_bytes,
                            "mode": capture_mode,
                        }
                    else:
                        warnings.append(f"Screenshot rejected by ImageProcessor: {img_res.error}")
                except Exception as exc:
                    warnings.append(f"Screenshot capture failed: {exc}")

                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                scan_status = "completed" if (response and not nav_error) else "partial"

                telemetry = {
                    "requests_observed": len(observed_requests),
                    "subresources_blocked": len(blocked_subresources),
                    "blocked_subresource_samples": blocked_subresources[:5],
                }

                return BrowserCaptureResult(
                    success=True,
                    status=scan_status,
                    requested_url=sanitized_url,
                    final_url=sanitized_final_url,
                    http_status=http_status,
                    title=title,
                    redirect_chain=redirect_chain,
                    dom_forms=dom_forms,
                    visible_text=visible_text,
                    page_metrics=metrics,
                    cookies_summary=cookies_summary,
                    response_headers=resp_headers_dict,
                    network_telemetry=telemetry,
                    screenshot_bytes=screenshot_bytes,
                    screenshot_meta=screenshot_meta,
                    warnings=warnings,
                    duration_ms=elapsed_ms,
                )

            finally:
                # Guaranteed cleanup of context, page, and cookies
                if page:
                    try:
                        await page.close()
                    except Exception:
                        pass
                try:
                    await context.clear_cookies()
                    await context.close()
                except Exception:
                    pass
