import React, { useState } from "react"
import {
  Play,
  RotateCcw,
  Cpu,
  Clock,
  CheckSquare,
  Square,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import { ModelsInfo, ScenarioModel, EvaluationReport } from "@/types"

interface EvaluationLabViewProps {
  scenarios: ScenarioModel[]
  modelsInfo: ModelsInfo | null
  onRunEvaluation: (params: {
    mode: "baseline" | "llm"
    model_name?: string
    timeout?: number
    scenario_ids?: string[]
  }) => Promise<void>
  isRunning: boolean
  latestReport: EvaluationReport | null
}

export function EvaluationLabView({
  scenarios,
  modelsInfo,
  onRunEvaluation,
  isRunning,
  latestReport,
}: EvaluationLabViewProps) {
  const [evalMode, setEvalMode] = useState<"baseline" | "llm">("baseline")
  const [selectedModel, setSelectedModel] = useState<string>(
    modelsInfo?.default_model || "gemma4:e2b-it-qat"
  )
  const [timeoutSec, setTimeoutSec] = useState<number>(60)
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>(
    scenarios.map((s) => s.id)
  )
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  const categories = ["all", ...Array.from(new Set(scenarios.map((s) => s.category)))]

  const filteredScenarios = scenarios.filter((s) =>
    categoryFilter === "all" ? true : s.category === categoryFilter
  )

  const handleToggleScenario = (id: string) => {
    setSelectedScenarioIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSelectAllVisible = () => {
    const visibleIds = filteredScenarios.map((s) => s.id)
    setSelectedScenarioIds((prev) => Array.from(new Set([...prev, ...visibleIds])))
  }

  const handleClearAll = () => {
    setSelectedScenarioIds([])
  }

  const handleStartRun = async () => {
    if (selectedScenarioIds.length === 0) return
    await onRunEvaluation({
      mode: evalMode,
      model_name: evalMode === "llm" ? selectedModel : undefined,
      timeout: timeoutSec,
      scenario_ids: selectedScenarioIds,
    })
  }

  const isOllamaConnected = modelsInfo?.connected ?? false

  return (
    <div className="space-y-6">
      {/* Header section matching 08_evaluation_lab.png */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F1F5FB] md:text-3xl">
              Evaluation Lab
            </h1>
            <span className="rounded border border-[#232F42] bg-[#10141D] px-2.5 py-0.5 text-[11px] font-mono font-medium uppercase tracking-wider text-[#98A7BB]">
              MODE: {evalMode === "llm" ? "LOCAL LLM" : "BASELINE"}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-[#98A7BB] max-w-3xl leading-relaxed md:text-sm">
            Configure evaluation parameters, choose target models, select security scenarios, and test deterministic policy containment.
          </p>
        </div>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Mode Selector */}
        <div className="rounded-xl border border-[#18202F] bg-[#0B0F17] p-5 shadow-sm space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#98A7BB]">
            Execution Mode
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setEvalMode("baseline")}
              className={`rounded-lg border px-3.5 py-2.5 text-xs font-medium text-left transition-all cursor-pointer ${
                evalMode === "baseline"
                  ? "border-[#8585FF] bg-[#8585FF]/15 text-[#F1F5FB] font-semibold shadow-[0_0_16px_rgba(133,133,255,0.12)]"
                  : "border-[#1A2333] bg-[#0E131D] text-[#98A7BB] hover:border-[#2D3C55] hover:bg-[#131B29]"
              }`}
            >
              <div className="font-semibold text-[#F1F5FB]">Deterministic</div>
              <div className="text-[10px] text-[#98A7BB] mt-0.5">Baseline (No LLM)</div>
            </button>

            <button
              type="button"
              onClick={() => setEvalMode("llm")}
              disabled={!isOllamaConnected}
              className={`rounded-lg border px-3.5 py-2.5 text-xs font-medium text-left transition-all ${
                evalMode === "llm"
                  ? "border-[#8585FF] bg-[#8585FF]/15 text-[#F1F5FB] font-semibold shadow-[0_0_16px_rgba(133,133,255,0.12)]"
                  : "border-[#1A2333] bg-[#0E131D] text-[#98A7BB] hover:border-[#2D3C55] hover:bg-[#131B29]"
              } ${!isOllamaConnected ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="font-semibold text-[#F1F5FB]">Local LLM</div>
              <div className="text-[10px] text-[#98A7BB] mt-0.5">Ollama / Gemma 4</div>
            </button>
          </div>
          {!isOllamaConnected && (
            <div className="text-[11px] text-[#F2B84B] flex items-center gap-1.5 pt-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Ollama offline. Start 'ollama serve' for LLM mode.</span>
            </div>
          )}
        </div>

        {/* Model Selection */}
        <div className="rounded-xl border border-[#18202F] bg-[#0B0F17] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#98A7BB]">
              Target Model
            </span>
            <Cpu className="h-3.5 w-3.5 text-[#8585FF]" />
          </div>

          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={evalMode === "baseline" || !isOllamaConnected}
              aria-label="Target Model"
              className="w-full rounded-lg border border-[#1A2333] bg-[#0E131D] px-3.5 py-2.5 text-xs text-[#F1F5FB] font-mono focus:border-[#8585FF] focus:outline-none disabled:opacity-50 transition-all cursor-pointer"
            >
              {modelsInfo?.models && modelsInfo.models.length > 0 ? (
                modelsInfo.models.map((m) => (
                  <option key={m} value={m} className="bg-[#0E131D] text-[#F1F5FB]">
                    {m}
                  </option>
                ))
              ) : (
                <option value="gemma4:e2b-it-qat" className="bg-[#0E131D] text-[#F1F5FB]">
                  gemma4:e2b-it-qat
                </option>
              )}
            </select>
          </div>
          <div className="text-[11px] text-[#98A7BB] font-mono">
            Temperature: 0.0 (Reproducible proposals)
          </div>
        </div>

        {/* Timeout Bounds */}
        <div className="rounded-xl border border-[#18202F] bg-[#0B0F17] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#98A7BB]">
              Request Timeout
            </span>
            <Clock className="h-3.5 w-3.5 text-[#8585FF]" />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <input
              type="range"
              min={5}
              max={180}
              step={5}
              value={timeoutSec}
              onChange={(e) => setTimeoutSec(Number(e.target.value))}
              disabled={evalMode === "baseline"}
              aria-label="Request Timeout"
              className="security-slider w-full cursor-pointer disabled:opacity-50"
            />
            <span className="font-mono text-xs font-bold text-[#F1F5FB] w-12 text-right shrink-0">
              {timeoutSec}s
            </span>
          </div>
          <div className="text-[11px] text-[#98A7BB]">
            Fails closed if the model exceeds deadline.
          </div>
        </div>
      </div>

      {/* Scenario Selection Header & Grid */}
      <div className="rounded-xl border border-[#18202F] bg-[#0B0F17] overflow-hidden shadow-sm">
        {/* Animated running progress bar */}
        {isRunning && (
          <div className="h-1 w-full overflow-hidden bg-[#18202F]">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-[#8585FF] to-transparent animate-pulse" />
          </div>
        )}

        <div className="border-b border-[#18202F] p-4 flex flex-wrap items-center justify-between gap-3 bg-[#0E131D]">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F1F5FB]">
              SCENARIOS ({selectedScenarioIds.length} OF {scenarios.length} SELECTED)
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="text-xs text-[#8585FF] hover:text-[#9E9EFF] hover:underline flex items-center gap-1.5 font-sans font-medium transition-colors cursor-pointer"
              >
                <CheckSquare className="h-3.5 w-3.5" /> Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-[#98A7BB] hover:text-[#F1F5FB] hover:underline flex items-center gap-1.5 font-sans font-medium transition-colors cursor-pointer"
              >
                <Square className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
              className="rounded-lg border border-[#1A2333] bg-[#0B0F17] px-3 py-1.5 text-xs text-[#F1F5FB] font-mono focus:border-[#8585FF] focus:outline-none transition-all cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-[#0B0F17] text-[#F1F5FB]">
                  Category: {cat}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleStartRun}
              disabled={isRunning || selectedScenarioIds.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#8585FF] hover:bg-[#7272F5] px-4.5 py-1.5 text-xs font-bold text-white shadow-md shadow-[#8585FF]/20 hover:shadow-[#8585FF]/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Run {selectedScenarioIds.length} Selected</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scenarios Grid */}
        <div className="p-4 sm:p-5">
          {filteredScenarios.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#98A7BB] font-mono">
              No security scenarios match the selected category.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {filteredScenarios.map((sc) => {
                const isChecked = selectedScenarioIds.includes(sc.id)
                return (
                  <div
                    key={sc.id}
                    onClick={() => handleToggleScenario(sc.id)}
                    className={`relative flex cursor-pointer items-start gap-3.5 rounded-lg border p-3.5 transition-all duration-150 ${
                      isChecked
                        ? "border-[#8585FF]/45 bg-[#8585FF]/[0.08] text-[#F1F5FB] shadow-[0_0_15px_rgba(133,133,255,0.06)]"
                        : "border-[#18202F] bg-[#0E131D]/80 text-[#98A7BB] hover:border-[#2D3C55] hover:bg-[#0E131D]"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isChecked ? (
                        <CheckSquare className="h-4 w-4 text-[#8585FF]" />
                      ) : (
                        <Square className="h-4 w-4 text-[#263246]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-[#F1F5FB] tracking-tight">
                          {sc.id}
                        </span>
                        {sc.expected_allowed ? (
                          <span className="rounded border border-[#35C98A]/30 bg-[#35C98A]/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-[#35C98A] uppercase tracking-wider shrink-0">
                            EXPECT ALLOW
                          </span>
                        ) : (
                          <span className="rounded border border-[#FF6577]/30 bg-[#FF6577]/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-[#FF6577] uppercase tracking-wider shrink-0">
                            EXPECT BLOCK
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[#98A7BB] line-clamp-2 leading-relaxed">
                        {sc.description}
                      </p>
                      <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono text-[#98A7BB]">
                        <span className="text-[#8585FF] font-medium">{sc.action}</span>
                        <span className="text-[#475569]">&rarr;</span>
                        <span className="text-[#55B9F5] font-medium">{sc.target}</span>
                        <span className="text-[#263246]">|</span>
                        <span>{sc.category}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Completion Summary Table */}
      {latestReport && (
        <div className="space-y-3 mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm md:text-base font-semibold text-[#F1F5FB] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#35C98A]" />
              <span>Latest Run Results ({latestReport.metadata.run_id})</span>
            </h3>
            <span className="rounded-md border border-[#35C98A]/30 bg-[#35C98A]/10 px-2.5 py-1 text-xs font-mono font-semibold text-[#35C98A]">
              Accuracy: {latestReport.summary_metrics.policy_accuracy_pct}%
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#18202F] bg-[#0B0F17] shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#18202F] bg-[#0E131D] text-[#98A7BB] font-mono uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Scenario</th>
                  <th className="px-4 py-3">Proposed Action & Target</th>
                  <th className="px-4 py-3">Policy Verdict</th>
                  <th className="px-4 py-3">Expected</th>
                  <th className="px-4 py-3">Correct</th>
                  <th className="px-4 py-3">Intent Match</th>
                  <th className="px-4 py-3">Mock Tool Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18202F]/60">
                {latestReport.results.map((r) => (
                  <tr key={r.scenario_id} className="hover:bg-[#121926]/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-[#F1F5FB]">
                      {r.scenario_id}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#98A7BB]">
                      <span className="text-[#8585FF]">{r.proposed_action || "None"}</span>
                      {" "}&rarr;{" "}
                      <span className="text-[#55B9F5]">{r.proposed_target || "None"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {r.policy_allowed ? (
                        <span className="rounded border border-[#35C98A]/30 bg-[#35C98A]/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-[#35C98A] uppercase tracking-wider">
                          ALLOWED
                        </span>
                      ) : (
                        <span className="rounded border border-[#FF6577]/30 bg-[#FF6577]/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-[#FF6577] uppercase tracking-wider">
                          BLOCKED
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.expected_allowed ? (
                        <span className="rounded border border-[#35C98A]/30 bg-[#35C98A]/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-[#35C98A] uppercase tracking-wider">
                          ALLOW
                        </span>
                      ) : (
                        <span className="rounded border border-[#FF6577]/30 bg-[#FF6577]/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-[#FF6577] uppercase tracking-wider">
                          BLOCK
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {r.policy_correct ? (
                        <span className="text-[#35C98A]">✅ Match</span>
                      ) : (
                        <span className="text-[#FF6577]">❌ Disagree</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {r.intent_match ? (
                        <span className="text-[#35C98A]">✅ Match</span>
                      ) : (
                        <span className="text-[#F2B84B]">⚠️ Drift</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {r.tool_success ? (
                        <span className="text-[#35C98A]">Executed (Mock)</span>
                      ) : (
                        <span className="text-[#98A7BB]">Blocked (Simulated)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
