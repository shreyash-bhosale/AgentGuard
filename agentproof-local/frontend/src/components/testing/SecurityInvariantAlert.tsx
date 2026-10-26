import React from "react"
import { ShieldAlert, Lock, AlertOctagon } from "lucide-react"

interface SecurityInvariantAlertProps {
  invariants: string[]
}

export function SecurityInvariantAlert({ invariants }: SecurityInvariantAlertProps) {
  if (!invariants || invariants.length === 0) return null

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#FF4D61]/50 bg-gradient-to-r from-[#220B10]/95 via-[#16060A]/90 to-[#0F0407]/95 p-4 shadow-[inset_0_1px_0_0_rgba(255,100,120,0.3),0_8px_24px_-4px_rgba(255,77,97,0.25)] ring-1 ring-[#FF4D61]/30">
      {/* Hairline Animated Traveling Border Trace */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
        <div
          className="absolute -inset-[100%] opacity-40"
          style={{
            background:
              "conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(255, 77, 97, 0.8) 40deg, transparent 80deg)",
            animation: "radar-sweep 8s linear infinite",
          }}
        />
        {/* Inner Mask to keep trace on perimeter only */}
        <div className="absolute inset-[1px] rounded-[11px] bg-gradient-to-r from-[#220B10] via-[#16060A] to-[#0F0407]" />
      </div>

      {/* Top Hairline Metallic Crimson Highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FF4D61] to-transparent opacity-75" />

      <div className="relative z-10 space-y-2.5">
        {/* Header: Shield Icon & Fail-Closed Invariant Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-[#FF4D61]/60 bg-[#FF4D61]/20 text-[#FF6577] shadow-[0_0_12px_rgba(255,77,97,0.4)]">
              <ShieldAlert className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-bold font-mono tracking-wider text-[#FF6577]">
              SECURITY INVARIANT TRIGGERED
            </span>
          </div>

          <span className="inline-flex items-center gap-1 rounded border border-[#FF4D61]/40 bg-[#FF4D61]/15 px-2 py-0.5 text-[10px] font-mono font-bold text-[#FF6577]">
            <Lock className="h-2.5 w-2.5" />
            FAIL-CLOSED
          </span>
        </div>

        {/* Monospaced Explanation Text */}
        <div className="space-y-1.5 pl-8">
          {invariants.map((inv, idx) => (
            <p
              key={idx}
              className="text-xs font-mono leading-relaxed text-white/95"
            >
              {inv}
            </p>
          ))}
          <div className="pt-1 text-[10px] font-mono text-white/50 flex items-center gap-2">
            <span>RULE ID: INV-ENFORCE-HTTP-01</span>
            <span>•</span>
            <span className="text-[#FF6577]">Zero-Tolerance Credential Exposure</span>
          </div>
        </div>
      </div>
    </div>
  )
}
