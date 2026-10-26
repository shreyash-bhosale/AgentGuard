# 🛡️ AgentGuard: Complete Project Status & Open-Source Ecosystem Roadmap

> **Document Version**: 2.0.0  
> **Target Date**: October 2026  
> **Status**: Production-Ready Baseline (108 Automated Tests Passing, 100% Verified)  
> **Core Architecture Principle**: *"The LLM proposes. The validator checks. The policy engine decides. The mock tool executes. The evaluator measures."*

---

## 1. Executive Summary & Project Baseline

**AgentGuard** (formerly *AgentProof Local Security Suite*) is a local-first, zero-knowledge AI security and browser defense framework. It bridges modern generative AI models (such as cloud-hosted multimodal **Gemma 4**) with deterministic, fail-closed policy enforcement and real-time host protection.

### Current System Architecture

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       USER INTERFACES                                        │
│  ┌─────────────────────────┐  ┌───────────────────────────┐  ┌────────────────────────────┐  │
│  │   React/Vite Dashboard  │  │  Manifest V3 Extension    │  │  Streamlit Companion App   │  │
│  │  (Port 5173 / Vercel)   │  │  (Browser Interception)   │  │   (Port 8501 / 13 Views)   │  │
│  └───────────┬─────────────┘  └─────────────┬─────────────┘  └─────────────┬──────────────┘  │
└──────────────┼──────────────────────────────┼──────────────────────────────┼─────────────────┘
               │                              │                              │
               ▼                              ▼                              ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                       AGENTGUARD CORE SECURITY ENGINE (FastAPI :8000)                        │
│                                                                                              │
│   1. SCREENSHOT & FILE VALIDATION                                                            │
│      └─ ImageProcessor (Pillow): Bounds 10MB, verifies magic bytes, flattens alpha           │
│      └─ FileScanner: Computes SHA-256/1/MD5, flags double extensions, magic byte audits      │
│                                                                                              │
│   2. AI INFERENCE LAYER (ai_provider.py)                                                     │
│      ├─ GoogleGemmaProvider: Cloud-Hosted Gemma 4 (26B A4B MoE / 31B Dense via google-genai) │
│      ├─ OpenAIGemmaProvider: Dedicated vLLM / Cloud Run (gemma-4-e4b-it via /v1)             │
│      └─ LocalOllamaProvider: Air-gapped on-device loopback (gemma4:e2b-it-qat :11434)        │
│                                                                                              │
│   3. DETERMINISTIC RISK SCORING (risk_engine.py)                                             │
│      └─ Heuristic 0–100 scoring, deduplication, category separation, critical overrides     │
│                                                                                              │
│   4. FAIL-CLOSED POLICY ENGINE (policy_engine.py)                                            │
│      └─ Strict allowlist: ALLOWED_PAIRS = {("read_demo_record", "demo_record")}              │
│      └─ Denies all unapproved actions; model rationales are strictly ignored                 │
│                                                                                              │
│   5. LOCAL HOST PROTECTION & QUARANTINE                                                      │
│      └─ QuarantineManager: POSIX 0o700 vault, pre/post SHA-256 checks, audit manifests       │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Inventory of Current Modules & Operational Status

| Component | Key Files | Operational Status | Tested Invariants |
|:---|:---|:---:|:---|
| **Cloud Gemma 4 Multimodal Analyzer** | `agentproof/ai_provider.py`<br>`agentproof/multimodal_analyzer.py` | ✅ Production Active | Sandboxed instructions; separates factual visual evidence from model hypotheses; strictly enforces `MultimodalThreatReport` schema. |
| **Screenshot & Image Normalizer** | `agentproof/image_processor.py` | ✅ Production Active | Bounds uploads to 10 MB; guards against decompression bombs (max 40 MP); normalizes PNG/JPEG/WebP to safe RGB. |
| **Deterministic Risk Engine** | `agentproof/risk_engine.py` | ✅ Production Active | 0–100 score; category segregation (`TECHNICAL`, `POTENTIAL_SECURITY`, `PRIVACY`, `UNVERIFIED`); critical override forces score $\ge 75$ for HTTP credential forms. |
| **Fail-Closed Policy Engine** | `agentproof/policy_engine.py` | ✅ Production Active | Strict allowlist; model recommendations requesting destructive actions (`delete`, `export`) are denied closed without execution. |
| **Desktop Companion & Vault** | `agentproof/file_scanner.py`<br>`agentproof/quarantine_manager.py` | ✅ Production Active | Authenticated via `X-AgentProof-Token`; POSIX `0o700` vault isolation; collision-proof UUIDs with pre/post SHA-256 validation. |
| **FastAPI Backend Adapter** | `agentproof/server.py` | ✅ Production Active | Endpoints for `/api/health`, `/api/ai/readiness`, `/api/multimodal/analyze`, `/api/evaluations`, `/api/companion/*`. |
| **React / Vite Web Portal** | `frontend/src/` | ✅ Production Active | Built in TypeScript & Tailwind v4; includes dedicated Multimodal Analysis View with 1-click test fixtures, live readiness badges, and policy verdict display. |
| **Chrome Extension (MV3)** | `chrome-extension/` | ✅ Production Active | Navigation & download event interceptor; zero-knowledge cookie auditor; 4 protection levels (Monitor, Warn, Block, Strict). |
| **Automated Test Suite** | `tests/` | ✅ 108/108 Passing (100%) | 19 Multimodal tests, 89 core security tests running in 1.82s under pytest. |

