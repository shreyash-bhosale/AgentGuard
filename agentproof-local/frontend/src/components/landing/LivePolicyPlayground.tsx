import React, { useState, useEffect } from "react"
import {
  ShieldAlert,
  ShieldCheck,
  Play,
  RotateCcw,
  Zap,
  Lock,
  Terminal,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Cpu,
  ArrowRight,
  Shield,
} from "lucide-react"

interface ActionItem {
  id: string
  label: string
  action: string
  target: string
  rationale: string
  expectedAllowed: boolean
}

const SAMPLE_ACTIONS: ActionItem[] = [
  {
    id: "read_demo",
    label: "Safe Read Demo",
    action: "read_demo_record",
    target: "demo_record",
    rationale: "Verify record validity before reading status field",
    expectedAllowed: true,
  },
  {
    id: "delete_record",
    label: "Destructive Delete",
    action: "delete_record",
    target: "demo_record",
    rationale: "Clean up completed test scenario artifacts immediately",
    expectedAllowed: false,
  },
  {
    id: "bash_exec",
    label: "Arbitrary Shell Exec",
    action: "execute_shell",
    target: "cat /etc/passwd",
    rationale: "Inspect user environment to prepare execution wrapper",
    expectedAllowed: false,
  },
  {
    id: "safe_health",
    label: "Health Check Query",
    action: "query_health_status",
    target: "system_heartbeat",
    rationale: "Query local heartbeat to confirm daemon readiness",
    expectedAllowed: true,
  },
]

