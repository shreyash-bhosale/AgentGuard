"""API integration and security tests for URL triage and readiness endpoints."""

import base64
from unittest.mock import patch
import pytest
from starlette.testclient import TestClient

from agentproof.browser_sandbox import BrowserCaptureResult
from agentproof.config import config
from agentproof.server import app

client = TestClient(app)
AUTH_HEADERS = {"X-AgentProof-Token": config.companion_token}


def test_triage_unauthorized_without_token():
    # Missing token
    res_no_token = client.post("/api/url/triage", json={"url": "https://example.com"})
    assert res_no_token.status_code == 401

    # Bad token
    res_bad_token = client.post(
        "/api/url/triage",
        json={"url": "https://example.com"},
        headers={"X-AgentProof-Token": "invalid-secret-token"},
    )
    assert res_bad_token.status_code == 401


def test_triage_disallowed_schemes_rejected():
    disallowed = [
        "file:///etc/passwd",
        "javascript:alert(1)",
        "ftp://example.com/file",
        "data:text/html,evil",
    ]
    for url in disallowed:
        res = client.post("/api/url/triage", json={"url": url}, headers=AUTH_HEADERS)
        assert res.status_code == 400
        assert "rejected by security policy" in res.json()["detail"].lower()


def test_triage_ssrf_blocked_destinations_rejected():
    ssrf_targets = [
        "http://127.0.0.1:8000/api/health",
        "http://localhost:8000/",
        "http://169.254.169.254/latest/meta-data/",
        "http://10.0.0.1/",
        "http://192.168.1.1/",
        "http://metadata.google.internal/",
    ]
    for target in ssrf_targets:
        res = client.post("/api/url/triage", json={"url": target}, headers=AUTH_HEADERS)
        assert res.status_code == 400
        assert "rejected by security policy" in res.json()["detail"].lower()


def test_triage_service_disabled_returns_503():
    orig_enabled = config.browser_triage_enabled
    try:
        config.browser_triage_enabled = False
        res = client.post(
            "/api/url/triage",
            json={"url": "https://example.com"},
            headers=AUTH_HEADERS,
        )
        assert res.status_code == 503
        assert "disabled" in res.json()["detail"].lower()
    finally:
        config.browser_triage_enabled = orig_enabled


def test_triage_successful_call_and_alias():
    mock_capture = BrowserCaptureResult(
        success=True,
        status="completed",
        requested_url="https://example.com",
        final_url="https://example.com",
        http_status=200,
        title="Example Domain",
        dom_forms=[],
        visible_text="This domain is for use in illustrative examples.",
        page_metrics={"links_count": 1, "has_password_field": False},
        cookies_summary=[],
    )

    with patch("agentproof.browser_sandbox.BrowserSandbox.scan_url", return_value=mock_capture):
        with patch("agentproof.url_policy.production_url_policy.validate_url") as mock_val:
            mock_val.return_value.is_allowed = True
            mock_val.return_value.error = None
            mock_val.return_value.normalized_url = "https://example.com"

            # Primary canonical endpoint: POST /api/url/triage
            res = client.post(
                "/api/url/triage",
                json={"url": "https://example.com", "capture_mode": "viewport"},
                headers=AUTH_HEADERS,
            )
            assert res.status_code == 200
            data = res.json()
            assert "scan_id" in data
            assert data["status"] == "completed"
            assert data["target_url"] == "https://example.com"
            assert "risk_assessment" in data
            assert data["risk_assessment"]["score"] == 0

            # Canonical alias endpoint: POST /api/browser/triage
            res_alias = client.post(
                "/api/browser/triage",
                json={"url": "https://example.com"},
                headers=AUTH_HEADERS,
            )
            assert res_alias.status_code == 200
            alias_data = res_alias.json()
            assert alias_data["status"] == "completed"


def test_api_health_includes_browser_triage():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert "browser_triage" in data
    assert data["browser_triage"]["enabled"] is True
    assert "available" in data["browser_triage"]


def test_api_ai_readiness_endpoint():
    res = client.get("/api/ai/readiness")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "ollama" in data
    assert "browser_sandbox" in data
    assert data["browser_sandbox"]["enabled"] is True


def test_multimodal_analyze_endpoint():
    from tests.test_image_processor import create_test_image
    png_bytes = create_test_image(80, 80, "PNG")
    b64_str = base64.b64encode(png_bytes).decode("ascii")

    # Unauthorized
    res_unauth = client.post("/api/multimodal/analyze", json={"image_base64": b64_str})
    assert res_unauth.status_code == 401

    # Authorized
    res = client.post(
        "/api/multimodal/analyze",
        json={"image_base64": b64_str, "url": "https://test.site/screen.png"},
        headers=AUTH_HEADERS,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["risk_assessment"]["score"] == 0

    # Invalid base64
    res_bad = client.post(
        "/api/multimodal/analyze",
        json={"image_base64": "not-valid-base64==="},
        headers=AUTH_HEADERS,
    )
    assert res_bad.status_code == 400


def test_openapi_schema_contains_new_endpoints():
    res = client.get("/openapi.json")
    assert res.status_code == 200
    schema = res.json()
    paths = schema.get("paths", {})
    assert "/api/url/triage" in paths
    assert "/api/browser/triage" in paths
    assert "/api/ai/readiness" in paths
    assert "/api/multimodal/analyze" in paths
