"""AI Provider Abstraction for AgentGuard.

Separates multimodal model inference from security policy enforcement.
Supports:
1. GoogleGemmaProvider: Official Google GenAI SDK for cloud-hosted Gemma 4 models
   (e.g., gemma-4-26b-a4b-it, gemma-4-31b-it).
2. OpenAIGemmaProvider: Cloud-hosted OpenAI-compatible inference endpoints
   (vLLM / Cloud Run / Hugging Face Inference Endpoints / Vertex AI Model Garden
   serving gemma-4-e4b-it or custom variants).
3. LocalOllamaProvider: Preserves local loopback Ollama offline execution.

Enforces:
- Bounded timeouts (AI_REQUEST_TIMEOUT_SECONDS)
- Max 1 retry on transient network errors (never infinite)
- Strict typed schema validation
- Never silently substitutes an unrequested model
- Never exposes secrets or tokens in logs or responses
"""

import abc
import asyncio
import base64
import json
import logging
import time
from typing import Any, Optional, Type
import httpx
from pydantic import BaseModel

from agentproof.config import config
from agentproof.exceptions import (
    AIProviderError,
    InferenceAuthError,
    InferenceTimeoutError,
    InferenceUnavailableError,
    SchemaValidationError,
)
from agentproof.schemas import MultimodalThreatReport

logger = logging.getLogger("agentproof.ai_provider")


class BaseAIProvider(abc.ABC):
    """Abstract interface for AI inference providers."""

    @property
    @abc.abstractmethod
    def provider_id(self) -> str:
        """Unique slug identifier for the provider."""
        pass

    @property
    @abc.abstractmethod
    def is_cloud_hosted(self) -> bool:
        """Whether inference executes on cloud infrastructure rather than local host."""
        pass

    @abc.abstractmethod
    async def check_readiness(self) -> dict[str, Any]:
        """Verify model availability, endpoint connectivity, and credential validity."""
        pass

    @abc.abstractmethod
    async def analyze_multimodal(
        self,
        image_bytes: bytes,
        mime_type: str,
        instruction: str,
        schema: Type[BaseModel] = MultimodalThreatReport,
    ) -> tuple[MultimodalThreatReport, dict[str, Any]]:
        """
        Send an image and security instructions to the model.
        Returns the strictly validated schema instance and telemetry metadata.
        """
        pass


