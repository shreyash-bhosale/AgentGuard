"""Custom typed exceptions for AgentProof Local."""


class AgentProofError(Exception):
    """Base exception for all AgentProof errors."""


class OllamaConnectionError(AgentProofError):
    """Raised when the Ollama service cannot be reached."""


class OllamaTimeoutError(AgentProofError):
    """Raised when an Ollama request times out."""


class OllamaModelNotFoundError(AgentProofError):
    """Raised when the requested model is not found on Ollama."""


class SchemaValidationError(AgentProofError):
    """Raised when model output or input data fails schema validation."""


class PolicyEngineError(AgentProofError):
    """Raised when an unexpected error occurs during policy evaluation."""


class MockToolError(AgentProofError):
    """Raised when a mock tool execution encounters an error."""


class AIProviderError(AgentProofError):
    """Base exception for AI provider inference errors."""


class InferenceUnavailableError(AIProviderError):
    """Raised when the requested AI inference service is unreachable or offline."""


class InferenceTimeoutError(AIProviderError):
    """Raised when an AI inference request exceeds the configured timeout."""


class InferenceAuthError(AIProviderError):
    """Raised when AI API credentials are missing, invalid, or unauthorized."""


class InvalidImageError(AgentProofError):
    """Raised when an uploaded screenshot is corrupted, too large, or an unsupported format."""
