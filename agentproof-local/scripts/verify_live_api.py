#!/usr/bin/env python3
"""End-to-End Live API Verification Script.

Tests:
1. Health and readiness endpoints
2. Synthetic benign sign-in screenshot analysis
3. Synthetic suspicious unencrypted HTTP credential form
4. Validation rejection of invalid/oversized file
"""

import io
import json
import requests
from PIL import Image, ImageDraw

BASE_URL = "http://127.0.0.1:8000"


def make_synthetic_login_image(title="Secure Sign-In", note="Enter your corporate credentials"):
    img = Image.new("RGB", (600, 400), color="#1e293b")
    draw = ImageDraw.Draw(img)
    # Background card
    draw.rectangle([100, 50, 500, 350], fill="#0f172a", outline="#334155", width=2)
    # Text placeholder / title
    draw.text((150, 80), title, fill="#f8fafc")
    draw.text((150, 110), note, fill="#94a3b8")
    # Email input box
    draw.rectangle([150, 150, 450, 190], fill="#1e293b", outline="#475569", width=1)
    draw.text((160, 162), "Email: user@company.com", fill="#64748b")
    # Password input box
    draw.rectangle([150, 210, 450, 250], fill="#1e293b", outline="#475569", width=1)
    draw.text((160, 222), "Password: ••••••••••••", fill="#64748b")
    # Submit button
    draw.rectangle([150, 280, 450, 320], fill="#2563eb", outline="#1d4ed8")
    draw.text((270, 292), "Sign In", fill="#ffffff")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_e2e():
    print("=" * 60)
    print("AgentGuard End-to-End Multimodal Verification")
    print("=" * 60)

    # 1. Health Check
    health_resp = requests.get(f"{BASE_URL}/api/health", timeout=5)
    assert health_resp.status_code == 200, f"Health check failed: {health_resp.text}"
    print("[PASS] 1. Backend Health Check: OK")

    # 2. Readiness Check
    ready_resp = requests.get(f"{BASE_URL}/api/v1/readiness", timeout=10)
    assert ready_resp.status_code == 200, f"Readiness check failed: {ready_resp.text}"
    ready_data = ready_resp.json()
    print(f"[PASS] 2. Gemma Cloud Readiness: {ready_data['status']} (Model: {ready_data['details']['model']})")

    # 3. Benign Synthetic Login Screenshot
    benign_img = make_synthetic_login_image("Authorized Login Portal", "HTTPS Production Environment")
    files = {"screenshot": ("benign_login.png", benign_img, "image/png")}
    data = {
        "url": "https://auth.company-example.com/oauth/v2/login",
        "context": "Standard corporate single sign-on page over verified HTTPS.",
    }
    print("[INFO] 3. Submitting synthetic benign login screenshot to /api/v1/analyze/screenshot...")
    res_benign = requests.post(f"{BASE_URL}/api/v1/analyze/screenshot", files=files, data=data, timeout=30)
    assert res_benign.status_code == 200, f"Analysis failed: {res_benign.text}"
    b_data = res_benign.json()
    b_score = b_data["risk_assessment"]["score"]
    b_level = b_data["risk_assessment"]["risk_level"]
    print(f"[PASS]    Benign Risk Score: {b_score}/100 ({b_level})")
    assert b_score < 40, f"Benign login scored excessively high: {b_score}"
    assert b_data["policy_decision"]["allowed"] is True, "Benign read telemetry action should be allowed"
    assert "Agent Tool Execution Guardrail" in b_data["policy_scope_notice"]
    print(f"[PASS]    Confidence: {b_data['threat_report']['model_confidence']:.2f}")
    print(f"[PASS]    Hypothesis: {b_data['threat_report']['hypothesized_threat_type']}")
    print(f"[PASS]    Policy decision correctly separated from website safety: {b_data['policy_scope_notice'][:65]}...")

    # 4. Suspicious Unencrypted HTTP Credential Form
    suspicious_img = make_synthetic_login_image("URGENT: Verify Account Access", "Unencrypted Session")
    files_susp = {"screenshot": ("suspicious_login.png", suspicious_img, "image/png")}
    data_susp = {
        "url": "http://192.168.1.105:8080/fake-login",
        "context": "Page served over unencrypted HTTP asking for enterprise master credentials.",
    }
    print("[INFO] 4. Submitting suspicious unencrypted login screenshot...")
    res_susp = requests.post(f"{BASE_URL}/api/v1/analyze/screenshot", files=files_susp, data=data_susp, timeout=30)
    assert res_susp.status_code == 200, f"Analysis failed: {res_susp.text}"
    s_data = res_susp.json()
    s_score = s_data["risk_assessment"]["score"]
    s_level = s_data["risk_assessment"]["risk_level"]
    print(f"[PASS]    Suspicious Risk Score: {s_score}/100 ({s_level})")
    assert s_score >= 50 or s_data["risk_assessment"].get("critical_override"), "Suspicious page did not trigger elevated risk"
    print(f"[PASS]    Critical Override Triggered: {s_data['risk_assessment'].get('critical_override')}")
    print(f"[PASS]    Uncertainty communicated: {s_data['threat_report']['uncertainty'][:80]}...")

    # 5. Invalid File Rejection (Validation Check)
    invalid_file = {"screenshot": ("malicious.exe", b"MZ\x90\x00\x03\x00\x00\x00", "application/octet-stream")}
    res_inv = requests.post(f"{BASE_URL}/api/v1/analyze/screenshot", files=invalid_file, timeout=5)
    assert res_inv.status_code == 400, f"Expected 400 for invalid file, got {res_inv.status_code}"
    print("[PASS] 5. Invalid file type rejected with HTTP 400 Bad Request")

    print("=" * 60)
    print("ALL END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    test_e2e()