---

## 3. High-Value Open-Source Repositories to Connect With AgentGuard

To take AgentGuard from a local security suite to a comprehensive enterprise-grade AI defense platform, the following curated open-source repositories offer the highest synergy, categorized by domain:

### Category A: AI Security & Guardrails Frameworks

#### 1. [NVIDIA NeMo Guardrails](https://github.com/NVIDIA/NeMo-Guardrails)
* **What it is**: Open-source toolkit for adding programmable guardrails (Colang) to LLM-based applications.
* **Why it fits AgentGuard**:
  - AgentGuard currently has a deterministic Python policy engine (`ALLOWED_PAIRS`). NeMo Guardrails provides **Colang 2.0 flow control** to define multi-step conversational rails, preventing the agent from deviating into sensitive topics or off-limits execution flows.
  - Can sit directly between `MultimodalThreatReport` and the application dispatcher.
* **Integration Touchpoint**: `agentproof/policy_engine.py` can load NeMo Guardrail rails to validate sequential actions across multi-turn sessions.

#### 2. [Meta Llama Guard / Purple Llama](https://github.com/meta-llama/PurpleLlama)
* **What it is**: Open-weights safety classifier and cyber-security evaluation suite (CyberSecEval) for LLMs.
* **Why it fits AgentGuard**:
  - Provides standard classification taxonomies for prompt injection, insecure code execution, and software vulnerabilities.
  - Can serve as a secondary lightweight classifier alongside Gemma 4 to cross-verify visual findings against known CVE/CWE databases.
* **Integration Touchpoint**: `agentproof/ai_provider.py` can add a dual-check pipeline where Gemma 4 extracts UI features and Llama Guard checks for malicious intent.

#### 3. [Promptfoo](https://github.com/promptfoo/promptfoo)
* **What it is**: Open-source CLI and library for red-teaming, evaluating, and stress-testing LLM apps against prompt injection, jailbreaks, and SSRF.
* **Why it fits AgentGuard**:
  - AgentGuard already evaluates scenarios via `scenario_runner.py`. Connecting Promptfoo allows automated adversarial generation of screenshot steganography and visual prompt injections to stress-test Gemma 4.
* **Integration Touchpoint**: Create an AgentGuard plugin in `tests/adversarial/` executing Promptfoo datasets against `/api/multimodal/analyze`.

---

### Category B: Browser Sandbox & Dynamic Threat Hunting

#### 4. [Browser-Use](https://github.com/browser-use/browser-use) or [Playwright-Python](https://github.com/microsoft/playwright-python)
* **What it is**: Headless browser automation libraries designed for AI agents to navigate the web safely.
* **Why it fits AgentGuard**:
  - Right now, screenshots are uploaded manually or chosen via presets.
  - Adding headless Playwright execution on the backend enables **Autonomous URL Triage**: A user submits a suspicious URL $\rightarrow$ AgentGuard spawns an isolated containerized Chromium browser $\rightarrow$ captures a full-page high-res screenshot $\rightarrow$ records network/cookie telemetry $\rightarrow$ passes both image and DOM to Gemma 4.
* **Integration Touchpoint**: `agentproof/sandbox_browser.py` using Playwright in an ephemeral sandbox to feed `/api/multimodal/analyze`.

#### 5. [OpenPhish / URLhaus / PhishTank](https://github.com/MISP/PyMISP)
* **What it is**: Open-source threat intelligence feeds and MISP (Malware Information Sharing Platform) integration.
* **Why it fits AgentGuard**:
  - Gemma 4 correctly reports uncertainty regarding domain registration age and external IP reputation.
  - Integrating real-time feeds from URLhaus or MISP allows AgentGuard to corroborate visual findings with known zero-day malicious domain hashes.
