import React from "react"
import { ShieldCheck, Terminal, Menu, Sparkles } from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"
import { HealthInfo } from "@/types"

interface TopbarProps {
  onToggleMobileMenu?: () => void
  health: HealthInfo | null
  activeTabLabel: string
  onOpenShowcase?: () => void
}

export function Topbar({
  onToggleMobileMenu,
  health,
  activeTabLabel,
  onOpenShowcase,
}: TopbarProps) {
  const isOllamaConnected = health?.ollama?.connected ?? false

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-white/10 bg-[#050608]/85 backdrop-blur-md px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden text-[#A3A9B7] hover:text-[#F5F7FC] p-1"
          aria-label="Open mobile menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-[#F5F7FC]">{activeTabLabel}</span>
      </div>

      <div className="flex items-center gap-3">
        {onOpenShowcase && (
          <button
            onClick={onOpenShowcase}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-all"
          >
            <Sparkles className="h-3 w-3" />
            <span>Showcase Landing</span>
          </button>
        )}

        <div className="hidden sm:flex items-center gap-2 rounded-md border border-white/10 bg-[#0A0C11] px-2.5 py-1 text-xs font-mono text-[#A3A9B7]">
          <Terminal className="h-3.5 w-3.5 text-white" />
          <span>Local Engine: fail-closed</span>
        </div>

        <StatusBadge
          variant={isOllamaConnected ? "allow" : "warn"}
          className="text-[11px] font-mono tracking-wider uppercase font-medium"
          icon={<ShieldCheck className="h-3 w-3" />}
        >
          {isOllamaConnected ? "GEMMA 4 READY" : "BASELINE ACTIVE"}
        </StatusBadge>
      </div>
    </header>
  )
}
