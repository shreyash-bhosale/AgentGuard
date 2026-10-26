export interface ScenarioModel {
  id: string
  description: string
  action: string
  target: string
  rationale: string
  expected_allowed: boolean
  category: string
}

export interface ActionProposal {
  action: "read_demo_record" | "export_demo_data" | "delete_demo_data" | string
  target: "demo_record" | "production_database" | string
  rationale: string
}

export interface MockToolResult {
  success: boolean
  simulated: boolean
  result?: Record<string, any>
  error?: string
}

export interface EvaluationResult {
  scenario_id: string
  description: string
  category: string
  evaluation_mode: "baseline" | "llm"
  model_name: string

  expected_action: string
  expected_target: string
  expected_allowed: boolean

  proposal?: ActionProposal | null
  proposed_action?: string | null
  proposed_target?: string | null
  proposed_rationale?: string | null

  proposal_valid: boolean
  intent_match: boolean
  policy_allowed: boolean
  policy_reason: string
  policy_correct: boolean

  tool_result?: MockToolResult | null
  tool_success: boolean

  error_type?: string | null
  error_message?: string | null
  duration_ms: number
  timestamp: string
}

export interface SummaryMetrics {
  total_scenarios: number
  successful_executions: number
  valid_proposals: number
  proposal_validity_rate_pct: number
  correct_decisions: number
  incorrect_decisions: number
  policy_accuracy_pct: number
  allowed_actions: number
  blocked_actions: number
  authorization_rate_pct: number
  intent_matches: number
  intent_match_rate_pct: number
  model_failures: number
  schema_validation_failures: number
  mock_tool_failures: number
  total_errors: number
  failure_rate_pct: number
  error_breakdown: Record<string, number>
  category_breakdown: Record<string, {
    total: number
    correct: number
    allowed: number
    blocked: number
    errors: number
  }>
  average_duration_ms: number
}

export interface EvaluationReport {
  metadata: {
    run_id: string
    timestamp: string
    application: string
    version: string
    evaluation_mode: string
    model_name: string
    scenario_count: number
  }
  metric_definitions: Record<string, string>
  summary_metrics: SummaryMetrics
  results: EvaluationResult[]
}

export interface EvaluationRunSummary {
  run_id: string
  timestamp: string
  mode: string
  model_name: string
  scenario_count: number
  accuracy_pct: number
  allowed_actions: number
  blocked_actions: number
  total_errors: number
}

export interface HealthInfo {
  status: string
  version: string
  backend: string
  ollama: {
    connected: boolean
    url: string
    models: string[]
    model_count: number
    error?: string | null
  }
  default_model: string
  timestamp: string
}

export interface ModelsInfo {
  connected: boolean
  models: string[]
  default_model: string
  model_count: number
  error?: string | null
}

export interface SavedReportInfo {
  filename: string
  filepath: string
  run_id: string
  timestamp: string
  mode: string
  model: string
  scenarios: number
  accuracy: number
  size_kb: number
}

export interface PolicyRulesInfo {
  engine_type: string
  default_verdict: string
  allowed_pairs: Array<{ action: string; target: string }>
  blocked_actions: string[]
  blocked_targets: string[]
  invariants: string[]
}

export interface PolicySimulationResult {
  schema_valid: boolean
  validation_error: string | null
  policy_allowed: boolean
  policy_reason: string
  action?: string
  tool_result: MockToolResult
}

export interface GlossaryItem {
  term: string
  category: string
  definition: string
  why_it_matters: string
  agentproof_implementation: string
}

export interface RunComparison {
  run_a: {
    run_id: string
    mode: string
    model: string
    metrics: SummaryMetrics
  }
  run_b: {
    run_id: string
    mode: string
    model: string
    metrics: SummaryMetrics
  }
  delta: {
    accuracy_pct: number
    allowed_actions: number
    blocked_actions: number
    total_errors: number
    validity_rate_pct: number
  }
}

export interface MultimodalThreatReport {
  summary: string
  observed_indicators: string[]
  suspicious_elements: string[]
  supporting_evidence: string[]
  uncertainty: string
  recommended_user_action: string
  hypothesized_threat_type: string
  model_confidence: number
}

export interface MultimodalAnalysisResponse {
  success: boolean
  threat_report?: MultimodalThreatReport
  risk_assessment: {
    score: number
    level: "Low" | "Medium" | "High" | "Critical"
    risk_level: string
    recommendation: string
    critical_override: boolean
    critical_reasons?: string[]
    findings_count: number
    findings: Array<{
      id: string
      title: string
      category: string
      severity: string
      weight: number
      evidence: string
      remediation: string
      isCriticalOverride: boolean
      verified: boolean
      source: string
    }>
    category_scores: {
      technical: number
      security: number
      privacy: number
      unverified: number
    }
    explanation: string
  }
  policy_decision: {
    allowed: boolean
    reason: string
    action: string
  }
  policy_scope_notice?: string
  provider_metadata: {
    provider: string
    model: string
    cloud_hosted: boolean
    endpoint?: string
    duration_ms?: number
    attempts?: number
  }
  image_metadata: {
    original_filename: string
    format: string
    mime_type: string
    original_size_bytes: number
    normalized_size_bytes: number
    original_dimensions: [number, number]
    final_dimensions: [number, number]
    resized: boolean
  }
  error?: string
}

export interface AIReadinessInfo {
  status: "ready" | "unavailable"
  details: {
    available: boolean
    provider: string
    cloud_hosted: boolean
    model: string
    configured: boolean
    display_name?: string
    endpoint?: string
    models?: string[]
    error?: string | null
  }
}
