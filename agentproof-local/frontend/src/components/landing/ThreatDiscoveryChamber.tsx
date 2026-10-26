import React, { useState, useRef, useEffect } from "react"
import {
  ShieldAlert,
  Terminal,
  FileQuestion,
  Copy,
  Check,
  Lock,
  ShieldCheck,
  ArrowRight,
  Shield,
  Activity,
} from "lucide-react"

interface RiskScenario {
  id: string
  title: string
  category: string
  severity: "CRITICAL" | "HIGH"
  icon: React.ComponentType<{ className?: string }>
  payload: {
    action: string
    target: string
    rationale: string
  }
  consequence: string
  mitigation: string
}

const RISKS: RiskScenario[] = [
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

export function ThreatDiscoveryChamber() {
  const [selectedRiskIndex, setSelectedRiskIndex] = useState(0)
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

  const currentRisk = RISKS[selectedRiskIndex]

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(currentRisk.payload, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#121622]/95 via-[#0C0E16]/95 to-[#07090E]/98 p-6 md:p-10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_28px_70px_-16px_rgba(0,0,0,0.95)] backdrop-blur-2xl transition-all duration-300">
      {/* Top Hairline Metallic Specular Edge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {/* Subtle Background Circuit/Grid Texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Chamber Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded border border-white/15 bg-white/5 text-white/70">
              <Activity className="h-3 w-3" />
            </span>
            <span className="text-xs font-mono font-bold tracking-widest text-[#A3A9B7] uppercase">
              Stage 01 • Threat Discovery
            </span>
          </div>
          <h3 className="text-2xl md:text-3xl font-extrabold text-white mt-1 tracking-tight">
            Understand the Risks
          </h3>
          <p className="text-xs sm:text-sm text-[#A3A9B7] mt-1 max-w-xl leading-relaxed">
            Inspect real-world threat vectors where autonomous agents deviate from safe operational limits.
          </p>
        </div>

        {/* Verification Seal: Deterministic Allowlist Standard */}
        <div className="relative select-none overflow-hidden rounded-xl border border-white/20 bg-gradient-to-b from-white/10 via-white/5 to-transparent px-4 py-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_4px_16px_rgba(0,0,0,0.5)] shrink-0 self-start md:self-auto">
          {/* Subtle Scanning Highlight */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
              animation: !prefersReducedMotion ? "scanline-sweep 3s ease-in-out infinite" : "none",
            }}
          />
          <div className="relative z-10 flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white">
              <Shield className="h-3.5 w-3.5" />
            </span>
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-white/50">
                Security Standard
              </div>
              <div className="text-xs font-bold font-mono text-white tracking-tight">
                Deterministic Allowlist Standard
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chamber Grid */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Tactile 3D Threat Scenario Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#A3A9B7] flex items-center justify-between px-1">
            <span>Threat Vector Profiles</span>
            <span className="text-white/40">3 Active Fixtures</span>
          </div>

          <div className="space-y-2.5">
            {RISKS.map((risk, index) => {
              const isSelected = selectedRiskIndex === index
              const Icon = risk.icon
              const isCritical = risk.severity === "CRITICAL"

              return (
                <button
                  key={risk.id}
                  onClick={() => setSelectedRiskIndex(index)}
                  className={`group relative w-full flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all duration-200 select-none outline-none overflow-hidden active:scale-[0.985] focus-visible:ring-1 focus-visible:ring-white/40 ${
                    isSelected
                      ? isCritical
                        ? "border-[#FF4D61]/60 bg-gradient-to-r from-[#1E0B10]/95 via-[#14070B]/90 to-[#0B0406]/95 shadow-[inset_0_1px_0_0_rgba(255,100,120,0.3),0_8px_24px_-4px_rgba(255,77,97,0.25)] ring-1 ring-[#FF4D61]/30"
                        : "border-white/40 bg-gradient-to-r from-white/15 via-white/10 to-white/5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_8px_24px_-4px_rgba(0,0,0,0.6)]"
                      : "border-white/10 bg-[#0A0D14]/85 text-[#A3A9B7] hover:border-white/25 hover:bg-[#10141F] hover:-translate-y-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                  }`}
                >
                  {/* Active Indicator Beam on Left */}
                  {isSelected && (
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-[2.5px] ${
                        isCritical
                          ? "bg-[#FF4D61] shadow-[0_0_8px_#FF4D61]"
                          : "bg-white shadow-[0_0_8px_white]"
                      }`}
                    />
                  )}

                  {/* Faint Internal Circuit Texture Revealed on Hover */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
                      `,
                      backgroundSize: "12px 12px",
                    }}
                  />

                  {/* Scenario Icon with Subtle Pulse on Hover */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 ${
                      isSelected
                        ? isCritical
                          ? "border-[#FF4D61]/60 bg-[#FF4D61]/20 text-[#FF6577] shadow-[0_0_12px_rgba(255,77,97,0.4)]"
                          : "border-white/40 bg-white/20 text-white shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                        : "border-white/10 bg-black/50 text-white/50 group-hover:text-white group-hover:border-white/20"
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5 group-hover:scale-105 transition-transform" />
                  </div>

                  {/* Title & Metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-bold truncate tracking-tight ${
                          isSelected ? "text-white" : "text-white/90 group-hover:text-white"
                        }`}
                      >
                        {risk.title}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 border ${
                          isCritical
                            ? "bg-[#FF4D61]/20 text-[#FF6577] border-[#FF4D61]/40"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/35"
                        }`}
                      >
                        {risk.severity}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#A3A9B7] block truncate mt-1">
                      {risk.category}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Containment Viewport & Inspection Terminal (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-white/12 bg-gradient-to-b from-[#090C12] to-[#05060A] p-5 md:p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_12px_32px_rgba(0,0,0,0.8)] space-y-4">
          
          {/* Viewport Top Bar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-xs font-mono text-white/80 flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-white" />
              <span>Agent Action Proposal Payload</span>
            </span>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-white/40 hidden sm:inline">
                schema: v1.0.strict
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#FF4D61]/40 bg-[#FF4D61]/15 px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#FF6577]">
                <Lock className="h-2.5 w-2.5" />
                FLAGGED BY POLICY
              </span>
            </div>
          </div>

          {/* Secure Read-Only JSON Payload Terminal */}
          <div className="relative rounded-xl border border-white/10 bg-[#050608] overflow-hidden group">
            {/* Top Terminal Specular Bar */}
            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-3.5 py-1.5 text-[10px] font-mono text-white/40 select-none">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span>INCOMING_ACTION_AST.json</span>
              </span>
              <button
                type="button"
                onClick={handleCopyPayload}
                className="inline-flex items-center gap-1 text-[#A3A9B7] hover:text-white transition-colors"
                title="Copy Payload"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-white" />
                    <span className="text-white">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Inset Code Area with Scanlines */}
            <div className="relative p-4">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.025]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255, 255, 255, 0.4) 50%, transparent 50%)",
                  backgroundSize: "100% 4px",
                }}
              />
              <pre className="relative z-10 text-[12px] font-mono leading-relaxed text-white/90 overflow-x-auto">
                <code>
{`{
  "action": "${currentRisk.payload.action}",
  "target": "${currentRisk.payload.target}",
  "rationale": "${currentRisk.payload.rationale}"
}`}
                </code>
              </pre>
            </div>
          </div>

          {/* Impact if Unrestricted Alert Box (Red-tinted glass with thin border beam) */}
          <div className="relative overflow-hidden rounded-xl border border-[#FF4D61]/40 bg-gradient-to-r from-[#220B10]/95 via-[#16060A]/90 to-[#0F0407]/95 p-3.5 shadow-[inset_0_1px_0_0_rgba(255,100,120,0.25)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#FF4D61]/80 to-transparent" />
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 text-[#FF6577] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-xs font-bold font-mono text-[#FF6577] block">
                  Impact if Unrestricted:
                </span>
                <p className="text-xs text-white/90 leading-relaxed font-mono">
                  {currentRisk.consequence}
                </p>
              </div>
            </div>
          </div>

          {/* AgentGuard Enforcement (Elevated graphite plate with white confirmation glow) */}
          <div className="relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-r from-[#141824] via-[#0E1119] to-[#0A0D13] p-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_4px_16px_rgba(0,0,0,0.5)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-white shrink-0 mt-0.5 drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
              <div className="space-y-0.5">
                <span className="text-xs font-bold font-mono text-white block">
                  AgentGuard Enforcement:
                </span>
                <p className="text-xs text-[#CBD5E1] leading-relaxed font-mono">
                  {currentRisk.mitigation}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
