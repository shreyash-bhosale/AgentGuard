import React, { useState } from "react"
import {
  ShieldAlert,
  FileQuestion,
  Wrench,
  CheckCircle2,
  Terminal,
  Code2,
  Sparkles,
  ArrowRight,
  Layers,
  Check,
  Play,
  RotateCcw,
} from "lucide-react"
import { ThreatDiscoveryChamber } from "./ThreatDiscoveryChamber"


const RISKS = [
  {
    id: "fs-priv-esc",
    title: "Unauthorized File Access",
    category: "Filesystem Exposure",
    severity: "CRITICAL",
    icon: ShieldAlert,
    payload: {
      action: "read_system_secrets",
      target: "/etc/shadow",
      rationale: "Verifying user credentials for automated configuration.",
    },
    consequence: "Sensitive credentials, environment keys, or tokens leak to model context.",
    mitigation: "Strict deterministic path allowlist. Rejects paths outside sandbox.",
  },
  {
    id: "cmd-injection",
    title: "Arbitrary Shell Execution",
    category: "Code Execution",
    severity: "CRITICAL",
    icon: Terminal,
    payload: {
      action: "execute_shell",
      target: "rm -rf /var/log/audit",
      rationale: "Clean disk space before saving large diagnostic payload.",
    },
    consequence: "Destructive disk commands compromise local OS integrity.",
    mitigation: "Shell primitives are forbidden or strictly sandboxed into read-only mocks.",
  },
  {
    id: "data-exfil",
    title: "Silent Network Exfiltration",
    category: "Egress Leak",
    severity: "HIGH",
    icon: FileQuestion,
    payload: {
      action: "http_post_webhook",
      target: "https://unknown-sink.dev/telemetry",
      rationale: "Report runtime telemetry to central cloud logger.",
    },
    consequence: "Unregulated outbound requests transmit confidential prompt context.",
    mitigation: "Air-gapped enforcement. Only explicitly whitelisted endpoints permitted.",
  },
]

