import React from "react"
import { Sliders, Lock, Unlock, KeyRound, Layers, RotateCcw } from "lucide-react"
import { TargetUrlInput } from "./TargetUrlInput"
import { TactileSettingCard } from "./TactileSettingCard"

interface LiveAttributesSandboxProps {
  customUrl: string
  setCustomUrl: (url: string) => void
  isHttps: boolean
  setIsHttps: (val: boolean) => void
  hasPasswordField: boolean
  setHasPasswordField: (val: boolean) => void
  isMixedContent: boolean
  setIsMixedContent: (val: boolean) => void
  onResetToFixture?: () => void
}

export function LiveAttributesSandbox({
  customUrl,
  setCustomUrl,
  isHttps,
  setIsHttps,
  hasPasswordField,
  setHasPasswordField,
  isMixedContent,
  setIsMixedContent,
  onResetToFixture,
}: LiveAttributesSandboxProps) {
  const lowerUrl = customUrl.toLowerCase()
  const isPlainHttp = !isHttps || lowerUrl.startsWith("http://")

  // Determine risky state for each individual control
  const isTlsRisky = !isHttps
  const isPasswordRisky = hasPasswordField && isPlainHttp
  const isMixedRisky = isMixedContent

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#121622]/90 via-[#0C0E15]/95 to-[#07090D]/95 p-5 md:p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_12px_32px_-8px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all duration-300 hover:border-white/15 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_16px_40px_-8px_rgba(255,255,255,0.03)] space-y-5">
      {/* Top Hairline Metallic Specular Edge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      {/* Header with Title and Engine Status */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white shadow-inner">
            <Sliders className="h-3.5 w-3.5 text-white/90" />
          </span>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Live Attributes Sandbox
            </h3>
            <p className="text-[10px] font-mono text-[#A3A9B7]">
              Interactive Local-First Policy Evaluation Module
            </p>
          </div>
        </div>

        {onResetToFixture && (
          <button
            type="button"
            onClick={onResetToFixture}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-mono text-white/60 hover:border-white/20 hover:bg-white/10 hover:text-white transition-all active:scale-95"
            title="Reset parameters to current scenario default"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">Reset Fixture</span>
          </button>
        )}
      </div>

      {/* Secure Terminal Input for Target URL */}
      <TargetUrlInput
        value={customUrl}
        onChange={setCustomUrl}
        onResetDefault={onResetToFixture}
      />

      {/* Tactile Setting Cards Grid */}
      <div className="space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[#A3A9B7]">
          Attribute Toggles & DOM Heuristics
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card 1: TLS / HTTPS Transport */}
          <TactileSettingCard
            id="toggle-tls"
            title="TLS / HTTPS"
            description="Cryptographic transport layer (TLS 1.3 encrypted socket)"
            icon={
              isHttps ? (
                <Lock className="h-4 w-4" />
              ) : (
                <Unlock className="h-4 w-4" />
              )
            }
            checked={isHttps}
            onChange={setIsHttps}
            isRisky={isTlsRisky}
            riskType="critical"
            riskBadge={isTlsRisky ? "NO ENCRYPTION" : undefined}
          />

          {/* Card 2: Password Field */}
          <TactileSettingCard
            id="toggle-password"
            title="Password Field"
            description="Sensitive DOM credential element `<input type='password'>`"
            icon={<KeyRound className="h-4 w-4" />}
            checked={hasPasswordField}
            onChange={setHasPasswordField}
            isRisky={isPasswordRisky}
            riskType="critical"
            riskBadge={isPasswordRisky ? "INVARIANT BREACH" : undefined}
          />

          {/* Card 3: Insecure Mixed Content Subresources (Full Width) */}
          <div className="sm:col-span-2">
            <TactileSettingCard
              id="toggle-mixed-content"
              title="Insecure Mixed Content Subresources"
              description="HTTP images, scripts, or iframes embedded within an HTTPS frame context"
              icon={<Layers className="h-4 w-4" />}
              checked={isMixedContent}
              onChange={setIsMixedContent}
              isRisky={isMixedRisky}
              riskType="warning"
              riskBadge={isMixedRisky ? "+20 SUBRES RISK" : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
