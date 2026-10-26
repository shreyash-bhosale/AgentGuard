import React from "react"
import { Shield, ShieldAlert, Cpu, Activity, CheckCircle2 } from "lucide-react"
import { TelemetryRadar } from "./TelemetryRadar"
import { AnimatedRiskScore } from "./AnimatedRiskScore"
import { TactileSecuritySeal } from "./TactileSecuritySeal"
import { SecurityInvariantAlert } from "./SecurityInvariantAlert"
import { CategoryRiskCard } from "./CategoryRiskCard"
import { EvaluatedHeuristicRow } from "./EvaluatedHeuristicRow"

interface WebsiteTestResult {
  url: string
  score: number
  level: "Low" | "Medium" | "High" | "Critical"
  isCriticalOverride: boolean
  reasons: string[]
  invariants: string[]
  categories: {
    transport: number
    formSafety: number
    domainTrust: number
    subresources: number
  }
}

interface DeterministicRiskPanelProps {
  webResult: WebsiteTestResult
}

export function DeterministicRiskPanel({ webResult }: DeterministicRiskPanelProps) {
  const isCritical = webResult.level === "Critical"

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-b from-[#121622]/90 via-[#0C0E15]/95 to-[#07090D]/95 p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_12px_36px_-8px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-all duration-300 space-y-6 ${
        isCritical
          ? "border-[#FF4D61]/40 shadow-[0_0_36px_-8px_rgba(255,77,97,0.2),inset_0_1px_0_0_rgba(255,100,120,0.25)]"
          : "border-white/10 hover:border-white/15"
      }`}
    >
      {/* Top Hairline Metallic Specular Edge */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent ${
          isCritical ? "via-[#FF4D61]/70" : "via-white/30"
        } to-transparent`}
      />

      {/* Critical Risk Perimeter Glitch-Free Alert Scan (Subtle, low-opacity) */}
      {isCritical && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] overflow-hidden">
          <div
            className="h-full w-full bg-gradient-to-r from-transparent via-[#FF4D61]/80 to-transparent"
            style={{ animation: "scanline-sweep 3s ease-in-out infinite" }}
          />
        </div>
      )}

      {/* Top Telemetry Header Area: Score + Visual Radar + Verdict Seal */}
      <div className="relative border-b border-white/10 pb-6">
        {/* Compact Monochrome 3D Telemetry Visual (positioned in the middle-right ambient zone) */}
        <div className="absolute right-0 top-0 bottom-0 w-44 md:w-56 pointer-events-none flex items-center justify-end overflow-hidden opacity-80">
          <TelemetryRadar
            score={webResult.score}
            isCritical={isCritical}
            className="h-44 w-44 md:h-52 md:w-52"
          />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Deterministic Risk Score */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded border border-white/10 bg-white/5 text-white/70">
                <Activity className="h-3 w-3" />
              </span>
              <span className="text-xs font-mono uppercase tracking-widest text-[#A3A9B7]">
                Deterministic Risk Score
              </span>
              <span className="text-[10px] font-mono text-white/40">
                // ZERO-KNOWLEDGE
              </span>
            </div>

            <div className="pt-1">
              <AnimatedRiskScore
                score={webResult.score}
                isCritical={isCritical}
              />
            </div>

            <div className="text-[10px] font-mono text-[#727B8D] flex items-center gap-2 pt-0.5">
              <span>Fail-Closed Standard</span>
              <span>•</span>
              <span>Evaluated in 0.28ms</span>
            </div>
          </div>

          {/* Right: Tactile Security Seal Verdict Badge */}
          <div className="shrink-0 self-start sm:self-center">
            <TactileSecuritySeal level={webResult.level} />
          </div>
        </div>
      </div>

      {/* High-Priority Security Invariant Triggered Alert */}
      <SecurityInvariantAlert invariants={webResult.invariants} />

      {/* Dimensional Telemetry Tiles: Category Risk Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono uppercase tracking-wider text-[#A3A9B7] flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-white/60" />
            <span>Category Risk Breakdown</span>
          </div>
          <span className="text-[10px] font-mono text-white/40">
            4 Evaluated Vectors
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <CategoryRiskCard
            name="Transport TLS"
            code="TRN-01"
            score={webResult.categories.transport}
            maxScore={35}
            isCritical={webResult.categories.transport >= 35}
          />
          <CategoryRiskCard
            name="Form Safety"
            code="FRM-02"
            score={webResult.categories.formSafety}
            maxScore={40}
            isCritical={webResult.categories.formSafety >= 40}
          />
          <CategoryRiskCard
            name="Origin Trust"
            code="ORG-03"
            score={webResult.categories.domainTrust}
            maxScore={30}
            isCritical={webResult.categories.domainTrust >= 25}
          />
          <CategoryRiskCard
            name="Subresources"
            code="SUB-04"
            score={webResult.categories.subresources}
            maxScore={20}
            isCritical={false}
          />
        </div>
      </div>

      {/* Evaluated Heuristics (Forensic Records) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono uppercase tracking-wider text-[#A3A9B7] flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-white/60" />
            <span>Evaluated Heuristics ({webResult.reasons.length})</span>
          </div>
          <span className="text-[10px] font-mono text-white/40">
            Deterministic Engine Trace
          </span>
        </div>

        <div className="space-y-2">
          {webResult.reasons.map((reason, i) => (
            <EvaluatedHeuristicRow
              key={i}
              reason={reason}
              index={i}
            />
          ))}
        </div>

        {/* Engine Assurance Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] font-mono text-white/40">
          <span className="flex items-center gap-1.5 text-white/60">
            <CheckCircle2 className="h-3 w-3 text-white" />
            Validated by deterministic security engine
          </span>
          <span>Zero-Knowledge • Local Evaluation Only</span>
        </div>
      </div>
    </div>
  )
}
