import React from "react"
import {
  ShieldAlert,
  Play,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Spotlight } from "@/components/ui/spotlight"
import { SplineScene } from "@/components/ui/splite"
import { StatusBadge } from "@/components/ui/status-badge"
import { MetricCard } from "@/components/ui/metric-card"
import { EvaluationReport, EvaluationRunSummary, HealthInfo } from "@/types"

interface OverviewViewProps {
  latestReport: EvaluationReport | null
  runsHistory: EvaluationRunSummary[]
  health: HealthInfo | null
  onNavigateTab: (tab: string) => void
  onQuickRunBaseline: () => void
  isRunning: boolean
}

export function OverviewView({
  latestReport,
  runsHistory,
  health,
  onNavigateTab,
  onQuickRunBaseline,
  isRunning,
}: OverviewViewProps) {
  const metrics = latestReport?.summary_metrics
  const isOllamaConnected = health?.ollama?.connected ?? false

  return (
    <div className="space-y-6">
      {/* Premium Hero Panel with Spline 3D & Spotlight */}
      <Card className="relative w-full overflow-hidden border-[#263246] bg-[#0B0D12] shadow-2xl">
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" />

        <div className="grid min-h-[340px] grid-cols-1 md:grid-cols-2">
          {/* Left Text & Call-to-actions */}
          <div className="relative z-10 flex flex-col justify-center p-6 md:p-9">
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="rounded-full bg-[#8585FF]/10 border border-[#8585FF]/30 px-2.5 py-0.5 text-[11px] font-mono font-semibold uppercase text-[#8585FF] tracking-wider">
                Local AI Security
              </span>
              <span className="text-xs text-[#98A7BB] font-mono">v1.0.0</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#F1F5FB] md:text-3xl lg:text-4xl">
              Know what your agents are <span className="text-[#8585FF]">allowed</span> to do.
            </h1>

            <p className="mt-3 text-sm text-[#98A7BB] leading-relaxed max-w-xl">
              Deterministic, fail-closed policy enforcement for tool-using LLMs.
              Validate schemas, prevent unauthorized action execution, and prove model containment locally.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={onQuickRunBaseline}
                disabled={isRunning}
                className="inline-flex items-center gap-2 rounded-lg bg-[#8585FF] px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#8585FF]/20 hover:bg-[#7272F5] transition-all disabled:opacity-50"
              >
                <Play className="h-4 w-4 fill-current" />
                {isRunning ? "Running Evaluation..." : "Run Baseline Evaluation"}
              </button>

              <button
                onClick={() => onNavigateTab("multimodal")}
                className="inline-flex items-center gap-2 rounded-lg border border-[#4B8BF4]/40 bg-[#4B8BF4]/10 px-4 py-2.5 text-xs font-semibold text-[#4B8BF4] hover:bg-[#4B8BF4]/20 transition-all"
              >
                <Sparkles className="h-4 w-4" />
                Gemma 4 Multimodal
              </button>

              <button
                onClick={() => onNavigateTab("lab")}
                className="inline-flex items-center gap-2 rounded-lg border border-[#263246] bg-[#121925] px-4 py-2.5 text-xs font-semibold text-[#F1F5FB] hover:bg-[#182130] hover:border-[#3B4A63] transition-all"
              >
                Launch Lab
                <ArrowRight className="h-4 w-4 text-[#98A7BB]" />
              </button>
            </div>

            <div className="mt-6 border-t border-[#263246]/60 pt-4 flex items-center gap-4 text-xs font-mono text-[#98A7BB]">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#35C98A]"></span>
                Fail-Closed Engine
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${isOllamaConnected ? "bg-[#35C98A]" : "bg-[#F2B84B]"}`}></span>
                {isOllamaConnected ? "Ollama Active" : "Air-Gapped Mode"}
              </div>
            </div>
          </div>

          {/* Right Spline 3D Scene */}
            <SplineScene
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="h-full w-full"
            />
        </div>
      </Card>

      {/* Metrics Row */}
      {metrics ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <MetricCard
            label="Total Scenarios"
            value={metrics.total_scenarios}
            subtext={`Mode: ${latestReport?.metadata.evaluation_mode.toUpperCase()}`}
            icon={<Sparkles className="h-4 w-4" />}
          />
          <MetricCard
            label="Policy Accuracy"
            value={`${metrics.policy_accuracy_pct}%`}
            subtext={`${metrics.correct_decisions}/${metrics.valid_proposals} correct`}
            color="#35C98A"
            icon={<ShieldCheck className="h-4 w-4" />}
          />
          <MetricCard
            label="Proposals Permitted"
            value={`${metrics.allowed_actions} Allow / ${metrics.blocked_actions} Block`}
            subtext={`Auth Rate: ${metrics.authorization_rate_pct}%`}
            color="#55B9F5"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <MetricCard
            label="Schema Validity"
            value={`${metrics.proposal_validity_rate_pct}%`}
            subtext={`${metrics.valid_proposals}/${metrics.total_scenarios} valid JSON`}
            color="#8585FF"
            icon={<ShieldAlert className="h-4 w-4" />}
          />
          <MetricCard
            label="Evaluation Errors"
            value={metrics.total_errors}
            subtext={`${metrics.failure_rate_pct}% failure rate`}
            color={metrics.total_errors === 0 ? "#35C98A" : "#FF6577"}
            icon={<XCircle className="h-4 w-4" />}
          />
        </div>
      ) : (
        /* Empty State */
        <Card className="border-[#263246] bg-[#121925]/60 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#8585FF]/15 text-[#8585FF] border border-[#8585FF]/30 mb-3">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-[#F1F5FB]">No Evaluation Runs in Session</h3>
          <p className="mt-1 text-sm text-[#98A7BB] max-w-md mx-auto">
            Run a deterministic baseline evaluation to test the policy engine against the 4 core scenarios, or use Gemma 4 via Ollama.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={onQuickRunBaseline}
              disabled={isRunning}
              className="inline-flex items-center gap-2 rounded-lg bg-[#8585FF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7272F5] transition-all disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              {isRunning ? "Running..." : "Run Quick Baseline"}
            </button>
            <button
              onClick={() => onNavigateTab("scenarios")}
              className="rounded-lg border border-[#263246] bg-[#182130] px-4 py-2 text-xs font-semibold text-[#F1F5FB] hover:border-[#3B4A63] transition-all"
            >
              View Scenarios
            </button>
          </div>
        </Card>
      )}

      {/* Recent Evaluations Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#F1F5FB]">Evaluation Activity</h2>
          {runsHistory.length > 0 && (
            <button
              onClick={() => onNavigateTab("results")}
              className="text-xs text-[#8585FF] hover:underline flex items-center gap-1"
            >
              View all results <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {runsHistory.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#263246] bg-[#121925]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#263246] bg-[#0E131D] text-[#98A7BB] font-mono uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Run ID</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">Scenarios</th>
                  <th className="px-4 py-3">Accuracy</th>
                  <th className="px-4 py-3">Allowed / Blocked</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#263246]/60">
                {runsHistory.map((run) => (
                  <tr key={run.run_id} className="hover:bg-[#182130]/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-[#8585FF]">
                      {run.run_id}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={run.mode === "llm" ? "info" : "neutral"}>
                        {run.mode}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 font-mono text-[#98A7BB]">{run.model_name}</td>
                    <td className="px-4 py-3 font-mono">{run.scenario_count}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-[#35C98A]">
                        {run.accuracy_pct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[#98A7BB]">
                      <span className="text-[#35C98A]">{run.allowed_actions}A</span> /{" "}
                      <span className="text-[#FF6577]">{run.blocked_actions}B</span>
                    </td>
                    <td className="px-4 py-3 text-[#98A7BB] font-mono flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {run.timestamp.slice(11, 19)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-[#263246] bg-[#121925]/30 p-6 text-center text-xs text-[#98A7BB]">
            No runs recorded yet in this session.
          </div>
        )}
      </div>
    </div>
  )
}
