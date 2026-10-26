# Production Containerfile for AgentGuard FastAPI Multimodal Security Backend
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

WORKDIR /app

# Install security certificates & curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY agentproof ./agentproof
COPY data ./data

# Create dedicated non-root user for principle of least privilege
RUN useradd -m -u 1001 agentguard && \
    mkdir -p /app/reports /app/quarantine_vault && \
    chown -R agentguard:agentguard /app

USER agentguard

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://127.0.0.1:${PORT:-8000}/api/health || exit 1

# Execute Uvicorn server bound to 0.0.0.0 on dynamically assigned cloud port
CMD ["sh", "-c", "uvicorn agentproof.server:app --host 0.0.0.0 --port ${PORT:-8000}"]
