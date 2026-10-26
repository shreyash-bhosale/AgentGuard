import React from "react"

interface CategoryRiskCardProps {
  name: string
  code: string
  score: number
  maxScore: number
  isCritical?: boolean
}

export function CategoryRiskCard({
  name,
  code,
  score,
  maxScore,
  isCritical = false,
}: CategoryRiskCardProps) {
  // Segmented meter: 5 discrete blocks
  const totalSegments = 5
  const activeSegments = score > 0 ? Math.min(totalSegments, Math.max(1, Math.ceil((score / maxScore) * totalSegments))) : 0

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border p-3.5 transition-all duration-200 select-none ${
        score > 0
          ? isCritical
            ? "border-[#FF4D61]/40 bg-gradient-to-b from-[#180C10] via-[#10080B] to-[#0A0608] shadow-[inset_0_1px_0_0_rgba(255,77,97,0.2)]"
            : "border-white/20 bg-gradient-to-b from-[#161B26] via-[#10131D] to-[#0B0D14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
          : "border-white/10 bg-gradient-to-b from-[#10131A]/90 to-[#0A0C11]/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:border-white/20"
      }`}
    >
      {/* Top Hairline Metallic Highlight */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent ${
          score > 0 && isCritical
            ? "via-[#FF4D61]/60"
            : score > 0
            ? "via-white/35"
            : "via-white/10"
        } to-transparent`}
      />

      {/* Micro Data Grid Texture on Hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "8px 8px",
        }}
      />

      <div className="relative z-10 space-y-2">
        {/* Header: Label & Code */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-[#A3A9B7] group-hover:text-white transition-colors">
            {name}
          </span>
          <span className="text-[9px] font-mono text-white/40 tracking-wider">
            {code}
          </span>
        </div>

        {/* Value Display */}
        <div className="flex items-baseline justify-between">
          <div
            className={`text-xl font-bold font-mono tracking-tight ${
              score > 0
                ? isCritical
                  ? "text-[#FF6577]"
                  : "text-white"
                : "text-white/40"
            }`}
          >
            +{score}
          </div>
          <span className="text-[10px] font-mono text-white/40">
            /{maxScore}
          </span>
        </div>

        {/* 5-Segment LED-Style Risk Gauge */}
        <div className="flex items-center gap-1 pt-1">
          {Array.from({ length: totalSegments }).map((_, i) => {
            const isFilled = i < activeSegments
            return (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-xs transition-colors duration-300 ${
                  isFilled
                    ? isCritical
                      ? "bg-[#FF4D61] shadow-[0_0_6px_rgba(255,77,97,0.8)]"
                      : "bg-white shadow-[0_0_5px_rgba(255,255,255,0.7)]"
                    : "bg-white/10"
                }`}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
