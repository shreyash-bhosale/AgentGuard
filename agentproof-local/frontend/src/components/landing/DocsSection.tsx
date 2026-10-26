import React, { useState } from "react"
import {
  BookOpen,
  Terminal,
  Copy,
  Check,
  Shield,
  Cpu,
  Code,
  GitBranch,
  Layers,
  ArrowRight,
  Server,
  Network,
} from "lucide-react"

export function DocsSection() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const SNIPPETS = [
    {
      step: "01",
      title: "1. Quickstart & Installation",
      desc: "Clone repository, create virtual environment, and install dependencies:",
      motif: "REPOSITORY & ISOLATION",
      badge: "LOCALLY DEPLOYED",
      motifIcon: GitBranch,
      code: `git clone https://github.com/shreyash-bhosale/AgentGuard.git
cd AgentGuard/agentproof-local
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m pytest -v`,
      tag: "git://AgentGuard/local",
    },
    {
      step: "02",
      title: "2. Connect Local Ollama (Optional)",
      desc: "Run a quantized local model without internet access or external API costs:",
      motif: "AIR-GAP CONTAINMENT",
      badge: "ZERO TELEMETRY",
      motifIcon: Shield,
      code: `ollama run gemma4:e2b-it-qat
curl http://localhost:11434/api/tags`,
      tag: "localhost:11434 // AIR-GAPPED",
    },
    {
      step: "03",
      title: "3. Start Backend & Modern Frontend",
      desc: "Launch the FastAPI security server and Vite React dashboard:",
      motif: "LINKED SERVICE NODES",
      badge: "LOCAL REST + VITE",
      motifIcon: Network,
      code: `# Terminal 1: Backend REST Engine
uvicorn agentproof.server:app --host 127.0.0.1 --port 8000

# Terminal 2: Modern 3D Web UI
cd frontend && npm run dev -- --port 5173`,
      tag: ":8000 (REST) + :5173 (UI)",
    },
  ]

  return (
    <section id="docs" className="relative py-24 bg-transparent text-[#F5F7FC] border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6 md:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-mono font-medium text-white mb-4 backdrop-blur-md shadow-sm">
            <BookOpen className="h-3.5 w-3.5 text-white" />
            <span>DEVELOPER DOCUMENTATION</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#F5F7FC]">
            Simple Integration. Provable Safety.
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-[#A3A9B7] max-w-2xl mx-auto leading-relaxed">
            Deploy locally in less than 3 minutes. Air-gapped, zero-telemetry, and fully open-source.
          </p>
        </div>

        {/* Numbered Progression Rail Connecting Steps 01 -> 02 -> 03 */}
        <div className="relative mb-8 hidden md:block">
          <div className="flex items-center justify-between max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-2 text-xs font-mono text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/30 bg-white/10 text-[10px] font-bold">
                01
              </span>
              <span className="text-white/70">Clone & Virtualenv</span>
            </div>

            {/* Connecting Signal Path */}
            <div className="flex-1 mx-6 h-[1px] bg-gradient-to-r from-white/30 via-white/50 to-white/30 relative">
              <div
                className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white to-transparent"
                style={{ animation: "scanline-sweep 3s ease-in-out infinite" }}
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/30 bg-white/10 text-[10px] font-bold">
                02
              </span>
              <span className="text-white/70">Quantized LLM (Optional)</span>
            </div>

            {/* Connecting Signal Path */}
            <div className="flex-1 mx-6 h-[1px] bg-gradient-to-r from-white/30 via-white/50 to-white/30 relative">
              <div
                className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white to-transparent"
                style={{ animation: "scanline-sweep 3s ease-in-out infinite", animationDelay: "1.5s" }}
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/30 bg-white/10 text-[10px] font-bold">
                03
              </span>
              <span className="text-white/70">Launch Stack</span>
            </div>
          </div>
        </div>

        {/* Three Developer Console Modules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SNIPPETS.map((snippet, idx) => {
            const Icon = snippet.motifIcon
            return (
              <div
                key={idx}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/12 bg-gradient-to-b from-[#11141E]/95 via-[#0B0D14]/95 to-[#07090E]/98 p-6 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_16px_40px_-8px_rgba(0,0,0,0.85)] hover:border-white/25 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_20px_50px_-8px_rgba(255,255,255,0.03)] hover:-translate-y-1.5 transition-all duration-300"
              >
                {/* Top Metallic Specular Edge */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:via-white/50 transition-colors" />

                {/* Subtle Internal Scan Glow on Hover */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    backgroundImage: `
                      radial-gradient(circle at 85% 15%, rgba(255, 255, 255, 0.05) 0%, transparent 60%)
                    `,
                  }}
                />

                <div className="relative z-10">
                  {/* Step Top Bar: Motif & Micro Badge */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-white shadow-inner">
                        <Icon className="h-3.5 w-3.5 text-white" />
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                        {snippet.motif}
                      </span>
                    </div>

                    <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[9px] font-mono font-bold text-white uppercase tracking-wider">
                      {snippet.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1.5 mb-4">
                    <h3 className="text-xs font-mono font-bold text-white tracking-tight">
                      {snippet.title}
                    </h3>
                    <p className="text-xs text-[#A3A9B7] leading-relaxed line-clamp-2">
                      {snippet.desc}
                    </p>
                  </div>
                </div>

                {/* Secure Near-Black Inset Terminal */}
                <div className="relative z-10 rounded-xl border border-white/10 bg-[#050608] p-4 text-xs font-mono text-white shadow-inner group/terminal">
                  {/* Terminal Header Bar */}
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/5 text-[10px] font-mono text-white/40">
                    <span className="truncate pr-2">{snippet.tag}</span>
                    <button
                      onClick={() => copyToClipboard(snippet.code, idx)}
                      className="inline-flex items-center gap-1 text-[#A3A9B7] hover:text-white transition-colors shrink-0 p-1 rounded hover:bg-white/10"
                      title="Copy command"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="h-3 w-3 text-white" />
                          <span className="text-white">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Code Body */}
                  <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed text-[11px] font-mono text-white/90 selection:bg-white/20">
                    <code>{snippet.code}</code>
                  </pre>
                </div>
              </div>
            )
          })}
        </div>

        {/* Trusted System Assurance Footer Bar */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-[11px] font-mono text-white/50">
          <div className="flex items-center gap-2 text-white/70">
            <Shield className="h-3.5 w-3.5 text-white" />
            <span>Deterministic AI Containment • Local Zero-Knowledge Deployment</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[10px]">
            <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5">
              100% AIR-GAPPED
            </span>
            <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5">
              ZERO TELEMETRY
            </span>
            <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5">
              OPEN SOURCE APACHE-2.0
            </span>
          </div>
        </div>

      </div>
    </section>
  )
}
