import React, { useState, useEffect, useCallback } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { LandingPage } from "@/components/landing/LandingPage"
import { OverviewView } from "@/components/dashboard/OverviewView"
import { EvaluationLabView } from "@/components/evaluation/EvaluationLabView"
import { ScenarioExplorerView } from "@/components/scenarios/ScenarioExplorerView"
import { ResultsExplorerView } from "@/components/results/ResultsExplorerView"
import { SecurityAnalysisView } from "@/components/analysis/SecurityAnalysisView"
import { ReportsView } from "@/components/reports/ReportsView"
import { SettingsView } from "@/components/settings/SettingsView"
import { PolicySimulatorView } from "@/components/policy/PolicySimulatorView"
import { SecurityGlossaryView } from "@/components/glossary/SecurityGlossaryView"
import { LiveTestingView } from "@/components/testing/LiveTestingView"
import { MultimodalAnalysisView } from "@/components/analysis/MultimodalAnalysisView"
import {
  fetchHealth,
  fetchModels,
  fetchScenarios,
  fetchEvaluations,
  fetchEvaluationDetail,
  runEvaluation,
  addCustomScenario,
} from "@/lib/api"
import {
  EvaluationReport,
  EvaluationRunSummary,
  HealthInfo,
  ModelsInfo,
  ScenarioModel,
} from "@/types"
import { DEMO_REPORT, DEMO_RUNS_HISTORY, DEMO_SCENARIOS } from "@/lib/demoData"

export function App() {
  const [currentTab, setCurrentTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      return params.get("page") || params.get("tab") || "landing"
    }
    return "landing"
  })
  const [health, setHealth] = useState<HealthInfo | null>(null)
  const [modelsInfo, setModelsInfo] = useState<ModelsInfo | null>(null)
  const [scenarios, setScenarios] = useState<ScenarioModel[]>(DEMO_SCENARIOS)
  const [latestReport, setLatestReport] = useState<EvaluationReport | null>(DEMO_REPORT)
  const [runsHistory, setRunsHistory] = useState<EvaluationRunSummary[]>(DEMO_RUNS_HISTORY)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const loadHealthAndModels = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const [h, m] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchModels().catch(() => null),
      ])
      setHealth(h)
      setModelsInfo(m)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  const loadData = useCallback(async () => {
    await loadHealthAndModels()
    try {
      const [sc, runs] = await Promise.all([
        fetchScenarios().catch(() => []),
        fetchEvaluations().catch(() => []),
      ])
      if (sc && sc.length > 0) {
        setScenarios(sc)
      }
      if (runs && runs.length > 0) {
        setRunsHistory(runs)
        const detail = await fetchEvaluationDetail(runs[0].run_id).catch(() => null)
        if (detail) setLatestReport(detail)
      }
    } catch (err) {
      console.error("Failed to load initial data", err)
    }
  }, [loadHealthAndModels])

  useEffect(() => {
    loadData()
  }, [])

  const handleRunEvaluation = async (params: {
    mode: "baseline" | "llm"
    model_name?: string
    timeout?: number
    scenario_ids?: string[]
  }) => {
    setIsRunning(true)
    try {
      const report = await runEvaluation(params)
      setLatestReport(report)
      const updatedHistory = await fetchEvaluations().catch(() => [])
      setRunsHistory(updatedHistory)
      showNotification(
        `Evaluation completed! ${report.results.length} scenarios evaluated. Accuracy: ${report.summary_metrics.policy_accuracy_pct}%`,
        "success"
      )
    } catch (err: any) {
      showNotification(`Evaluation failed: ${err.message}`, "error")
    } finally {
      setIsRunning(false)
    }
  }

  const handleQuickRunBaseline = async () => {
    await handleRunEvaluation({ mode: "baseline" })
  }

  const handleAddCustomScenario = async (newSc: {
    id: string
    description: string
    action: string
    target: string
    rationale: string
    expected_allowed: boolean
    category: string
  }) => {
    const res = await addCustomScenario(newSc)
    setScenarios((prev) => [...prev, res.scenario])
    showNotification(`Added scenario '${newSc.id}' to session sandbox.`, "success")
  }

  return (
    <AppShell
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      health={health}
      onRefreshHealth={loadHealthAndModels}
      isRefreshing={isRefreshing}
    >
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 text-xs font-semibold shadow-2xl transition-all ${
            notification.type === "success"
              ? "border-[#35C98A]/30 bg-[#0A0C11] text-[#35C98A]"
              : "border-[#FF6577]/30 bg-[#0A0C11] text-[#FF6577]"
          }`}
        >
          <span>{notification.message}</span>
        </div>
      )}

      {/* Landing Showcase Section */}
      {currentTab === "landing" && (
        <LandingPage onOpenDashboard={() => setCurrentTab("overview")} />
      )}

      {/* Multimodal Threat AI (Gemma 4 Cloud) */}
      {currentTab === "multimodal" && (
        <MultimodalAnalysisView />
      )}

      {/* Live Testing Workbench & Fixtures */}
      {currentTab === "testing" && (
        <LiveTestingView />
      )}

      {/* Dashboard Overview */}
      {currentTab === "overview" && (
        <OverviewView
          latestReport={latestReport}
          runsHistory={runsHistory}
          health={health}
          onNavigateTab={setCurrentTab}
          onQuickRunBaseline={handleQuickRunBaseline}
          isRunning={isRunning}
        />
      )}

      {/* Evaluation Lab */}
      {currentTab === "lab" && (
        <EvaluationLabView
          scenarios={scenarios}
          modelsInfo={modelsInfo}
          onRunEvaluation={handleRunEvaluation}
          isRunning={isRunning}
          latestReport={latestReport}
        />
      )}

      {/* Policy Simulator */}
      {currentTab === "policy" && (
        <PolicySimulatorView />
      )}

      {/* Scenarios Explorer */}
      {currentTab === "scenarios" && (
        <ScenarioExplorerView
          scenarios={scenarios}
          onAddCustomScenario={handleAddCustomScenario}
        />
      )}

      {/* Results Explorer */}
      {currentTab === "results" && (
        <ResultsExplorerView latestReport={latestReport} />
      )}

      {/* Security Analysis */}
      {currentTab === "analysis" && (
        <SecurityAnalysisView latestReport={latestReport} />
      )}

      {/* Reports View */}
      {currentTab === "reports" && (
        <ReportsView latestReport={latestReport} />
      )}

      {/* Security Glossary */}
      {currentTab === "glossary" && (
        <SecurityGlossaryView />
      )}

      {/* Settings */}
      {currentTab === "settings" && (
        <SettingsView
          health={health}
          modelsInfo={modelsInfo}
          onRefreshHealth={loadHealthAndModels}
          isRefreshing={isRefreshing}
        />
      )}
    </AppShell>
  )
}

export default App
