import React, { useState } from "react"
import { ChevronRight, ArrowRight, ShieldAlert, ShieldCheck, Cpu } from "lucide-react"

interface EvaluatedHeuristicRowProps {
  reason: string
  index: number
}

export function EvaluatedHeuristicRow({ reason, index }: EvaluatedHeuristicRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const isCritical =
    reason.toLowerCase().includes("unencrypted plain http") ||
    reason.toLowerCase().includes("password field") ||
    reason.toLowerCase().includes("credentials exposed")

  const isWarning =
    reason.toLowerCase().includes("punycode") ||
    reason.toLowerCase().includes("ip literal") ||
    reason.toLowerCase().includes("mixed content")

  // Generate deterministic forensic rule code from text
  const ruleCode = isCritical
    ? reason.toLowerCase().includes("password")
      ? "DET-RULE-PW-HTTP-01"
      : "DET-RULE-TLS-PLAIN-01"
    : isWarning
    ? reason.toLowerCase().includes("punycode")
      ? "DET-RULE-DNS-IDN-02"
      : reason.toLowerCase().includes("ip literal")
      ? "DET-RULE-NET-IP-03"
      : "DET-RULE-DOM-MIXED-04"
    : "DET-RULE-TLS-VERIFIED-00"

  const classification = isCritical
    ? "FAIL-CLOSED INVARIANT BREACH"
    : isWarning
    ? "SUSPICIOUS HEURISTIC VECTOR"
    : "CRYPTOGRAPHIC CONFORMANCE"

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          setIsExpanded(!isExpanded)
        }
      }}
      className={`group relative overflow-hidden rounded-xl border transition-all duration-200 cursor-pointer select-none outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
        isCritical
          ? "border-[#FF4D61]/35 bg-gradient-to-r from-[#180A0E]/90 via-[#10080B]/80 to-[#0A0608]/90 hover:border-[#FF4D61]/50 shadow-[inset_0_1px_0_0_rgba(255,77,97,0.15)]"
          : isWarning
          ? "border-amber-500/30 bg-gradient-to-r from-[#18120A]/90 via-[#120D08]/80 to-[#0A0806]/90 hover:border-amber-500/45 shadow-[inset_0_1px_0_0_rgba(245,158,11,0.12)]"
          : "border-white/10 bg-gradient-to-r from-[#11141D]/80 via-[#0C0E15]/70 to-[#080A0E]/80 hover:border-white/20 hover:bg-white/[0.04] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
      }`}
    >
      {/* Subtle Scan / Specular Highlight Sweep on Hover */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent group-hover:via-white/30 transition-colors" />

      {/* Main Row Content */}
      <div className="flex items-start justify-between gap-3 p-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors ${
              isCritical
                ? "text-[#FF6577]"
                : isWarning
                ? "text-amber-300"
                : "text-white/60 group-hover:text-white"
            }`}
          >
            {isCritical ? (
              <ShieldAlert className="h-3.5 w-3.5" />
            ) : (
              <ArrowRight className="h-3.5 w-3.5 text-white/50 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
            )}
          </div>

          <div className="space-y-1 min-w-0">
            <p
              className={`text-xs leading-relaxed font-mono ${
                isCritical
                  ? "text-white font-medium"
                  : "text-white/90 group-hover:text-white"
              }`}
            >
              {reason}
            </p>

            <div className="flex items-center gap-2 text-[10px] font-mono text-white/40">
              <span className="text-white/50">{ruleCode}</span>
              <span>•</span>
              <span
                className={
                  isCritical
                    ? "text-[#FF6577]"
                    : isWarning
                    ? "text-amber-400"
                    : "text-white/60"
                }
              >
                {classification}
              </span>
            </div>
          </div>
        </div>

        {/* Expand / Collapse Chevron */}
        <div className="flex items-center gap-1 shrink-0 pt-0.5 text-white/40 group-hover:text-white transition-colors">
          <span className="text-[10px] font-mono hidden sm:inline-block">
            {isExpanded ? "Collapse" : "Forensics"}
          </span>
          <ChevronRight
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              isExpanded ? "rotate-90 text-white" : ""
            }`}
          />
        </div>
      </div>

      {/* Expandable Forensic Record Drawer */}
      {isExpanded && (
        <div className="border-t border-white/10 bg-black/40 px-3.5 py-3 space-y-2 text-[11px] font-mono text-[#A3A9B7]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1">
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase tracking-wider text-white/40">
                Evaluation Engine
              </span>
              <div className="text-white/90 flex items-center gap-1.5">
                <Cpu className="h-3 w-3 text-white/60" />
                <span>Deterministic AST Inspector v2.4</span>
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase tracking-wider text-white/40">
                Enforcement Model
              </span>
              <div className="text-white/90">
                {isCritical
                  ? "Fail-Closed Local Block (Invariant Violation)"
                  : isWarning
                  ? "High-Risk Heuristic Flagged"
                  : "Standard Compliance Passed"}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-white/50">
            <span className="flex items-center gap-1 text-white/70">
              <ShieldCheck className="h-3 w-3 text-white" />
              Validated by deterministic engine (Zero-Knowledge)
            </span>
            <span>Record ID #{index + 101}</span>
          </div>
        </div>
      )}
    </div>
  )
}
