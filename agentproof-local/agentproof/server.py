"""FastAPI backend adapter for AgentProof Local.

Exposes the authoritative deterministic policy engine, scenario runner,
and reporting system via local HTTP endpoints.
"""

from datetime import datetime, timezone
from typing import Any, Literal, Optional
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from contextlib import asynccontextmanager
import logging

from agentproof.config import config
from agentproof.llm_client import check_ollama_connection
from agentproof.metrics import calculate_metrics
from agentproof.reporting import (
    generate_csv_report,
    generate_json_report,
    generate_markdown_summary,
    list_saved_reports,
    save_report_to_disk,
    serialize_json_report,
)
from agentproof.scenario_runner import (
    load_scenarios,
    run_scenarios,
    validate_scenario,
)
from agentproof.schemas import ScenarioModel

logger = logging.getLogger("agentguard.server")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager ensuring clean resource shutdown."""
    yield
    # Clean up browser sandbox runtime on application termination
    try:
        from agentproof.browser_sandbox import BrowserManager
        mgr = await BrowserManager.get_instance()
        await mgr.close()
    except Exception:
        pass


app = FastAPI(
    title="AgentProof Local API",
    description="Deterministic AI Agent Security & Policy Evaluation Backend",
    version=config.app_version,
    lifespan=lifespan,
)

# Narrow CORS configuration for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# In-memory store for evaluation runs and custom scenarios during server lifetime
EVALUATION_HISTORY: list[dict[str, Any]] = []
CUSTOM_SCENARIOS: list[dict[str, Any]] = []


class EvaluationRequest(BaseModel):
    mode: Literal["baseline", "llm"] = "baseline"
    model_name: Optional[str] = None
    timeout: Optional[int] = Field(default=None, ge=5, le=300)
    scenario_ids: Optional[list[str]] = None


@app.get("/api/health")
def get_health() -> dict[str, Any]:
    """Health check returning backend status and live Ollama connectivity."""
    ollama_info = check_ollama_connection(config.ollama_url, timeout=3)
    browser_info = {
        "enabled": config.browser_triage_enabled,
        "available": True,
    }
    try:
        from agentproof.browser_sandbox import BrowserManager
        mgr = BrowserManager()
        is_avail, err = mgr.is_available()
        browser_info["available"] = is_avail
        if err:
            browser_info["error"] = err
    except Exception as exc:
        browser_info["available"] = False
        browser_info["error"] = str(exc)

    return {
        "status": "healthy",
        "version": config.app_version,
        "backend": "FastAPI + AgentProof Core",
        "ollama": ollama_info,
        "browser_triage": browser_info,
        "default_model": config.default_model,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/ai/readiness")
def get_ai_readiness() -> dict[str, Any]:
    """Readiness and capability check for local AI and browser sandbox triage."""
    ollama_info = check_ollama_connection(config.ollama_url, timeout=3)
    browser_avail = False
    browser_err = None
    try:
        from agentproof.browser_sandbox import BrowserManager
        mgr = BrowserManager()
        browser_avail, browser_err = mgr.is_available()
    except Exception as exc:
        browser_err = str(exc)

    return {
        "status": "ready" if ollama_info.get("connected") else "degraded",
        "ollama": ollama_info,
        "browser_sandbox": {
            "enabled": config.browser_triage_enabled,
            "available": browser_avail,
            "error": browser_err,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/models")
def get_models() -> dict[str, Any]:
    """Return available Ollama models and default recommendation."""
    ollama_info = check_ollama_connection(config.ollama_url, timeout=3)
    return {
        "connected": ollama_info.get("connected", False),
        "models": ollama_info.get("models", []),
        "default_model": config.default_model,
        "model_count": ollama_info.get("model_count", 0),
        "error": ollama_info.get("error"),
    }


@app.get("/api/scenarios")
def get_scenarios(category: Optional[str] = Query(default=None)) -> list[dict[str, Any]]:
    """Return all built-in scenarios plus temporary custom session scenarios."""
    built_in = load_scenarios()
    all_scenarios = built_in + CUSTOM_SCENARIOS
    if category:
        return [s for s in all_scenarios if s.get("category") == category]
    return all_scenarios


@app.get("/api/fixtures")
def get_security_fixtures() -> dict[str, Any]:
    """Return catalog of curated security test fixtures and presets."""
    import json
    from pathlib import Path
    fixtures_path = Path(__file__).resolve().parent.parent / "data" / "security_test_fixtures.json"
    if fixtures_path.exists():
        try:
            with open(fixtures_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"websites": [], "cookies": [], "permissions": [], "privacy_policies": [], "file_fixtures": []}



@app.post("/api/scenarios/custom")
def add_custom_scenario(payload: dict[str, Any]) -> dict[str, Any]:
    """Validate and add a temporary custom scenario to session memory."""
    try:
        model = validate_scenario(payload)
        scenario_dict = model.model_dump()
        # Prevent duplicate IDs
        if any(s["id"] == scenario_dict["id"] for s in load_scenarios() + CUSTOM_SCENARIOS):
            raise HTTPException(status_code=400, detail="Scenario ID already exists.")
        CUSTOM_SCENARIOS.append(scenario_dict)
        return {"success": True, "scenario": scenario_dict}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Schema validation failed: {exc}")


@app.post("/api/evaluations")
def run_evaluation(req: EvaluationRequest) -> dict[str, Any]:
    """
    Execute selected scenarios through the 5-layer deterministic security pipeline.
    """
    all_scenarios = load_scenarios() + CUSTOM_SCENARIOS
    if req.scenario_ids:
        target_scenarios = [s for s in all_scenarios if s["id"] in req.scenario_ids]
    else:
        target_scenarios = all_scenarios

    if not target_scenarios:
        raise HTTPException(status_code=400, detail="No matching scenarios found to evaluate.")

    use_llm = (req.mode == "llm")
    selected_model = req.model_name or config.default_model

    # Execute evaluation pipeline
    results = run_scenarios(
        target_scenarios,
        use_llm=use_llm,
        model_name=selected_model if use_llm else None,
        timeout=req.timeout or config.request_timeout,
    )
    metrics = calculate_metrics(results)

    report_payload = generate_json_report(
        results=results,
        metrics=metrics,
        eval_mode=req.mode,
        model_name=selected_model if use_llm else "N/A (Deterministic)",
    )

    EVALUATION_HISTORY.append(report_payload)
    return report_payload


@app.get("/api/evaluations")
def get_evaluations() -> list[dict[str, Any]]:
    """Return historical evaluation run summaries."""
    summaries = []
    for run in reversed(EVALUATION_HISTORY):
        meta = run.get("metadata", {})
        metrics = run.get("summary_metrics", {})
        summaries.append({
            "run_id": meta.get("run_id"),
            "timestamp": meta.get("timestamp"),
            "mode": meta.get("evaluation_mode"),
            "model_name": meta.get("model_name"),
            "scenario_count": meta.get("scenario_count"),
            "accuracy_pct": metrics.get("policy_accuracy_pct"),
            "allowed_actions": metrics.get("allowed_actions"),
            "blocked_actions": metrics.get("blocked_actions"),
            "total_errors": metrics.get("total_errors"),
        })
    return summaries


@app.delete("/api/evaluations")
def clear_evaluations() -> dict[str, Any]:
    """Clear all stored evaluation runs from memory."""
    count = len(EVALUATION_HISTORY)
    EVALUATION_HISTORY.clear()
    return {"success": True, "cleared_count": count, "message": "Evaluation history reset."}


@app.delete("/api/scenarios/custom")
def clear_custom_scenarios() -> dict[str, Any]:
    """Clear all temporary custom session scenarios."""
    count = len(CUSTOM_SCENARIOS)
    CUSTOM_SCENARIOS.clear()
    return {"success": True, "cleared_count": count, "message": "Custom scenarios cleared."}


@app.get("/api/evaluations/compare")
def compare_evaluations(
    run_a: str = Query(..., description="First run ID to compare"),
    run_b: str = Query(..., description="Second run ID to compare"),
) -> dict[str, Any]:
    """Compare two evaluation runs side-by-side with metric diffs."""
    report_a = next((r for r in EVALUATION_HISTORY if r.get("metadata", {}).get("run_id") == run_a), None)
    report_b = next((r for r in EVALUATION_HISTORY if r.get("metadata", {}).get("run_id") == run_b), None)

    if not report_a:
        raise HTTPException(status_code=404, detail=f"Run '{run_a}' not found.")
    if not report_b:
        raise HTTPException(status_code=404, detail=f"Run '{run_b}' not found.")

    m_a = report_a.get("summary_metrics", {})
    m_b = report_b.get("summary_metrics", {})

    return {
        "run_a": {
            "run_id": run_a,
            "mode": report_a.get("metadata", {}).get("evaluation_mode"),
            "model": report_a.get("metadata", {}).get("model_name"),
            "metrics": m_a,
        },
        "run_b": {
            "run_id": run_b,
            "mode": report_b.get("metadata", {}).get("evaluation_mode"),
            "model": report_b.get("metadata", {}).get("model_name"),
            "metrics": m_b,
        },
        "delta": {
            "accuracy_pct": round(m_b.get("policy_accuracy_pct", 0) - m_a.get("policy_accuracy_pct", 0), 2),
            "allowed_actions": m_b.get("allowed_actions", 0) - m_a.get("allowed_actions", 0),
            "blocked_actions": m_b.get("blocked_actions", 0) - m_a.get("blocked_actions", 0),
            "total_errors": m_b.get("total_errors", 0) - m_a.get("total_errors", 0),
            "validity_rate_pct": round(m_b.get("proposal_validity_rate_pct", 0) - m_a.get("proposal_validity_rate_pct", 0), 2),
        },
    }


@app.get("/api/evaluations/{run_id}")
def get_evaluation_detail(run_id: str) -> dict[str, Any]:
    """Get complete results payload for a specific evaluation run."""
    for run in EVALUATION_HISTORY:
        if run.get("metadata", {}).get("run_id") == run_id:
            return run
    raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")


@app.get("/api/reports/{run_id}/json")
def export_report_json(run_id: str):
    """Download evaluation report as JSON file."""
    for run in EVALUATION_HISTORY:
        if run.get("metadata", {}).get("run_id") == run_id:
            content = serialize_json_report(run)
            return Response(
                content=content,
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename={run_id}.json"},
            )
    raise HTTPException(status_code=404, detail="Run not found.")


@app.get("/api/reports/{run_id}/csv")
def export_report_csv(run_id: str):
    """Download evaluation report as CSV file."""
    for run in EVALUATION_HISTORY:
        if run.get("metadata", {}).get("run_id") == run_id:
            csv_content = generate_csv_report(run.get("results", []))
            return Response(
                content=csv_content,
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={run_id}.csv"},
            )
    raise HTTPException(status_code=404, detail="Run not found.")


@app.get("/api/reports/{run_id}/markdown")
def export_report_markdown(run_id: str):
    """Download evaluation report as Markdown summary."""
    for run in EVALUATION_HISTORY:
        if run.get("metadata", {}).get("run_id") == run_id:
            md_content = generate_markdown_summary(run)
            return Response(
                content=md_content,
                media_type="text/markdown",
                headers={"Content-Disposition": f"attachment; filename={run_id}.md"},
            )
    raise HTTPException(status_code=404, detail="Run not found.")


@app.post("/api/reports/{run_id}/save")
def save_report_disk(run_id: str) -> dict[str, Any]:
    """Save an evaluation run to the local reports directory."""
    for run in EVALUATION_HISTORY:
        if run.get("metadata", {}).get("run_id") == run_id:
            json_p, csv_p = save_report_to_disk(run)
            return {
                "success": True,
                "json_file": json_p.name,
                "csv_file": csv_p.name,
                "message": f"Successfully saved to {config.reports_dir}/",
            }
    raise HTTPException(status_code=404, detail="Run not found.")


@app.get("/api/reports")
def get_saved_reports() -> list[dict[str, Any]]:
    """List existing report files saved in the reports directory."""
    return list_saved_reports()


@app.get("/api/policy")
def get_policy_rules() -> dict[str, Any]:
    """Return active deterministic authorization rules and security invariants."""
    from agentproof.policy_engine import ALLOWED_PAIRS
    return {
        "engine_type": "Deterministic Fail-Closed Allowlist",
        "default_verdict": "DENY",
        "allowed_pairs": [{"action": a, "target": t} for a, t in sorted(ALLOWED_PAIRS)],
        "blocked_actions": ["export_demo_data", "delete_demo_data", "* (any unlisted action)"],
        "blocked_targets": ["production_database", "* (any unlisted target)"],
        "invariants": [
            "LLM rationales and confidence claims are strictly ignored during authorization.",
            "Mock tools independently enforce parameter boundaries before returning synthetic records.",
            "Any validation error, missing field, or unexpected exception fails closed immediately.",
            "No production database, filesystem shell, or external network is ever connected.",
        ],
    }


class PolicySimulateRequest(BaseModel):
    action: str
    target: str
    rationale: str = ""


@app.post("/api/policy/simulate")
def simulate_policy_decision(req: PolicySimulateRequest) -> dict[str, Any]:
    """
    Test arbitrary action proposals against the policy engine in real time.
    Provides a step-by-step audit trace of schema validation, policy evaluation, and mock tool check.
    """
    from agentproof.policy_engine import evaluate_action
    from agentproof.mock_tools import execute_mock_action
    from agentproof.schemas import ActionProposal

    schema_valid = False
    validation_error = None
    proposal = None

    try:
        proposal = ActionProposal.model_validate(
            {
                "action": req.action,
                "target": req.target,
                "rationale": req.rationale or "Interactive policy simulation probe.",
            },
            strict=True,
        )
        schema_valid = True
    except Exception as exc:
        validation_error = str(exc)

    if not schema_valid or proposal is None:
        return {
            "schema_valid": False,
            "validation_error": validation_error,
            "policy_allowed": False,
            "policy_reason": "Proposal failed strict schema validation; fails closed.",
            "tool_result": {
                "success": False,
                "simulated": True,
                "error": "Execution blocked: proposal schema rejected.",
            },
        }

    decision = evaluate_action(proposal)
    if decision.allowed:
        tool_res = execute_mock_action(proposal.action, proposal.target)
    else:
        tool_res = {
            "success": False,
            "simulated": True,
            "error": "Execution blocked by policy engine.",
        }

    return {
        "schema_valid": True,
        "validation_error": None,
        "policy_allowed": decision.allowed,
        "policy_reason": decision.reason,
        "action": decision.action,
        "tool_result": tool_res,
    }


@app.get("/api/glossary")
def get_security_glossary() -> list[dict[str, Any]]:
    """Return structured AI agent security terminology."""
    from agentproof.glossary import SECURITY_GLOSSARY
    return SECURITY_GLOSSARY


# ---------------------------------------------------------------------------
# Desktop Companion & Local Security Suite Endpoints
# ---------------------------------------------------------------------------

from agentproof.file_scanner import FileScanner
from agentproof.quarantine_manager import QuarantineManager
from agentproof.website_scanner import WebsiteScanner
from agentproof.cookie_analyzer import CookieAnalyzer
from agentproof.permission_analyzer import PermissionAnalyzer
from agentproof.ollama_service import OllamaService

file_scanner = FileScanner()
quarantine_manager = QuarantineManager(config.quarantine_dir)
website_scanner = WebsiteScanner()
cookie_analyzer = CookieAnalyzer()
permission_analyzer = PermissionAnalyzer()
ollama_service = OllamaService()


def verify_companion_token(
    request: Request,
    x_agentproof_token: Optional[str] = Header(None, alias="X-AgentProof-Token"),
    authorization: Optional[str] = Header(None),
) -> None:
    """Validate loopback binding and token authentication for companion operations."""
    client_host = request.client.host if request.client else "unknown"
    if client_host not in ("127.0.0.1", "::1", "localhost", "testclient"):
        raise HTTPException(status_code=403, detail="Companion API strictly bound to loopback.")

    bearer = (
        authorization.replace("Bearer ", "").strip()
        if authorization and authorization.startswith("Bearer ")
        else None
    )
    token = x_agentproof_token or bearer
    if not token or token != config.companion_token:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: valid companion token required in 'X-AgentProof-Token' or Bearer header.",
        )


class CompanionScanRequest(BaseModel):
    file_path: str


class QuarantineRequest(BaseModel):
    file_path: str
    reason: str = "Suspicious file detected by security policy"
    confirmed: bool = False


class QuarantineRestoreRequest(BaseModel):
    quarantine_id: str
    target_dir: Optional[str] = None
    confirmed: bool = False


class WebsiteScanRequest(BaseModel):
    url: str
    dom_forms: Optional[list[dict[str, Any]]] = None
    is_mixed_content: bool = False


class CookieAnalysisRequest(BaseModel):
    cookies: list[dict[str, Any]]
    is_https: bool = True
    origin_domain: str = ""


class PermissionAnalysisRequest(BaseModel):
    permissions: dict[str, str]
    origin: str = ""
    is_https: bool = True


class OllamaExplainRequest(BaseModel):
    findings: list[dict[str, Any]]
    target: str
    risk_level: str
    score: int
    model_name: Optional[str] = None


class OllamaPrivacyPolicyRequest(BaseModel):
    policy_text: str
    url: str = ""
    model_name: Optional[str] = None


@app.get("/api/companion/status")
def get_companion_status() -> dict[str, Any]:
    """Return companion service health, local ClamAV availability, and quarantine stats."""
    return {
        "status": "active",
        "antivirus_available": file_scanner.is_antivirus_available(),
        "quarantine_count": len(quarantine_manager.list_quarantined_files()),
        "quarantine_vault": str(quarantine_manager.vault_dir),
        "auth_required": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/companion/scan", dependencies=[Depends(verify_companion_token)])
def scan_local_file(req: CompanionScanRequest) -> dict[str, Any]:
    """Perform authorized file inspection, cryptographic hashing, and signature validation."""
    result = file_scanner.scan_file(req.file_path)
    if not result.get("success", False) and "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.get("/api/companion/quarantine", dependencies=[Depends(verify_companion_token)])
def list_quarantined_files() -> list[dict[str, Any]]:
    """List all quarantined files from persistent audit manifest."""
    return quarantine_manager.list_quarantined_files()


@app.post("/api/companion/quarantine", dependencies=[Depends(verify_companion_token)])
def quarantine_file_endpoint(req: QuarantineRequest) -> dict[str, Any]:
    """Move a suspicious file to isolated quarantine vault with cryptographic integrity check."""
    result = quarantine_manager.quarantine_file(
        file_path=req.file_path,
        reason=req.reason,
        confirmed=req.confirmed,
    )
    if not result.get("success", False):
        raise HTTPException(status_code=400, detail=result.get("error", "Quarantine failed"))
    return result


@app.post("/api/companion/quarantine/restore", dependencies=[Depends(verify_companion_token)])
def restore_quarantined_file(req: QuarantineRestoreRequest) -> dict[str, Any]:
    """Restore a quarantined file back to original or specified destination."""
    result = quarantine_manager.restore_file(
        quarantine_id=req.quarantine_id,
        target_dir=req.target_dir,
        confirmed=req.confirmed,
    )
    if not result.get("success", False):
        raise HTTPException(status_code=400, detail=result.get("error", "Restoration failed"))
    return result


@app.delete("/api/companion/quarantine/{quarantine_id}", dependencies=[Depends(verify_companion_token)])
def delete_quarantined_file(quarantine_id: str, confirmed: bool = Query(default=False)) -> dict[str, Any]:
    """Permanently delete a quarantined file after explicit confirmation."""
    result = quarantine_manager.delete_quarantined_file(quarantine_id=quarantine_id, confirmed=confirmed)
    if not result.get("success", False):
        raise HTTPException(status_code=400, detail=result.get("error", "Deletion failed"))
    return result


@app.post("/api/scanner/website")
def scan_website_endpoint(req: WebsiteScanRequest) -> dict[str, Any]:
    """Inspect website URL, transport protocol, and DOM forms deterministically."""
    return website_scanner.scan_url(
        url=req.url,
        dom_forms=req.dom_forms,
        is_mixed_content=req.mixed_content if hasattr(req, "mixed_content") else req.is_mixed_content,
    )


@app.post("/api/scanner/cookies")
def scan_cookies_endpoint(req: CookieAnalysisRequest) -> dict[str, Any]:
    """Analyze cookie security metadata without storing or transmitting sensitive values."""
    return cookie_analyzer.analyze_cookies(
        cookies=req.cookies,
        is_https=req.is_https,
        origin_domain=req.origin_domain,
    )


@app.post("/api/scanner/permissions")
def scan_permissions_endpoint(req: PermissionAnalysisRequest) -> dict[str, Any]:
    """Analyze site permission grants and calculate privacy exposure."""
    return permission_analyzer.analyze_permissions(
        permissions=req.permissions,
        origin=req.origin,
        is_https=req.is_https,
    )


@app.post("/api/ollama/explain")
def explain_with_ollama(req: OllamaExplainRequest) -> dict[str, Any]:
    """Synthesize beginner-friendly AI explanation using local Ollama model."""
    return ollama_service.explain_findings(
        findings=req.findings,
        url_or_target=req.target,
        risk_level=req.risk_level,
        score=req.score,
        model_name=req.model_name,
    )


@app.post("/api/ollama/privacy-policy")
def summarize_privacy_policy_endpoint(req: OllamaPrivacyPolicyRequest) -> dict[str, Any]:
    """Summarize privacy policy disclosures using local Ollama model."""
    return ollama_service.summarize_privacy_policy(
        policy_text=req.policy_text,
        url=req.url,
        model_name=req.model_name,
    )


# ---------------------------------------------------------------------------
# Browser Autonomous URL Triage & Multimodal Analysis Endpoints
# ---------------------------------------------------------------------------

from agentproof.multimodal_analyzer import MultimodalThreatReport, default_multimodal_analyzer


class URLTriageRequest(BaseModel):
    """Request payload for passive autonomous URL triage."""
    url: str = Field(..., description="Target public HTTP/HTTPS URL to triage passively.", max_length=2048)
    capture_mode: Literal["viewport", "full_page"] = Field(
        default="viewport",
        description="Capture mode for screenshot observation (viewport or full_page).",
    )
    model_name: Optional[str] = Field(
        default=None,
        description="Optional local Ollama model name for explanation synthesis.",
    )


class MultimodalAnalyzeRequest(BaseModel):
    """Request payload for uploaded screenshot threat evaluation."""
    image_base64: str = Field(..., description="Base64-encoded image bytes (PNG, JPEG, WebP).")
    url: Optional[str] = Field(default="uploaded_screenshot", description="Associated URL context if any.")


@app.post(
    "/api/url/triage",
    response_model=MultimodalThreatReport,
    dependencies=[Depends(verify_companion_token)],
    responses={
        400: {"description": "Invalid or blocked URL target"},
        401: {"description": "Unauthorized: valid companion token required"},
        503: {"description": "Browser sandbox service unavailable"},
    },
)
async def triage_url_endpoint(req: URLTriageRequest) -> MultimodalThreatReport:
    """
    Execute secure, isolated, passive triage of a suspicious public URL.
    Validates destination against SSRF policies, captures bounded evidence via
    an ephemeral Chromium context, normalizes screenshot bytes, and generates a
    deterministic risk evaluation and threat report.
    """
    if not config.browser_triage_enabled:
        raise HTTPException(
            status_code=503,
            detail="Browser URL triage service is disabled by server configuration.",
        )

    from agentproof.browser_sandbox import BrowserSandbox, BrowserUnavailableError
    from agentproof.url_policy import production_url_policy, sanitize_url_for_display

    # Pre-validate URL syntax and schemes before browser execution
    pre_val = production_url_policy.validate_url(req.url)
    if not pre_val.is_allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Target URL rejected by security policy: {pre_val.error}",
        )

    sandbox = BrowserSandbox(policy=production_url_policy)
    try:
        capture = await sandbox.scan_url(
            target_url=req.url,
            capture_mode=req.capture_mode,
        )
    except BrowserUnavailableError as exc:
        raise HTTPException(status_code=503, detail=f"Browser runtime unavailable: {exc}")
    except Exception as exc:
        logger.exception("Unexpected error during URL triage")
        raise HTTPException(status_code=500, detail="Internal browser triage error.")

    report = default_multimodal_analyzer.analyze_capture(
        capture=capture,
        model_name=req.model_name,
    )
    return report


@app.post(
    "/api/browser/triage",
    response_model=MultimodalThreatReport,
    dependencies=[Depends(verify_companion_token)],
    include_in_schema=True,
)
async def triage_browser_alias_endpoint(req: URLTriageRequest) -> MultimodalThreatReport:
    """Canonical alias endpoint for /api/url/triage."""
    return await triage_url_endpoint(req)


@app.post(
    "/api/multimodal/analyze",
    response_model=MultimodalThreatReport,
    dependencies=[Depends(verify_companion_token)],
)
def analyze_screenshot_endpoint(req: MultimodalAnalyzeRequest) -> MultimodalThreatReport:
    """Analyze an uploaded screenshot through ImageProcessor and deterministic risk engine."""
    import base64

    try:
        image_bytes = base64.b64decode(req.image_base64, validate=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid base64 image data: {exc}")

    report = default_multimodal_analyzer.analyze_screenshot(
        image_bytes=image_bytes,
        url=req.url or "uploaded_screenshot",
    )
    return report




