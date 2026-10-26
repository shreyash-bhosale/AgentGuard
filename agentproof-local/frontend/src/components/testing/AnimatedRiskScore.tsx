import React, { useEffect, useState, useRef } from "react"

interface AnimatedRiskScoreProps {
  score: number
  isCritical?: boolean
  className?: string
}

export function AnimatedRiskScore({
  score,
  isCritical = false,
  className = "",
}: AnimatedRiskScoreProps) {
  const [displayScore, setDisplayScore] = useState(score)
  const [isChanging, setIsChanging] = useState(false)
  const prevScoreRef = useRef(score)

  useEffect(() => {
    if (prevScoreRef.current === score) return

    const start = prevScoreRef.current
    const end = score
    prevScoreRef.current = score

    setIsChanging(true)
    const duration = 400 // ms
    const startTime = performance.now()

    let animationFrameId: number

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      const currentVal = Math.round(start + (end - start) * ease)
      setDisplayScore(currentVal)

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step)
      } else {
        setDisplayScore(end)
        setTimeout(() => setIsChanging(false), 200)
      }
    }

    animationFrameId = requestAnimationFrame(step)

    return () => cancelAnimationFrame(animationFrameId)
  }, [score])

  return (
    <div className={`relative inline-flex items-baseline gap-2 ${className}`}>
      {/* Subtle White / Crimson Ambient Score Glow */}
      <div
        className={`pointer-events-none absolute -inset-2 rounded-xl opacity-0 transition-opacity duration-300 blur-lg ${
          isChanging || isCritical
            ? isCritical
              ? "opacity-30 bg-[#FF4D61]"
              : "opacity-25 bg-white"
            : ""
        }`}
      />

      {/* Main Number Counter */}
      <span
        className={`relative z-10 text-4xl md:text-5xl font-black font-mono tracking-tight transition-colors duration-200 ${
          isCritical
            ? "text-[#FF6577] drop-shadow-[0_0_12px_rgba(255,77,97,0.35)]"
            : isChanging
            ? "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]"
            : "text-white"
        }`}
      >
        {displayScore}
      </span>

      <span className="relative z-10 text-sm md:text-base font-normal font-mono text-white/50">
        / 100
      </span>
    </div>
  )
}
