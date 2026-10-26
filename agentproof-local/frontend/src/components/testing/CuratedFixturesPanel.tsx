import React from "react"
import { Globe, Check, Radio } from "lucide-react"
import { TEST_FIXTURES } from "@/lib/demoData"

interface CuratedFixturesPanelProps {
  selectedFixtureId: string
  onSelectFixture: (id: string) => void
}

export function CuratedFixturesPanel({
  selectedFixtureId,
  onSelectFixture,
}: CuratedFixturesPanelProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#121622]/90 via-[#0C0E15]/95 to-[#07090D]/95 p-5 md:p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_12px_32px_-8px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all duration-300 space-y-4">
      {/* Top Hairline Metallic Specular Edge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white">
            <Globe className="h-3.5 w-3.5 text-white/80" />
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Select Curated Test Fixture
          </h3>
        </div>
        <span className="text-[11px] font-mono text-white/50">
          4 Controlled Scenarios
        </span>
      </div>

      {/* Fixture Cards */}
      <div className="space-y-2">
        {TEST_FIXTURES.websites.map((fix) => {
          const isSelected = selectedFixtureId === fix.id
          const isCritical = fix.expected_level === "Critical"
          const isHigh = fix.expected_level === "High"
          const isMedium = fix.expected_level === "Medium"
          const isLow = fix.expected_level === "Low"

          return (
            <button
              key={fix.id}
              type="button"
              onClick={() => onSelectFixture(fix.id)}
              className={`w-full text-left rounded-xl border p-3 transition-all duration-200 outline-none select-none relative overflow-hidden group active:scale-[0.99] focus-visible:ring-1 focus-visible:ring-white/40 ${
                isSelected
                  ? "border-white/35 bg-gradient-to-r from-white/[0.12] via-white/[0.07] to-white/[0.04] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_4px_16px_-2px_rgba(0,0,0,0.5)]"
                  : "border-white/10 bg-black/40 hover:border-white/20 hover:bg-white/[0.03]"
              }`}
            >
              {/* Active Indicator Beam on Left */}
              {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white shadow-[0_0_8px_white]" />
              )}

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full transition-all ${
                      isSelected
                        ? "bg-white shadow-[0_0_6px_white]"
                        : "bg-white/20 group-hover:bg-white/40"
                    }`}
                  />
                  <span
                    className={`text-xs font-bold tracking-tight ${
                      isSelected ? "text-white" : "text-white/80 group-hover:text-white"
                    }`}
                  >
                    {fix.name}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                    isCritical
                      ? "bg-[#FF4D61]/20 text-[#FF6577] border border-[#FF4D61]/40"
                      : isHigh
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : isMedium
                      ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                      : "bg-[#35C98A]/20 text-[#35C98A] border border-[#35C98A]/30"
                  }`}
                >
                  {fix.expected_level}
                </span>
              </div>

              <p className="mt-1 text-[11px] leading-relaxed text-[#A3A9B7] line-clamp-1 pl-4">
                {fix.description}
              </p>

              <div className="mt-1.5 text-[10px] font-mono text-white/40 group-hover:text-white/60 truncate pl-4">
                {fix.url}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