* **Integration Touchpoint**: `agentproof/threat_intel.py` querying local Redis/SQLite cache of URLhaus blocklists before calling Gemma 4.

---

### Category C: Static File Analysis & Vault Intelligence

#### 6. [YARA-Python](https://github.com/VirusTotal/yara-python) & [YARA Rules](https://github.com/Yara-Rules/rules)
* **What it is**: The standard pattern-matching engine for malware researchers.
* **Why it fits AgentGuard**:
  - AgentGuard’s `file_scanner.py` currently inspects magic bytes and hashes. Adding YARA rules enables byte-level signature detection for ransomware, malicious PDF scripts, and trojan loaders before files reach the `quarantine_vault`.
* **Integration Touchpoint**: Hook into `agentproof/file_scanner.py` during `scan_file()` to evaluate compiled community YARA rulesets.

---

### Category D: LLM Serving & Model Routing

#### 7. [LiteLLM](https://github.com/BerriAI/litellm) / [vLLM](https://github.com/vllm-project/vllm)
* **What it is**: Unified OpenAI-compatible proxy supporting 100+ LLMs with automatic fallbacks, load balancing, and token-cost tracking.
* **Why it fits AgentGuard**:
  - If Google AI Studio rate limits or experiences downtime, LiteLLM can automatically fail over to a self-hosted vLLM instance serving `gemma-4-e4b-it` or `gemma-4-26b-a4b-it` without changing client code.
* **Integration Touchpoint**: Standardizes `agentproof/ai_provider.py` behind a high-availability proxy with budget and latency caps.

---

## 4. Integration Evaluation Matrix

| Open Source Repository | Primary Domain | Integration Effort | Security Value | Recommended Priority |
|:---|:---|:---:|:---:|:---:|
| **Playwright-Python** | Dynamic headless capture | Low (2–3 days) | ⭐⭐⭐⭐⭐ (Enables real-time URL screenshot scanning) | **Phase 1 (Immediate)** |
| **YARA-Python** | Host file inspection | Low (1–2 days) | ⭐⭐⭐⭐ (Empowers Desktop Quarantine Vault) | **Phase 1 (Immediate)** |
| **NVIDIA NeMo Guardrails** | Deterministic session rails | Medium (3–5 days) | ⭐⭐⭐⭐⭐ (Formalizes multi-step policy rules) | **Phase 2 (Near-Term)** |
| **Promptfoo** | Adversarial red-teaming | Low (1–2 days) | ⭐⭐⭐⭐ (Continuous CI/CD vulnerability benchmarks) | **Phase 2 (Near-Term)** |
| **URLhaus / MISP Open Feeds** | Domain reputation feed | Medium (2–3 days) | ⭐⭐⭐⭐ (Resolves Gemma 4 visual uncertainty) | **Phase 3 (Expansion)** |
| **LiteLLM / vLLM** | High-availability inference | Low (1 day) | ⭐⭐⭐ (Multi-provider cloud failover) | **Phase 3 (Expansion)** |

---

## 5. Phased Integration Plan for Selected Repositories

### Phase 1: Real-Time URL Screenshot Sandbox (Playwright + YARA)
1. **Playwright Integration**:
   - Add `agentproof/browser_sandbox.py` with an isolated headless Chromium instance.
   - When a user inputs a URL in the UI, Playwright visits the site with disabled cookies and no local storage access, snapshots the viewport, captures HTTP response headers, and passes the screenshot to `MultimodalAnalyzer`.
2. **YARA Integration**:
   - Package curated open-source rules (`misp-rules`, `antivirus-double-extension`) in `data/yara/`.
   - Run in `file_scanner.py` prior to quarantining files.

### Phase 2: Programmable Policy Governance (NeMo Guardrails + Promptfoo)
1. **NeMo Guardrails Integration**:
   - Define `.co` Colang files representing AgentGuard's security invariants.
   - Guard against prompt injection attacks attempting to induce tool execution.
2. **Promptfoo Security CI**:
   - Add automated GitHub Action running 50+ adversarial multimodal attack prompts to continuously evaluate Gemma 4’s resilience.

---

## 6. How Open Source Contributors Can Engage

This repository welcomes open-source collaboration in the following areas:
- **Rule Definitions**: Contributing Colang policies and deterministic allowlists.
- **Threat Fixtures**: Submitting sanitized screenshots of new phishing kits, scareware, and adversarial visual injections.
- **Provider Adapters**: Expanding `ai_provider.py` for additional open-weight multimodal models.
- **Extension Enhancements**: Hardening the Manifest V3 service worker against browser evasion techniques.
