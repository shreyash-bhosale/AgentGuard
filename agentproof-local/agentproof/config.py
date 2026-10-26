"""Configuration management for AgentProof Local."""

import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Locate and load .env from agentproof-local root or current working directory
_local_env = Path(__file__).resolve().parent.parent / ".env"
if _local_env.exists():
    load_dotenv(dotenv_path=_local_env)
load_dotenv()


class AppConfig(BaseModel):
    ollama_url: str = Field(
        default_factory=lambda: os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
    )
    default_model: str = Field(
        default_factory=lambda: os.getenv("DEFAULT_MODEL", "gemma4:e2b-it-qat")
    )
    request_timeout: int = Field(
        default_factory=lambda: int(os.getenv("REQUEST_TIMEOUT", "60")),
        ge=5,
        le=300,
    )
    max_retries: int = Field(default=1, ge=0, le=3)
    reports_dir: str = Field(
        default_factory=lambda: os.getenv("REPORTS_DIR", "reports")
    )
    quarantine_dir: str = Field(
        default_factory=lambda: os.getenv("QUARANTINE_DIR", "quarantine_vault")
    )
    companion_token: str = Field(
        default_factory=lambda: os.getenv("COMPANION_TOKEN", "agentguard-local-secure-token")
    )
    # Cloud AI & Gemma 4 Configuration
    ai_provider: str = Field(
        default_factory=lambda: os.getenv("AI_PROVIDER", "gemma_cloud").lower()
    )
    gemma_model: str = Field(
        default_factory=lambda: os.getenv("GEMMA_MODEL", "gemma-4-26b-a4b-it")
    )
    gemma_endpoint: str = Field(
        default_factory=lambda: os.getenv("GEMMA_ENDPOINT", "").rstrip("/")
    )
    gemma_api_key: str = Field(
        default_factory=lambda: os.getenv("GEMMA_API_KEY", os.getenv("GEMINI_API_KEY", ""))
    )
    ai_request_timeout_seconds: int = Field(
        default_factory=lambda: int(os.getenv("AI_REQUEST_TIMEOUT_SECONDS", "30")),
        ge=5,
        le=180,
    )
    max_image_upload_bytes: int = 10 * 1024 * 1024  # 10 MB strict upload limit

    # Browser URL Triage settings
    browser_triage_enabled: bool = Field(
        default_factory=lambda: os.getenv("BROWSER_TRIAGE_ENABLED", "true").lower() in ("true", "1", "yes")
    )
    browser_headless: bool = Field(
        default_factory=lambda: os.getenv("BROWSER_HEADLESS", "true").lower() in ("true", "1", "yes")
    )
    browser_nav_timeout: int = Field(
        default_factory=lambda: int(os.getenv("BROWSER_NAV_TIMEOUT", "15")),
        ge=2,
        le=60,
    )
    browser_total_timeout: int = Field(
        default_factory=lambda: int(os.getenv("BROWSER_TOTAL_TIMEOUT", "30")),
        ge=5,
        le=120,
    )
    browser_max_redirects: int = Field(
        default_factory=lambda: int(os.getenv("BROWSER_MAX_REDIRECTS", "5")),
        ge=0,
        le=20,
    )
    browser_max_url_length: int = Field(
        default_factory=lambda: int(os.getenv("BROWSER_MAX_URL_LENGTH", "2048")),
        ge=64,
        le=8192,
    )
    browser_max_concurrent_scans: int = Field(
        default_factory=lambda: int(os.getenv("BROWSER_MAX_CONCURRENT_SCANS", "2")),
        ge=1,
        le=10,
    )
    browser_max_telemetry_requests: int = Field(
        default_factory=lambda: int(os.getenv("BROWSER_MAX_TELEMETRY_REQUESTS", "50")),
        ge=5,
        le=200,
    )
    browser_max_dom_text_chars: int = Field(
        default_factory=lambda: int(os.getenv("BROWSER_MAX_DOM_TEXT_CHARS", "4000")),
        ge=200,
        le=20000,
    )
    browser_screenshot_max_bytes: int = Field(
        default_factory=lambda: int(os.getenv("BROWSER_SCREENSHOT_MAX_BYTES", str(10 * 1024 * 1024))),
        ge=1024,
        le=50 * 1024 * 1024,
    )
    browser_screenshot_max_pixels: int = Field(
        default_factory=lambda: int(os.getenv("BROWSER_SCREENSHOT_MAX_PIXELS", "40000000")),
        ge=10000,
        le=100000000,
    )
    browser_viewport_width: int = Field(
        default_factory=lambda: int(os.getenv("BROWSER_VIEWPORT_WIDTH", "1280")),
        ge=320,
        le=3840,
    )
    browser_viewport_height: int = Field(
        default_factory=lambda: int(os.getenv("BROWSER_VIEWPORT_HEIGHT", "800")),
        ge=240,
        le=2160,
    )
    browser_tracing_enabled: bool = Field(
        default_factory=lambda: os.getenv("BROWSER_TRACING_ENABLED", "false").lower() in ("true", "1", "yes")
    )
    app_version: str = "1.1.0"


config = AppConfig()
