import React, { useEffect, useState, useMemo } from "react"

export function SecurityAtmosphere() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)")
      setReducedMotion(media.matches)
      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
      media.addEventListener("change", listener)
      return () => media.removeEventListener("change", listener)
    }
  }, [])

  // Generate deterministic subtle star motes and coordinates
  const particles = useMemo(() => {
    const items = []
    const seed = [
      { x: 12, y: 18, s: 1.5, o: 0.4 },
      { x: 28, y: 8, s: 2, o: 0.6 },
      { x: 45, y: 32, s: 1, o: 0.35 },
      { x: 72, y: 14, s: 2.2, o: 0.5 },
      { x: 88, y: 24, s: 1.2, o: 0.4 },
      { x: 18, y: 64, s: 1.8, o: 0.45 },
      { x: 38, y: 82, s: 1.2, o: 0.3 },
      { x: 62, y: 72, s: 2, o: 0.5 },
      { x: 82, y: 58, s: 1.5, o: 0.4 },
      { x: 94, y: 85, s: 1, o: 0.3 },
      { x: 5, y: 42, s: 1.6, o: 0.35 },
      { x: 52, y: 48, s: 1.4, o: 0.4 },
      { x: 78, y: 92, s: 1.8, o: 0.38 },
      { x: 32, y: 95, s: 1, o: 0.25 },
      { x: 90, y: 4, s: 2.5, o: 0.55 },
    ]
    return seed
  }, [])

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Faint Tactical Grid Geometry */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Sparse Star-like Particles / Dust Motes */}
      <svg className="absolute inset-0 h-full w-full">
        {particles.map((p, idx) => (
          <circle
            key={idx}
            cx={`${p.x}%`}
            cy={`${p.y}%`}
            r={p.s}
            fill="#FFFFFF"
            opacity={p.o}
            style={{
              animation: !reducedMotion ? `pulse ${3 + (idx % 4)}s ease-in-out infinite` : "none",
              animationDelay: `${(idx * 0.4).toFixed(1)}s`,
            }}
          />
        ))}
      </svg>

      {/* Soft Restrained Light Blooms (Very low opacity) */}
      <div
        className="absolute top-1/4 left-1/3 h-96 w-96 rounded-full opacity-[0.025] blur-[120px] pointer-events-none bg-white"
      />
      <div
        className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full opacity-[0.02] blur-[100px] pointer-events-none bg-white"
      />
    </div>
  )
}
