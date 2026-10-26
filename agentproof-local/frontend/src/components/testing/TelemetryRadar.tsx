import React, { useEffect, useState } from "react"

interface TelemetryRadarProps {
  score: number
  isCritical?: boolean
  className?: string
}

export function TelemetryRadar({
  score,
  isCritical = false,
  className = "",
}: TelemetryRadarProps) {
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

  return (
    <div
      className={`relative select-none pointer-events-none flex items-center justify-center overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 200 200"
        className="h-full w-full opacity-60 transition-opacity duration-500"
      >
        <defs>
          {/* Subtle Radar Sweep Gradient */}
          <radialGradient id="radarSweepGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
            <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>

          {/* Sweeping Arc Gradient */}
          <linearGradient id="sweepSector" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* Critical Risk Glow Filter */}
          <filter id="telemetryGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Background Glow */}
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth="1"
          strokeDasharray="2 4"
        />

        {/* Concentric Radar Range Rings */}
        <circle
          cx="100"
          cy="100"
          r="76"
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="0.8"
        />
        <circle
          cx="100"
          cy="100"
          r="54"
          fill="none"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="0.8"
        />
        <circle
          cx="100"
          cy="100"
          r="32"
          fill="none"
          stroke="rgba(255, 255, 255, 0.14)"
          strokeWidth="0.8"
        />
        <circle
          cx="100"
          cy="100"
          r="10"
          fill="rgba(255, 255, 255, 0.04)"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1"
        />

        {/* Coordinate Crosshairs & Millimeter Marks */}
        <line
          x1="100"
          y1="8"
          x2="100"
          y2="192"
          stroke="rgba(255, 255, 255, 0.07)"
          strokeWidth="0.6"
          strokeDasharray="3 3"
        />
        <line
          x1="8"
          y1="100"
          x2="192"
          y2="100"
          stroke="rgba(255, 255, 255, 0.07)"
          strokeWidth="0.6"
          strokeDasharray="3 3"
        />

        {/* Cardinal Ticks */}
        <line x1="100" y1="4" x2="100" y2="12" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1" />
        <line x1="100" y1="188" x2="100" y2="196" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1" />
        <line x1="4" y1="100" x2="12" y2="100" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1" />
        <line x1="188" y1="100" x2="196" y2="100" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1" />

        {/* Coordinate Text */}
        <text
          x="105"
          y="18"
          fill="rgba(255, 255, 255, 0.25)"
          fontSize="6"
          fontFamily="monospace"
        >
          000°
        </text>
        <text
          x="176"
          y="96"
          fill="rgba(255, 255, 255, 0.25)"
          fontSize="6"
          fontFamily="monospace"
        >
          090°
        </text>
        <text
          x="105"
          y="188"
          fill="rgba(255, 255, 255, 0.25)"
          fontSize="6"
          fontFamily="monospace"
        >
          180°
        </text>
        <text
          x="14"
          y="96"
          fill="rgba(255, 255, 255, 0.25)"
          fontSize="6"
          fontFamily="monospace"
        >
          270°
        </text>

        {/* Slowly Rotating Wireframe Orbital Ellipse */}
        <g
          style={{
            transformOrigin: "100px 100px",
            animation: !reducedMotion ? "telemetry-orbit 24s linear infinite" : "none",
          }}
        >
          <ellipse
            cx="100"
            cy="100"
            rx="82"
            ry="36"
            fill="none"
            stroke="rgba(255, 255, 255, 0.16)"
            strokeWidth="0.8"
            strokeDasharray="4 6"
          />
          {/* Orbital Node Marker */}
          <circle cx="182" cy="100" r="2.5" fill="#FFFFFF" opacity="0.75" />
          <circle cx="18" cy="100" r="1.5" fill="#FFFFFF" opacity="0.4" />
        </g>

        {/* Secondary Inclined Orbital Path */}
        <g
          style={{
            transformOrigin: "100px 100px",
            transform: "rotate(45deg)",
          }}
        >
          <ellipse
            cx="100"
            cy="100"
            rx="74"
            ry="24"
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="0.7"
          />
        </g>

        {/* Scanning Sweep Line with Soft Radial Phosphor Fade */}
        <g
          style={{
            transformOrigin: "100px 100px",
            animation: !reducedMotion ? "radar-sweep 6s linear infinite" : "none",
          }}
        >
          {/* Sweep Sector Wedge */}
          <path
            d="M 100 100 L 100 16 A 84 84 0 0 1 159 41 Z"
            fill="url(#sweepSector)"
            opacity="0.6"
          />
          {/* Leading Scanning Beam */}
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="16"
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth="1.2"
          />
        </g>

        {/* Signal Intercept Markers (telemetry targets based on score) */}
        <circle cx="138" cy="72" r="2" fill="#FFFFFF" opacity="0.6" />
        <circle cx="68" cy="132" r="1.8" fill="#FFFFFF" opacity="0.45" />
        <circle cx="146" cy="120" r="1.5" fill="#FFFFFF" opacity="0.3" />

        {/* Center Target Cross */}
        <circle cx="100" cy="100" r="1.8" fill="#FFFFFF" opacity="0.9" />
      </svg>
    </div>
  )
}