class GoogleGemmaProvider(BaseAIProvider):
    """
    Cloud provider for Google-hosted Gemma 4 multimodal models
    using the official google-genai SDK.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        timeout_seconds: Optional[int] = None,
    ):
        self.api_key = config.gemma_api_key if api_key is None else api_key
        self.model_name = config.gemma_model if model_name is None else model_name
        self.timeout_seconds = config.ai_request_timeout_seconds if timeout_seconds is None else timeout_seconds

    @property
    def provider_id(self) -> str:
        return "gemma_cloud"

    @property
    def is_cloud_hosted(self) -> bool:
        return True

    def _get_client(self):
        if not self.api_key:
            raise InferenceAuthError(
                "GEMMA_API_KEY (or GEMINI_API_KEY) is not set. "
                "Provide a Google AI Studio or Vertex AI API key in the environment."
            )
        try:
            from google import genai
            return genai.Client(api_key=self.api_key)
        except Exception as exc:
            raise InferenceUnavailableError(
                f"Failed to initialize Google GenAI SDK: {exc}"
            ) from exc

    async def check_readiness(self) -> dict[str, Any]:
        if not self.api_key:
            return {
                "available": False,
                "provider": self.provider_id,
                "cloud_hosted": True,
                "model": self.model_name,
                "configured": False,
                "error": "GEMMA_API_KEY is not configured.",
            }

        try:
            client = self._get_client()
            # Asynchronous lightweight model info query
            model_info = await asyncio.wait_for(
                client.aio.models.get(model=self.model_name),
                timeout=min(self.timeout_seconds, 8),
            )
            return {
                "available": True,
                "provider": self.provider_id,
                "cloud_hosted": True,
                "model": self.model_name,
                "configured": True,
                "display_name": getattr(model_info, "display_name", self.model_name),
                "error": None,
            }
        except asyncio.TimeoutError:
            return {
                "available": False,
                "provider": self.provider_id,
                "cloud_hosted": True,
                "model": self.model_name,
                "configured": True,
                "error": f"Cloud readiness check timed out after {min(self.timeout_seconds, 8)}s.",
            }
        except Exception as exc:
            err_msg = str(exc)
            if "403" in err_msg or "401" in err_msg or "API_KEY_INVALID" in err_msg:
                error_desc = "Authentication failed: Invalid or unauthorized GEMMA_API_KEY."
            elif "404" in err_msg or "NOT_FOUND" in err_msg:
                error_desc = f"Model '{self.model_name}' was not found on Google Cloud. Verify GEMMA_MODEL."
            else:
                error_desc = f"Inference check error: {exc}"

            return {
                "available": False,
                "provider": self.provider_id,
                "cloud_hosted": True,
                "model": self.model_name,
                "configured": True,
                "error": error_desc,
            }

    async def analyze_multimodal(
        self,
        image_bytes: bytes,
        mime_type: str,
        instruction: str,
        schema: Type[BaseModel] = MultimodalThreatReport,
    ) -> tuple[MultimodalThreatReport, dict[str, Any]]:
        client = self._get_client()
        from google.genai import types

        contents = [
            instruction,
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
        ]

        generate_config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=schema,
            temperature=0.1,  # Low temperature for deterministic security reasoning
        )

        start_time = time.monotonic()
        last_exc: Optional[Exception] = None

        # Limited retry: max 1 retry for transient network hiccups
        for attempt in range(2):
            try:
                response = await asyncio.wait_for(
                    client.aio.models.generate_content(
                        model=self.model_name,
                        contents=contents,
                        config=generate_config,
                    ),
                    timeout=self.timeout_seconds,
                )
                duration_ms = round((time.monotonic() - start_time) * 1000, 2)
                raw_text = response.text or ""

                if not raw_text.strip():
                    raise SchemaValidationError("Cloud model returned an empty response body.")

                try:
                    parsed_dict = json.loads(raw_text)
                except Exception as json_err:
                    raise SchemaValidationError(
                        f"Model output is not valid JSON: {json_err}. Raw: {raw_text[:200]}"
                    ) from json_err

                validated_report = schema.model_validate(parsed_dict)
                telemetry = {
                    "provider": self.provider_id,
                    "model": self.model_name,
                    "cloud_hosted": True,
                    "duration_ms": duration_ms,
                    "attempts": attempt + 1,
                }
                return validated_report, telemetry

            except asyncio.TimeoutError as exc:
                last_exc = InferenceTimeoutError(
                    f"Cloud Gemma 4 inference timed out after {self.timeout_seconds}s (attempt {attempt+1}/2)."
                )
                if attempt == 0:
                    await asyncio.sleep(0.5)
                    continue
            except Exception as exc:
                err_msg = str(exc)
                if "401" in err_msg or "403" in err_msg:
                    raise InferenceAuthError(
                        "Cloud Gemma 4 authentication failed. Check GEMMA_API_KEY."
                    ) from exc
                if "404" in err_msg:
                    raise InferenceUnavailableError(
                        f"Model '{self.model_name}' not available on Google Cloud: {exc}"
                    ) from exc
                last_exc = exc
                if attempt == 0:
                    await asyncio.sleep(0.5)
                    continue

        if isinstance(last_exc, AIProviderError):
            raise last_exc
        raise InferenceUnavailableError(
            f"Cloud Gemma 4 inference failed: {type(last_exc).__name__}: {last_exc}"
        ) from last_exc


class OpenAIGemmaProvider(BaseAIProvider):
    """
    Cloud provider for OpenAI-compatible Gemma 4 endpoints
    (e.g., vLLM / Cloud Run / Hugging Face serving gemma-4-e4b-it or other checkpoints).
    """

    def __init__(
        self,
        endpoint: Optional[str] = None,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        timeout_seconds: Optional[int] = None,
    ):
        self.endpoint = (config.gemma_endpoint if endpoint is None else endpoint).rstrip("/")
        self.api_key = config.gemma_api_key if api_key is None else api_key
        self.model_name = config.gemma_model if model_name is None else model_name
        self.timeout_seconds = config.ai_request_timeout_seconds if timeout_seconds is None else timeout_seconds

    @property
    def provider_id(self) -> str:
        return "gemma_openai"

    @property
    def is_cloud_hosted(self) -> bool:
        return True

    async def check_readiness(self) -> dict[str, Any]:
        if not self.endpoint:
            return {
                "available": False,
                "provider": self.provider_id,
                "cloud_hosted": True,
                "model": self.model_name,
                "configured": False,
                "error": "GEMMA_ENDPOINT is not configured.",
            }

        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            async with httpx.AsyncClient(timeout=min(self.timeout_seconds, 6)) as client:
                res = await client.get(f"{self.endpoint}/models", headers=headers)
                if res.status_code == 200:
                    return {
                        "available": True,
                        "provider": self.provider_id,
                        "cloud_hosted": True,
                        "model": self.model_name,
                        "configured": True,
                        "endpoint": self.endpoint,
                        "error": None,
                    }
                return {
                    "available": False,
                    "provider": self.provider_id,
                    "cloud_hosted": True,
                    "model": self.model_name,
                    "configured": True,
                    "error": f"Endpoint returned HTTP {res.status_code}: {res.text[:150]}",
                }
        except httpx.TimeoutException:
            return {
                "available": False,
                "provider": self.provider_id,
                "cloud_hosted": True,
                "model": self.model_name,
                "configured": True,
                "error": f"Endpoint health check timed out after {min(self.timeout_seconds, 6)}s.",
            }
        except Exception as exc:
            return {
                "available": False,
                "provider": self.provider_id,
                "cloud_hosted": True,
                "model": self.model_name,
                "configured": True,
                "error": f"Failed to connect to {self.endpoint}: {exc}",
            }

    async def analyze_multimodal(
        self,
        image_bytes: bytes,
        mime_type: str,
        instruction: str,
        schema: Type[BaseModel] = MultimodalThreatReport,
    ) -> tuple[MultimodalThreatReport, dict[str, Any]]:
        if not self.endpoint:
            raise InferenceUnavailableError(
                "GEMMA_ENDPOINT is not set for the OpenAI-compatible Gemma 4 provider."
            )

        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        data_uri = f"data:{mime_type};base64,{b64_image}"

        prompt = (
            f"{instruction}\n\n"
            f"You MUST return valid JSON matching this schema exactly:\n"
            f"{json.dumps(schema.model_json_schema(), indent=2)}"
        )

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "model": self.model_name,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are AgentGuard Multimodal Threat Analyzer. "
                        "Inspect screenshots objectively. Distinguish verified visual elements "
                        "from hypotheses. Output strictly valid JSON."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_uri}},
                    ],
                },
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
        }

        start_time = time.monotonic()
        last_exc: Optional[Exception] = None

        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                    res = await client.post(
                        f"{self.endpoint}/chat/completions",
                        json=payload,
                        headers=headers,
                    )

                duration_ms = round((time.monotonic() - start_time) * 1000, 2)
                if res.status_code == 401 or res.status_code == 403:
                    raise InferenceAuthError(
                        f"Authentication failed for cloud Gemma endpoint: HTTP {res.status_code}"
                    )
                if res.status_code != 200:
                    raise InferenceUnavailableError(
                        f"Cloud endpoint returned HTTP {res.status_code}: {res.text[:200]}"
                    )

                data = res.json()
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                validated = schema.model_validate(parsed)
                telemetry = {
                    "provider": self.provider_id,
                    "model": self.model_name,
                    "cloud_hosted": True,
                    "endpoint": self.endpoint,
                    "duration_ms": duration_ms,
                    "attempts": attempt + 1,
                }
                return validated, telemetry
            except httpx.TimeoutException as exc:
                last_exc = InferenceTimeoutError(
                    f"Cloud Gemma inference timed out after {self.timeout_seconds}s."
                )
                if attempt == 0:
                    await asyncio.sleep(0.5)
                    continue
            except Exception as exc:
                if isinstance(exc, AIProviderError):
                    raise exc
                last_exc = exc
                if attempt == 0:
                    await asyncio.sleep(0.5)
                    continue

        if isinstance(last_exc, AIProviderError):
            raise last_exc
        raise InferenceUnavailableError(f"Cloud Gemma inference failed: {last_exc}") from last_exc


class LocalOllamaProvider(BaseAIProvider):
    """
    Local Ollama provider (preserved for offline local developer use).
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        model_name: Optional[str] = None,
        timeout_seconds: Optional[int] = None,
    ):
        self.base_url = (base_url or config.ollama_url).rstrip("/")
        self.model_name = model_name or config.default_model
        self.timeout_seconds = timeout_seconds or config.request_timeout

    @property
    def provider_id(self) -> str:
        return "ollama"

    @property
    def is_cloud_hosted(self) -> bool:
        return False

    async def check_readiness(self) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=3) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name", "") for m in data.get("models", []) if m.get("name")]
                    return {
                        "available": True,
                        "provider": self.provider_id,
                        "cloud_hosted": False,
                        "model": self.model_name,
                        "models": models,
                        "configured": True,
                        "error": None,
                    }
                return {
                    "available": False,
                    "provider": self.provider_id,
                    "cloud_hosted": False,
                    "model": self.model_name,
                    "configured": True,
                    "error": f"Ollama HTTP {res.status_code}",
                }
        except Exception as exc:
            return {
                "available": False,
                "provider": self.provider_id,
                "cloud_hosted": False,
                "model": self.model_name,
                "configured": True,
                "error": f"Local Ollama unreachable: {exc}",
            }

    async def analyze_multimodal(
        self,
        image_bytes: bytes,
        mime_type: str,
        instruction: str,
        schema: Type[BaseModel] = MultimodalThreatReport,
    ) -> tuple[MultimodalThreatReport, dict[str, Any]]:
        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        payload = {
            "model": self.model_name,
            "messages": [
                {
                    "role": "user",
                    "content": instruction,
                    "images": [b64_image],
                }
            ],
            "format": schema.model_json_schema(),
            "stream": False,
            "options": {"temperature": 0.1},
        }

        start_time = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                res = await client.post(f"{self.base_url}/api/chat", json=payload)
            duration_ms = round((time.monotonic() - start_time) * 1000, 2)
            if res.status_code != 200:
                raise InferenceUnavailableError(
                    f"Ollama returned HTTP {res.status_code}: {res.text[:200]}"
                )
            content = res.json().get("message", {}).get("content", "")
            parsed = json.loads(content)
            validated = schema.model_validate(parsed)
            telemetry = {
                "provider": self.provider_id,
                "model": self.model_name,
                "cloud_hosted": False,
                "duration_ms": duration_ms,
                "attempts": 1,
            }
            return validated, telemetry
        except httpx.TimeoutException as exc:
            raise InferenceTimeoutError(
                f"Local Ollama request timed out after {self.timeout_seconds}s."
            ) from exc
        except Exception as exc:
            if isinstance(exc, AIProviderError):
                raise exc
            raise InferenceUnavailableError(f"Local Ollama error: {exc}") from exc


def get_ai_provider(provider_name: Optional[str] = None) -> BaseAIProvider:
    """
    Factory function returning the active AI provider based on configuration or explicit request.
    Priority:
    1. Explicit provider_name if passed
    2. config.ai_provider ("gemma_cloud", "gemma_openai", or "ollama")
    3. Auto-detection based on configured keys / endpoints
    """
    selected = (provider_name or config.ai_provider or "").lower().strip()

    if selected in ("gemma_cloud", "google", "cloud"):
        return GoogleGemmaProvider()
    elif selected in ("gemma_openai", "vllm", "openai", "custom_cloud"):
        return OpenAIGemmaProvider()
    elif selected in ("ollama", "local"):
        return LocalOllamaProvider()

    # Automatic fallback detection:
    if config.gemma_api_key:
        return GoogleGemmaProvider()
    elif config.gemma_endpoint:
        return OpenAIGemmaProvider()
    return LocalOllamaProvider()
