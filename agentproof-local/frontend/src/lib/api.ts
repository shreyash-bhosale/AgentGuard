import {
  EvaluationReport,
  EvaluationRunSummary,
  HealthInfo,
  ModelsInfo,
  SavedReportInfo,
  ScenarioModel,
  PolicyRulesInfo,
  PolicySimulationResult,
  GlossaryItem,
  RunComparison,
  AIReadinessInfo,
  MultimodalAnalysisResponse,
} from "@/types"

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "")
const API_BASE = RAW_BASE
  ? (RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`)
  : "/api"

export async function fetchHealth(): Promise<HealthInfo> {
  const res = await fetch(`${API_BASE}/health`)
  if (!res.ok) throw new Error(`Health check failed: HTTP ${res.status}`)
  return res.json()
}

export async function fetchAiReadiness(provider?: string): Promise<AIReadinessInfo> {
  const url = provider ? `${API_BASE}/ai/readiness?provider=${encodeURIComponent(provider)}` : `${API_BASE}/ai/readiness`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`AI readiness check failed: HTTP ${res.status}`)
  return res.json()
}

export async function analyzeMultimodalScreenshot(
  formData: FormData,
  timeoutMs: number = 60000
): Promise<MultimodalAnalysisResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${API_BASE}/multimodal/analyze`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(errorBody.detail || `Threat analysis failed: HTTP ${res.status}`)
    }
    return res.json()
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === "AbortError") {
      throw new Error(`Inference request timed out after ${timeoutMs / 1000}s. Cloud inference may be experiencing high latency.`)
    }
    throw err
  }
}


export async function fetchModels(): Promise<ModelsInfo> {
  const res = await fetch(`${API_BASE}/models`)
  if (!res.ok) throw new Error(`Fetch models failed: HTTP ${res.status}`)
  return res.json()
}

export async function fetchScenarios(category?: string): Promise<ScenarioModel[]> {
  const url = category ? `${API_BASE}/scenarios?category=${encodeURIComponent(category)}` : `${API_BASE}/scenarios`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch scenarios failed: HTTP ${res.status}`)
  return res.json()
}

export async function addCustomScenario(scenario: {
  id: string
  description: string
  action: string
  target: string
  rationale: string
  expected_allowed: boolean
  category: string
}): Promise<{ success: boolean; scenario: ScenarioModel }> {
  const res = await fetch(`${API_BASE}/scenarios/custom`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scenario),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || "Failed to create custom scenario")
  }
  return res.json()
}

export async function runEvaluation(payload: {
  mode: "baseline" | "llm"
  model_name?: string
  timeout?: number
  scenario_ids?: string[]
}): Promise<EvaluationReport> {
  const res = await fetch(`${API_BASE}/evaluations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || "Evaluation execution failed")
  }
  return res.json()
}

export async function fetchEvaluations(): Promise<EvaluationRunSummary[]> {
  const res = await fetch(`${API_BASE}/evaluations`)
  if (!res.ok) throw new Error(`Fetch evaluations failed: HTTP ${res.status}`)
  return res.json()
}

export async function fetchEvaluationDetail(run_id: string): Promise<EvaluationReport> {
  const res = await fetch(`${API_BASE}/evaluations/${encodeURIComponent(run_id)}`)
  if (!res.ok) throw new Error(`Fetch run detail failed: HTTP ${res.status}`)
  return res.json()
}

export async function saveReportDisk(run_id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(run_id)}/save`, {
    method: "POST",
  })
  if (!res.ok) throw new Error(`Save report failed: HTTP ${res.status}`)
  return res.json()
}

export async function fetchSavedReports(): Promise<SavedReportInfo[]> {
  const res = await fetch(`${API_BASE}/reports`)
  if (!res.ok) throw new Error(`Fetch saved reports failed: HTTP ${res.status}`)
  return res.json()
}

export function getReportDownloadUrl(run_id: string, format: "json" | "csv" | "markdown"): string {
  return `${API_BASE}/reports/${encodeURIComponent(run_id)}/${format}`
}

export async function fetchPolicyRules(): Promise<PolicyRulesInfo> {
  const res = await fetch(`${API_BASE}/policy`)
  if (!res.ok) throw new Error(`Fetch policy rules failed: HTTP ${res.status}`)
  return res.json()
}

export async function simulatePolicy(payload: {
  action: string
  target: string
  rationale?: string
}): Promise<PolicySimulationResult> {
  const res = await fetch(`${API_BASE}/policy/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Policy simulation failed: HTTP ${res.status}`)
  return res.json()
}

export async function fetchGlossary(): Promise<GlossaryItem[]> {
  const res = await fetch(`${API_BASE}/glossary`)
  if (!res.ok) throw new Error(`Fetch glossary failed: HTTP ${res.status}`)
  return res.json()
}

export async function compareRuns(runA: string, runB: string): Promise<RunComparison> {
  const res = await fetch(`${API_BASE}/evaluations/compare?run_a=${encodeURIComponent(runA)}&run_b=${encodeURIComponent(runB)}`)
  if (!res.ok) throw new Error(`Compare runs failed: HTTP ${res.status}`)
  return res.json()
}

export async function clearEvaluations(): Promise<{ success: boolean; cleared_count: number }> {
  const res = await fetch(`${API_BASE}/evaluations`, { method: "DELETE" })
  if (!res.ok) throw new Error(`Clear evaluations failed: HTTP ${res.status}`)
  return res.json()
}

export async function clearCustomScenarios(): Promise<{ success: boolean; cleared_count: number }> {
  const res = await fetch(`${API_BASE}/scenarios/custom`, { method: "DELETE" })
  if (!res.ok) throw new Error(`Clear custom scenarios failed: HTTP ${res.status}`)
  return res.json()
}