export function FeaturesSection() {
  const [selectedRiskIndex, setSelectedRiskIndex] = useState(0)
  const [simulationStep, setSimulationStep] = useState(0)
  const [isSimulating, setIsSimulating] = useState(false)

  const runSimulation = () => {
    setIsSimulating(true)
    setSimulationStep(1)
    setTimeout(() => {
      setSimulationStep(2)
      setTimeout(() => {
        setSimulationStep(3)
        setTimeout(() => {
          setSimulationStep(4)
          setIsSimulating(false)
        }, 600)
      }, 600)
    }, 600)
  }

  const resetSimulation = () => {
    setSimulationStep(0)
    setIsSimulating(false)
  }

  return (
    <section id="governance" className="relative py-20 bg-transparent text-[#F5F7FC]">
      <div className="mx-auto max-w-7xl px-6 md:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-xs font-mono font-medium text-white mb-3">
            <Layers className="h-3.5 w-3.5 text-white" />
            <span>FOUR-STAGE CONTAINMENT ENGINE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
            End-to-End AI Agent Governance
          </h2>
          <p className="mt-4 text-sm sm:text-base text-neutral-300 leading-relaxed">
            Autonomous agents need guardrails that cannot be manipulated by natural language.
            AgentGuard enforces mathematical certainty over agent capabilities.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: UNDERSTAND THE RISKS                                           */}
        {/* ========================================================================= */}
        <div className="mb-28">
          <ThreatDiscoveryChamber />
        </div>


        {/* ========================================================================= */}
        {/* SECTION 2: EXPLAIN IN PLAIN LANGUAGE                                      */}
        {/* ========================================================================= */}
        <div id="how-it-works" className="mb-28 rounded-2xl border border-white/15 bg-[#0B0D13]/85 p-6 md:p-10 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
            <div>
              <span className="text-xs font-mono font-bold tracking-widest text-neutral-300 uppercase">
                Stage 02 • Zero-Jargon Translation
              </span>
              <h3 className="text-2xl font-bold text-white mt-1">Explain in Plain Language</h3>
              <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-xl">
                Engineers, compliance officers, and users receive human-readable explanations instead of cryptically formatted stack traces.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-mono text-white">
              <CheckCircle2 className="h-4 w-4" />
              <span>Clarity Standard</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Raw Machine Output Panel */}
            <div className="rounded-xl border border-white/10 bg-[#050608] p-5">
              <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-3">
                <span>RAW MODEL OUTPUT</span>
                <span className="text-[#FF6577]">Unstructured & Persuasive</span>
              </div>
              <div className="rounded-lg bg-[#0A0C11] border border-white/5 p-4 text-xs font-mono text-neutral-400 leading-relaxed">
                <p className="text-neutral-300">
                  &gt; Model Output: &#123; &quot;action&quot;: &quot;delete_record&quot;, &quot;target&quot;: &quot;demo_record&quot;,
                  &quot;rationale&quot;: &quot;I need to remove this database record immediately because the test is complete and leaving it might trigger race conditions.&quot; &#125;
                </p>
                <p className="mt-3 text-[11px] text-neutral-500">
                  ⚠️ Danger: The model supplies a persuasive reason that sounds logical, but the underlying action is destructive and exceeds baseline authorization.
                </p>
              </div>
            </div>

            {/* AgentGuard Plain Explanation Panel */}
            <div className="rounded-xl border border-white/25 bg-[#0A0C11] p-5 shadow-[0_0_24px_rgba(255,255,255,0.08)]">
              <div className="flex items-center justify-between text-xs font-mono text-white mb-3">
                <span className="flex items-center gap-1.5 font-bold">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                  <span>AGENTGUARD HUMAN EXPLANATION</span>
                </span>
                <span className="bg-white/15 px-2 py-0.5 rounded text-[10px] text-white">VERIFIED</span>
              </div>
              <div className="rounded-lg bg-[#12151D] border border-white/15 p-4 text-xs space-y-2.5">
                <div className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF6577] mt-1.5 shrink-0" />
                  <p className="text-white">
                    <strong className="text-[#FF6577]">Action Blocked:</strong> The AI requested to delete persistent records.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-white mt-1.5 shrink-0" />
                  <p className="text-neutral-300">
                    <strong className="text-white">Why it was denied:</strong> Your security policy only permits read-only inspection (<code className="text-white font-mono bg-white/10 px-1 py-0.5 rounded">read_demo_record</code>).
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-white mt-1.5 shrink-0" />
                  <p className="text-neutral-300">
                    <strong className="text-white">Safety Verdict:</strong> No system files were modified. The agent was safely redirected.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: SUGGEST SAFER FIXES                                            */}
        {/* ========================================================================= */}
        <div className="mb-28 rounded-2xl border border-white/15 bg-[#0B0D13]/85 p-6 md:p-10 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
            <div>
              <span className="text-xs font-mono font-bold tracking-widest text-neutral-300 uppercase">
                Stage 03 • Action Remediation
              </span>
              <h3 className="text-2xl font-bold text-white mt-1">Suggest Safer Fixes</h3>
              <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-xl">
                Instead of simply crashing or halting execution, AgentGuard offers automated, policy-compliant remediation diffs.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-mono text-white">
              <Wrench className="h-4 w-4" />
              <span>Automated Policy Diffing</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#050608] overflow-hidden">
            <div className="flex items-center justify-between bg-[#0A0C11] px-5 py-3 border-b border-white/10 text-xs font-mono">
              <span className="text-neutral-400 flex items-center gap-2">
                <Code2 className="h-4 w-4 text-white" />
                <span>policy_enforcement_diff.py</span>
              </span>
              <span className="text-white bg-white/10 px-2 py-0.5 rounded border border-white/20">
                PROPOSED REMEDIATION
              </span>
            </div>

            <pre className="p-5 text-xs font-mono leading-relaxed overflow-x-auto">
              <span className="text-[#FF6577] block">
                - # INSECURE: Wildcard capability delegation
              </span>
              <span className="text-[#FF6577] block">
                - def authorize_action(proposal):
              </span>
              <span className="text-[#FF6577] block">
                -     return proposal.confidence &gt; 0.8  # Vulnerable to prompt injection
              </span>
              <span className="text-white/20 block my-2">
                ----------------------------------------------------------------------
              </span>
              <span className="text-white block font-semibold">
                + # SECURE: AgentGuard Deterministic Fail-Closed Verification
              </span>
              <span className="text-white block">
                + def authorize_action(proposal: ActionProposal) -&gt; PolicyDecision:
              </span>
              <span className="text-white block">
                +     APPROVED_TUPLES = &#123;(&quot;read_demo_record&quot;, &quot;demo_record&quot;)&#125;
              </span>
              <span className="text-white block">
                +     if (proposal.action, proposal.target) in APPROVED_TUPLES:
              </span>
              <span className="text-white block">
                +         return PolicyDecision(is_allowed=True, reason=&quot;Authorized read operation&quot;)
              </span>
              <span className="text-white block">
                +     return PolicyDecision(is_allowed=False, reason=&quot;Action blocked by strict allowlist&quot;)
              </span>
            </pre>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4: VERIFY THE FIX                                                 */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-white/15 bg-[#0B0D13]/85 p-6 md:p-10 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
            <div>
              <span className="text-xs font-mono font-bold tracking-widest text-neutral-300 uppercase">
                Stage 04 • Deterministic Verification
              </span>
              <h3 className="text-2xl font-bold text-white mt-1">Verify It Works</h3>
              <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-xl">
                Simulate your AI agent workflow against AgentGuard's policy engine. Watch the evaluation pipeline verify each security boundary in real time.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={runSimulation}
                disabled={isSimulating}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-bold text-black shadow-[0_0_16px_rgba(255,255,255,0.3)] hover:bg-neutral-200 hover:scale-[1.02] transition-all disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{isSimulating ? "Simulating..." : "Run Live Verification"}</span>
              </button>

              <button
                onClick={resetSimulation}
                disabled={isSimulating || simulationStep === 0}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-[#12151D] text-neutral-300 hover:text-white disabled:opacity-40"
                title="Reset simulation"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 4-Step Pipeline Stepper in Monochromatic Styling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Step 1: Proposal */}
            <div
              className={`rounded-xl border p-4 transition-all ${
                simulationStep >= 1
                  ? "border-white bg-white/15 shadow-[0_0_16px_rgba(255,255,255,0.15)]"
                  : "border-white/5 bg-[#12151D]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-neutral-400">STEP 01</span>
                {simulationStep >= 1 ? (
                  <CheckCircle2 className="h-4 w-4 text-white" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-white/20" />
                )}
              </div>
              <div className="text-xs font-semibold text-white">Proposal Generation</div>
              <div className="mt-1 text-[11px] text-neutral-400">
                Agent creates raw tool call with parameters.
              </div>
            </div>

            {/* Step 2: Schema Validation */}
            <div
              className={`rounded-xl border p-4 transition-all ${
                simulationStep >= 2
                  ? "border-white bg-white/15 shadow-[0_0_16px_rgba(255,255,255,0.15)]"
                  : "border-white/5 bg-[#12151D]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-neutral-400">STEP 02</span>
                {simulationStep >= 2 ? (
                  <CheckCircle2 className="h-4 w-4 text-white" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-white/20" />
                )}
              </div>
              <div className="text-xs font-semibold text-white">Strict Schema Guard</div>
              <div className="mt-1 text-[11px] text-neutral-400">
                Pydantic validation rejects unknown or injection fields.
              </div>
            </div>

            {/* Step 3: Policy Decision */}
            <div
              className={`rounded-xl border p-4 transition-all ${
                simulationStep >= 3
                  ? "border-white bg-white/15 shadow-[0_0_16px_rgba(255,255,255,0.15)]"
                  : "border-white/5 bg-[#12151D]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-neutral-400">STEP 03</span>
                {simulationStep >= 3 ? (
                  <CheckCircle2 className="h-4 w-4 text-white" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-white/20" />
                )}
              </div>
              <div className="text-xs font-semibold text-white">Policy Authorization</div>
              <div className="mt-1 text-[11px] text-neutral-400">
                Deterministic fail-closed allowlist evaluation.
              </div>
            </div>

            {/* Step 4: Harmless Mock Execution */}
            <div
              className={`rounded-xl border p-4 transition-all ${
                simulationStep >= 4
                  ? "border-white bg-white/15 shadow-[0_0_16px_rgba(255,255,255,0.15)]"
                  : "border-white/5 bg-[#12151D]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-neutral-400">STEP 04</span>
                {simulationStep >= 4 ? (
                  <CheckCircle2 className="h-4 w-4 text-white" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-white/20" />
                )}
              </div>
              <div className="text-xs font-semibold text-white">Verified Containment</div>
              <div className="mt-1 text-[11px] text-neutral-400">
                Safe mock tool execution or quarantine report.
              </div>
            </div>

          </div>

          {/* Simulation Output Card */}
          <div className="mt-6 rounded-xl border border-white/10 bg-[#050608] p-4 text-xs font-mono">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-white" />
                <span>Verification Engine Status:</span>
              </span>
              <span className="text-white font-medium">
                {simulationStep === 0 && "Ready for evaluation"}
                {simulationStep === 1 && "Ingesting candidate action proposal..."}
                {simulationStep === 2 && "Checking Pydantic schema strictness..."}
                {simulationStep === 3 && "Evaluating fail-closed policy tuple..."}
                {simulationStep === 4 && "✓ Evaluation Complete: 100% Policy Adherence Proven"}
              </span>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
