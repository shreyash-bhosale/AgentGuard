import React from "react"
import { ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react"

interface TactileSecuritySealProps {
  level: "Low" | "Medium" | "High" | "Critical"
}

export function TactileSecuritySeal({ level }: TactileSecuritySealProps) {
  const isCritical = level === "Critical"
  const isHigh = level === "High"
  const isMedium = level === "Medium"
  const isLow = level === "Low"

  // Base styling for tactile security seal
  return (
    <div
      className={`relative select-none overflow-hidden rounded-xl border px-4 py-2.5 transition-all duration-300 shadow-lg ${
        isCritical
          ? "border-[#FF4D61]/60 bg-gradient-to-b from-[#250C11] via-[#1A070B] to-[#100407] shadow-[inset_0_1px_0_0_rgba(255,100,120,0.35),0_4px_24px_-4px_rgba(255,77,97,0.3)] ring-1 ring-[#FF4D61]/30"
          : isHigh
          ? "border-amber-500/50 bg-gradient-to-b from-[#24180A] via-[#1A1106] to-[#110B04] shadow-[inset_0_1px_0_0_rgba(245,158,11,0.3),0_4px_20px_-4px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/25"
          : isMedium
          ? "border-yellow-500/40 bg-gradient-to-b from-[#20190A] via-[#161106] to-[#0E0B04] shadow-[inset_0_1px_0_0_rgba(234,179,8,0.25)]"
          : "border-[#35C98A]/40 bg-gradient-to-b from-[#0B1E15] via-[#07150E] to-[#040D09] shadow-[inset_0_1px_0_0_rgba(53,201,138,0.25),0_4px_16px_-4px_rgba(53,201,138,0.15)] ring-1 ring-[#35C98A]/20"
      }`}
    >
      {/* Top Hairline Metallic Specular Edge */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent ${
          isCritical
            ? "via-[#FF4D61]/80"
            : isHigh
            ? "via-amber-400/80"
            : isMedium
            ? "via-yellow-400/70"
            : "via-[#35C98A]/80"
        } to-transparent`}
      />

      <div className="relative z-10 flex items-center gap-3">
        {/* Tactile Icon Container */}
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg border shadow-inner ${
            isCritical
              ? "border-[#FF4D61]/50 bg-[#FF4D61]/20 text-[#FF6577]"
              : isHigh
              ? "border-amber-500/40 bg-amber-500/20 text-amber-300"
              : isMedium
              ? "border-yellow-500/40 bg-yellow-500/20 text-yellow-300"
              : "border-[#35C98A]/40 bg-[#35C98A]/20 text-[#35C98A]"
          }`}
        >
          {isCritical ? (
            <ShieldAlert className="h-4 w-4" />
          ) : isHigh || isMedium ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
        </div>

        {/* Text Details & Calm Pulsing Dot */}
        <div>
          <div className="flex items-center gap-1.5">
            {/* Calm Pulsing Status Dot */}
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                  isCritical
                    ? "bg-[#FF4D61]"
                    : isHigh
                    ? "bg-amber-400"
                    : isMedium
                    ? "bg-yellow-400"
                    : "bg-[#35C98A]"
                }`}
                style={{ animationDuration: "2.5s" }}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  isCritical
                    ? "bg-[#FF4D61]"
                    : isHigh
                    ? "bg-amber-400"
                    : isMedium
                    ? "bg-yellow-400"
                    : "bg-[#35C98A]"
                }`}
              />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">
              Verdict // Seal
            </span>
          </div>

          <div
            className={`text-sm font-bold tracking-tight font-mono ${
              isCritical
                ? "text-white drop-shadow-[0_0_8px_rgba(255,77,97,0.4)]"
                : isHigh
                ? "text-amber-200"
                : isMedium
                ? "text-yellow-200"
                : "text-[#35C98A]"
            }`}
          >
            {level} Risk
          </div>
        </div>
      </div>
    </div>
  )
}