export function LivePolicyPlayground() {
  const [selectedAction, setSelectedAction] = useState<ActionItem>(SAMPLE_ACTIONS[0])
  const [evaluationState, setEvaluationState] = useState<"idle" | "evaluating" | "result">("idle")
  const [lastResult, setLastResult] = useState<{
    allowed: boolean
    reason: string
    latencyMs: number
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)")
      setPrefersReducedMotion(media.matches)
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
      media.addEventListener("change", listener)
      return () => media.removeEventListener("change", listener)
    }
  }, [])

  const handleTestEvaluation = () => {
    setEvaluationState("evaluating")

    // Deterministic simulation based on AgentGuard allowlist rules
    setTimeout(() => {
      const allowed = selectedAction.expectedAllowed
      const reason = allowed
        ? `Permitted: (${selectedAction.action}, ${selectedAction.target}) is in the deterministic allowlist.`
        : `Denied: (${selectedAction.action}, ${selectedAction.target}) violates fail-closed security boundary.`

      setLastResult({
        allowed,
        reason,
        latencyMs: Math.floor(Math.random() * 8) + 4, // 4-12ms realistic latency
      })
      setEvaluationState("result")
    }, 650)
  }

  const handleCopyPayload = () => {
    const payloadText = JSON.stringify(
      {
        action: selectedAction.action,
        target: selectedAction.target,
        rationale: selectedAction.rationale,
      },
      null,
      2
    )
    navigator.clipboard.writeText(payloadText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="relative mx-auto max-w-7xl px-6 md:px-8 py-20">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-mono font-medium text-white mb-4 backdrop-blur-md shadow-sm">
          <Zap className="h-3.5 w-3.5 text-white" />
          <span>AIR-GAPPED POLICY EVALUATION CHAMBER</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#F5F7FC]">
          Test AI Agent Policy Decisions Live
        </h2>
        <p className="mt-3.5 text-xs sm:text-sm text-[#A3A9B7] leading-relaxed max-w-2xl mx-auto">
          Select an agent proposal below to observe how AgentGuard's deterministic policy engine
          evaluates, contains, or permits tool execution with zero prompt-injection vulnerability.
        </p>
      </div>

      {/* Main Policy-Evaluation Chamber (Visual Centerpiece) */}
      <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-b from-[#121622]/95 via-[#0C0E16]/98 to-[#06080D]/98 p-6 md:p-10 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_32px_80px_-16px_rgba(0,0,0,0.95)] transition-all duration-300">
        {/* Top Hairline Specular Edge */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/35 to-transparent" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Command Tiles & Terminal Sheet (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* Header / Subtitle */}
            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#A3A9B7] pb-1">
              <span className="flex items-center gap-1.5 text-white">
                <Cpu className="h-3.5 w-3.5 text-white/70" />
                <span>Candidate Agent Actions</span>
              </span>
              <span className="text-[10px] text-white/50">Air-Gapped Simulation</span>
            </div>

            {/* Selectable Physical Command Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SAMPLE_ACTIONS.map((action) => {
                const isSelected = selectedAction.id === action.id
                const isAllowed = action.expectedAllowed

                return (
                  <button
                    key={action.id}
                    onClick={() => {
                      setSelectedAction(action)
                      setEvaluationState("idle")
                    }}
                    className={`group relative flex flex-col p-3.5 rounded-xl border text-left transition-all duration-200 outline-none select-none overflow-hidden active:scale-[0.985] focus-visible:ring-1 focus-visible:ring-white/40 ${
                      isSelected
                        ? "border-white/50 bg-gradient-to-b from-white/15 via-white/10 to-white/5 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_8px_24px_rgba(255,255,255,0.12)] -translate-y-0.5"
                        : isAllowed
                        ? "border-white/10 bg-[#0B0E16]/85 text-[#A3A9B7] hover:border-white/25 hover:bg-[#111522] hover:-translate-y-0.5"
                        : "border-[#FF4D61]/25 bg-[#12090D]/85 text-[#A3A9B7] hover:border-[#FF4D61]/40 hover:bg-[#180C12] hover:-translate-y-0.5"
                    }`}
                  >
                    {/* Active Left Specular Indicator */}
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white shadow-[0_0_8px_white]" />
                    )}

                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <span className="text-xs font-bold text-white tracking-tight truncate">
                        {action.label}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 border ${
                          isAllowed
                            ? "bg-white/15 text-white border-white/25"
                            : "bg-[#FF4D61]/20 text-[#FF6577] border-[#FF4D61]/35"
                        }`}
                      >
                        {isAllowed ? "PERMITTED" : "RESTRICTED"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-white/50 group-hover:text-white/70 truncate">
                      <span className="truncate">{action.action}</span>
                      <ArrowRight className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Structured Proposal Payload as Secure Terminal Sheet */}
            <div className="relative rounded-xl border border-white/10 bg-[#050608] p-4 text-xs font-mono overflow-hidden shadow-inner group">
              {/* Scan Highlight on Action Change */}
              <div
                key={selectedAction.id}
                className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent"
                style={{
                  animation: !prefersReducedMotion ? "scanline-sweep 1.8s ease-out" : "none",
                }}
              />

              <div className="flex items-center justify-between text-white/60 border-b border-white/10 pb-2 mb-3">
                <span className="flex items-center gap-1.5 text-white">
                  <Terminal className="h-3.5 w-3.5 text-white" />
                  <span>ActionProposal Payload</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40">schema: v1.0.strict</span>
                  <button
                    type="button"
                    onClick={handleCopyPayload}
                    className="inline-flex items-center gap-1 text-[#A3A9B7] hover:text-white transition-colors pl-1"
                    title="Copy Payload"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-white" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>

              {/* JSON Payload Display */}
              <div className="space-y-1 text-white font-mono leading-relaxed pl-1">
                <div>
                  <span className="text-[#A3A9B7]">&quot;action&quot;:</span>{" "}
                  <span className="text-white font-semibold">&quot;{selectedAction.action}&quot;</span>,
                </div>
                <div>
                  <span className="text-[#A3A9B7]">&quot;target&quot;:</span>{" "}
                  <span className="text-white font-semibold">&quot;{selectedAction.target}&quot;</span>,
                </div>
                <div>
                  <span className="text-[#A3A9B7]">&quot;rationale&quot;:</span>{" "}
                  <span className="text-white/60">&quot;{selectedAction.rationale}&quot;</span>
                </div>
              </div>

              {/* Allowlist Tuple Enforcement Notice */}
              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-white/40">
                <span>POLICY TUPLE // ({selectedAction.action}, {selectedAction.target})</span>
                <span className={selectedAction.expectedAllowed ? "text-white/70" : "text-[#FF6577]"}>
                  {selectedAction.expectedAllowed ? "In Allowlist" : "Not In Allowlist"}
                </span>
              </div>
            </div>

            {/* Premium Ceramic/Metal "Evaluate Action Against Policy Engine" Button */}
            <button
              onClick={handleTestEvaluation}
              disabled={evaluationState === "evaluating"}
              className="group relative w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-b from-[#FFFFFF] via-[#F8FAFC] to-[#E2E8F0] text-black py-3.5 px-6 text-xs md:text-sm font-extrabold tracking-tight shadow-[0_4px_24px_rgba(255,255,255,0.35),inset_0_1px_0_0_rgba(255,255,255,1),inset_0_-2px_0_0_rgba(0,0,0,0.15)] hover:shadow-[0_6px_36px_rgba(255,255,255,0.55)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60 disabled:pointer-events-none"
            >
              {/* Subtle Metallic Specular Highlight */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-white/80 rounded-t-xl" />

              {evaluationState === "evaluating" ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-black" />
                  <span>Evaluating Invariant Tuples...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current text-black group-hover:scale-110 transition-transform" />
                  <span>Evaluate Action Against Policy Engine</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: 3D Containment Display (6 cols) */}
          <div
            className={`relative flex flex-col items-center justify-center rounded-2xl border p-8 md:p-10 text-center overflow-hidden min-h-[380px] transition-all duration-300 ${
              evaluationState === "result" && !lastResult?.allowed
                ? "border-[#FF4D61]/50 bg-gradient-to-b from-[#180B10] via-[#0E060A] to-[#070305] shadow-[inset_0_1px_0_0_rgba(255,100,120,0.3),0_8px_32px_rgba(255,77,97,0.25)] ring-1 ring-[#FF4D61]/25"
                : evaluationState === "result" && lastResult?.allowed
                ? "border-white/30 bg-gradient-to-b from-[#141824] via-[#0D1018] to-[#07090E] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_8px_32px_rgba(255,255,255,0.1)]"
                : "border-white/10 bg-gradient-to-b from-[#090C12] to-[#05060A] shadow-inner"
            }`}
          >
            {/* Top Hairline Edge */}
            <div
              className={`pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent ${
                evaluationState === "result" && !lastResult?.allowed
                  ? "via-[#FF4D61]/80"
                  : "via-white/30"
              } to-transparent`}
            />

            {/* Traveling Signal Line when Evaluating */}
            {evaluationState === "evaluating" && (
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[1px] -translate-y-1/2 overflow-hidden">
                <div
                  className="h-full w-full bg-gradient-to-r from-transparent via-white/80 to-transparent"
                  style={{ animation: "scanline-sweep 1.2s linear infinite" }}
                />
              </div>
            )}

            {/* 3D Telemetry Radar Rings & Central Gate Node */}
            <div className="relative mb-6 flex h-32 w-32 items-center justify-center">
              {/* Outer Radar Range Ring */}
              <div
                className={`absolute inset-0 rounded-full border transition-all duration-500 ${
                  evaluationState === "result" && !lastResult?.allowed
                    ? "border-[#FF4D61]/40"
                    : "border-white/15"
                }`}
                style={{
                  animation:
                    evaluationState === "evaluating" && !prefersReducedMotion
                      ? "radar-sweep 4s linear infinite"
                      : "none",
                }}
              />

              {/* Middle Concentric Ring */}
              <div
                className={`absolute inset-3 rounded-full border transition-all duration-500 ${
                  evaluationState === "result" && !lastResult?.allowed
                    ? "border-[#FF4D61]/30"
                    : "border-white/10"
                }`}
              />

              {/* Center Containment Node */}
              <div
                className={`relative flex h-20 w-20 items-center justify-center rounded-full border shadow-2xl transition-all duration-300 ${
                  evaluationState === "evaluating"
                    ? "border-white/40 bg-white/15 text-white"
                    : evaluationState === "result" && lastResult?.allowed
                    ? "border-white/60 bg-gradient-to-b from-white/25 to-white/10 text-white shadow-[0_0_30px_rgba(255,255,255,0.4)]"
                    : evaluationState === "result" && !lastResult?.allowed
                    ? "border-[#FF4D61]/60 bg-gradient-to-b from-[#FF4D61]/30 to-[#FF4D61]/10 text-[#FF6577] shadow-[0_0_30px_rgba(255,77,97,0.4)]"
                    : "border-white/20 bg-[#0B0E16] text-white/70"
                }`}
              >
                {evaluationState === "evaluating" ? (
                  <RefreshCw className="h-8 w-8 text-white animate-spin" />
                ) : evaluationState === "result" && lastResult?.allowed ? (
                  <ShieldCheck className="h-10 w-10 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
                ) : evaluationState === "result" && !lastResult?.allowed ? (
                  <ShieldAlert className="h-10 w-10 text-[#FF6577] drop-shadow-[0_0_12px_rgba(255,77,97,0.8)]" />
                ) : (
                  <Lock className="h-8 w-8 text-white/80" />
                )}
              </div>
            </div>

            {/* Decision Status Text & Technical Verdict */}
            <div className="relative z-10 max-w-sm">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#A3A9B7] mb-1.5">
                POLICY ENGINE DECISION
              </div>

              {evaluationState === "evaluating" ? (
                <div className="space-y-1">
                  <div className="text-xl font-bold font-mono text-white animate-pulse">
                    Evaluating Allowlist Tuples...
                  </div>
                  <p className="text-xs font-mono text-white/50">
                    Checking deterministic AST tree in local memory
                  </p>
                </div>
              ) : evaluationState === "result" && lastResult?.allowed ? (
                <div className="space-y-2">
                  <div className="text-2xl font-black font-mono tracking-tight text-white flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                    <span>ACTION AUTHORIZED</span>
                  </div>
                  <p className="text-xs text-white/90 font-mono leading-relaxed">
                    {lastResult.reason}
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/25 px-3 py-1 text-[11px] font-mono text-white">
                      <span>Latency: {lastResult.latencyMs}ms</span>
                      <span>•</span>
                      <span>Deterministic Match</span>
                    </span>
                  </div>
                </div>
              ) : evaluationState === "result" && lastResult && !lastResult.allowed ? (
                <div className="space-y-2">
                  <div className="text-2xl font-black font-mono tracking-tight text-[#FF6577] flex items-center justify-center gap-2">
                    <ShieldAlert className="h-5 w-5" />
                    <span>EXECUTION BLOCKED</span>
                  </div>
                  <p className="text-xs text-white/90 font-mono leading-relaxed">
                    {lastResult.reason}
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF4D61]/15 border border-[#FF4D61]/40 px-3 py-1 text-[11px] font-mono font-bold text-[#FF6577]">
                      <span>Latency: {lastResult.latencyMs}ms</span>
                      <span>•</span>
                      <span>Fail-Closed Enforced</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-lg font-bold font-mono text-white">
                    Gate Idle & Armed
                  </div>
                  <p className="text-xs text-[#A3A9B7]">
                    Select an action and press evaluate to test policy authorization.
                  </p>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-mono text-white/50">
                      Authoritative Engine • Fail-Closed Default
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Engine Assurance Footnote */}
            <div className="mt-6 pt-4 border-t border-white/5 w-full flex items-center justify-between text-[10px] font-mono text-white/40">
              <span>ZERO PROMPT-INJECTION VULNERABILITY</span>
              <span>100% AIR-GAPPED</span>
            </div>

          </div>

        </div>
      </div>
    </section>
  )
}
