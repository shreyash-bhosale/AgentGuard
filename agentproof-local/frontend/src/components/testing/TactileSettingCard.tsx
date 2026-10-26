import React, { useRef, useState, useEffect } from "react"
import { AlertTriangle, ShieldAlert } from "lucide-react"

interface TactileSettingCardProps {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  isRisky?: boolean
  riskType?: "critical" | "warning"
  riskBadge?: string
  className?: string
}

export function TactileSettingCard({
  id,
  title,
  description,
  icon,
  checked,
  onChange,
  isRisky = false,
  riskType = "critical",
  riskBadge,
  className = "",
}: TactileSettingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    // Restrained tilt: max 4.5 degrees
    const tiltX = -(y / (rect.height / 2)) * 4.5
    const tiltY = (x / (rect.width / 2)) * 4.5
    setTilt({ x: tiltX, y: tiltY })
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setTilt({ x: 0, y: 0 })
  }

  const toggle = () => {
    onChange(!checked)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault()
      toggle()
    }
  }

  // Risky styling: strictly controlled around only the affected card
  const getRiskyBorderClasses = () => {
    if (!isRisky) return ""
    if (riskType === "critical") {
      return "border-[#FF4D61]/60 shadow-[0_0_24px_-2px_rgba(255,77,97,0.32)] ring-1 ring-[#FF4D61]/40"
    }
    return "border-amber-500/50 shadow-[0_0_20px_-2px_rgba(245,158,11,0.28)] ring-1 ring-amber-500/30"
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={toggle}
      onKeyDown={handleKeyDown}
      role="switch"
      aria-checked={checked}
      aria-label={`${title} toggle: currently ${checked ? "enabled" : "disabled"}`}
      tabIndex={0}
      style={{
        transform:
          !prefersReducedMotion && isHovered
            ? `perspective(800px) rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg) translateY(-4px)`
            : "perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)",
        transition: isHovered
          ? "transform 0.12s ease-out, border-color 0.2s, box-shadow 0.2s"
          : "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s, box-shadow 0.25s",
      }}
      className={`group relative select-none cursor-pointer overflow-hidden rounded-xl border p-3.5 outline-none transition-all duration-200 active:scale-[0.985] active:translate-y-[-1px] focus-visible:ring-2 focus-visible:ring-white/40 ${
        isRisky
          ? getRiskyBorderClasses()
          : checked
          ? "border-white/25 bg-gradient-to-b from-[#161A24]/90 to-[#0F1219]/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_8px_20px_-6px_rgba(0,0,0,0.6)]"
          : "border-white/10 bg-gradient-to-b from-[#10131B]/80 to-[#0A0D13]/85 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:border-white/20"
      } ${className}`}
    >
      {/* Top Hairline Metallic Specular Edge */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent ${
          isRisky && riskType === "critical"
            ? "via-[#FF4D61]/70"
            : isRisky
            ? "via-amber-400/60"
            : checked
            ? "via-white/40"
            : "via-white/15"
        } to-transparent transition-opacity`}
      />

      {/* Subtle Internal Circuit / Grid Trace (illuminates softly on hover) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          backgroundImage: `
            radial-gradient(circle at 85% 20%, rgba(255, 255, 255, 0.05) 0%, transparent 60%),
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 16px 16px, 16px 16px",
        }}
      />

      {/* Controlled Security Pulse Glow Overlay (Only active when setting is risky) */}
      {isRisky && (
        <div
          className={`pointer-events-none absolute inset-0 rounded-xl opacity-20 ${
            riskType === "critical"
              ? "bg-[#FF4D61]/15 animate-pulse"
              : "bg-amber-500/15 animate-pulse"
          }`}
          style={{ animationDuration: "2.2s" }}
        />
      )}

      <div className="relative z-10 flex items-start justify-between gap-3">
        {/* Left: Icon & Title & Description */}
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
              isRisky && riskType === "critical"
                ? "border-[#FF4D61]/50 bg-[#FF4D61]/15 text-[#FF6577]"
                : isRisky
                ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                : checked
                ? "border-white/30 bg-white/10 text-white"
                : "border-white/10 bg-black/40 text-white/50 group-hover:text-white/80"
            }`}
          >
            {icon}
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-white tracking-tight">
                {title}
              </span>
              {riskBadge && (
                <span
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase tracking-wider ${
                    riskType === "critical"
                      ? "border border-[#FF4D61]/40 bg-[#FF4D61]/20 text-[#FF6577]"
                      : "border border-amber-500/40 bg-amber-500/20 text-amber-300"
                  }`}
                >
                  {riskType === "critical" ? (
                    <ShieldAlert className="h-2.5 w-2.5" />
                  ) : (
                    <AlertTriangle className="h-2.5 w-2.5" />
                  )}
                  {riskBadge}
                </span>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-[#A3A9B7] line-clamp-2">
              {description}
            </p>
          </div>
        </div>

        {/* Right: Tactile Physical Toggle Switch */}
        <div className="shrink-0 pt-0.5">
          <div
            className={`relative flex h-6 w-11 items-center rounded-full border p-0.5 transition-colors duration-200 ${
              isRisky && riskType === "critical"
                ? "border-[#FF4D61]/60 bg-[#FF4D61]/25"
                : isRisky
                ? "border-amber-500/50 bg-amber-500/25"
                : checked
                ? "border-white/40 bg-white/20"
                : "border-white/15 bg-black/60 group-hover:border-white/25"
            }`}
          >
            {/* Sliding Milled Metal Thumb */}
            <div
              className={`h-4.5 w-4.5 rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.6)] transition-transform duration-200 ease-out flex items-center justify-center ${
                checked
                  ? "translate-x-5 bg-gradient-to-b from-white to-[#E2E8F0]"
                  : "translate-x-0 bg-gradient-to-b from-[#7A8394] to-[#485060]"
              }`}
            >
              {/* Micro-milled center dot */}
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  checked ? "bg-black/60" : "bg-black/40"
                }`}
              />
            </div>
          </div>
          <span className="sr-only">{checked ? "Enabled" : "Disabled"}</span>
        </div>
      </div>
    </div>
  )
}
