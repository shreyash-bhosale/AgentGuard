import React, { useState } from "react"
import { Globe, Lock, Unlock, AlertTriangle, ShieldCheck, X, RotateCcw } from "lucide-react"

interface TargetUrlInputProps {
  value: string
  onChange: (value: string) => void
  onResetDefault?: () => void
}

export function TargetUrlInput({
  value,
  onChange,
  onResetDefault,
}: TargetUrlInputProps) {
  const [isFocused, setIsFocused] = useState(false)

  const lower = value.toLowerCase()
  const isHttps = lower.startsWith("https://")
  const isHttp = lower.startsWith("http://")
  const isPunycode = lower.includes("xn--")
  const isIpLiteral = /^(?:https?:\/\/)?(?:\d{1,3}\.){3}\d{1,3}/.test(lower)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor="target-url-input"
          className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#A3A9B7]"
        >
          <Globe className="h-3 w-3 text-white/60" />
          <span>Target URL (Deterministic Evaluation Target)</span>
        </label>
        {onResetDefault && (
          <button
            type="button"
            onClick={onResetDefault}
            className="inline-flex items-center gap-1 text-[10px] font-mono text-white/50 hover:text-white transition-colors"
            title="Reset URL"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Terminal Input Container */}
      <div
        className={`relative flex items-center rounded-xl border bg-black/60 transition-all duration-200 ${
          isFocused
            ? "border-white/40 shadow-[0_0_20px_-3px_rgba(255,255,255,0.12),inset_0_1px_0_0_rgba(255,255,255,0.15)] ring-1 ring-white/20"
            : "border-white/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:border-white/25"
        }`}
      >
        {/* Animated Scan Line on Focus */}
        {isFocused && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[1.5px] overflow-hidden rounded-b-xl">
            <div
              className="h-full w-full bg-gradient-to-r from-transparent via-white/80 to-transparent"
              style={{
                animation: "scanline-sweep 2s linear infinite",
              }}
            />
          </div>
        )}

        {/* Terminal Prefix Symbol */}
        <div className="flex h-10 w-9 shrink-0 items-center justify-center border-r border-white/10 text-white/40 font-mono text-xs select-none">
          {isHttps ? (
            <Lock className="h-3.5 w-3.5 text-white/70" />
          ) : isHttp ? (
            <Unlock className="h-3.5 w-3.5 text-[#FF6577]" />
          ) : (
            <span className="text-white/40">&gt;</span>
          )}
        </div>

        {/* Monospaced Input */}
        <input
          id="target-url-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="https://target-domain.com/path"
          className="w-full bg-transparent px-3 py-2.5 text-xs font-mono text-white placeholder:text-white/25 focus:outline-none selection:bg-white/20"
          spellCheck={false}
          autoComplete="off"
        />

        {/* Verification / Status Badges on the right */}
        <div className="flex items-center gap-1.5 pr-2.5 shrink-0">
          {/* Punycode Homograph Alert */}
          {isPunycode && (
            <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-mono font-bold text-amber-300">
              <AlertTriangle className="h-2.5 w-2.5" />
              HOMOGRAPH
            </span>
          )}

          {/* IP Literal Alert */}
          {isIpLiteral && (
            <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-mono font-bold text-amber-300">
              IP-LITERAL
            </span>
          )}

          {/* Transport Security Badge */}
          {isHttps ? (
            <span className="inline-flex items-center gap-1 rounded border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-mono font-medium text-white/90">
              <ShieldCheck className="h-3 w-3 text-white" />
              <span>TLS / HTTPS</span>
            </span>
          ) : isHttp ? (
            <span className="inline-flex items-center gap-1 rounded border border-[#FF6577]/40 bg-[#FF6577]/15 px-2 py-0.5 text-[10px] font-mono font-bold text-[#FF6577]">
              <Unlock className="h-3 w-3 text-[#FF6577]" />
              <span>INSECURE HTTP</span>
            </span>
          ) : (
            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-white/50">
              URI
            </span>
          )}

          {/* Quick Clear Button */}
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="flex h-5 w-5 items-center justify-center rounded text-white/40 hover:bg-white/10 hover:text-white transition-colors"
              title="Clear input"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Concise Technical Helper Text */}
      <div className="flex items-center justify-between text-[10px] font-mono text-[#727B8D] px-1">
        <span>RFC-3986 Standardized URI Parser</span>
        <span className="text-white/40">Zero-Knowledge Local AST Scan</span>
      </div>
    </div>
  )
}
