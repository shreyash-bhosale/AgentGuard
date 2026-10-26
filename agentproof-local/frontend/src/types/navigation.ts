import {
  Sparkles,
  LayoutDashboard,
  FlaskConical,
  FolderKanban,
  SearchCode,
  LineChart,
  FileText,
  Settings,
  Lock,
  BookOpen,
  ShieldAlert,
  Eye,
  LucideIcon,
} from "lucide-react"

export interface NavItem {
  id: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { id: "landing", label: "Showcase Landing", icon: Sparkles },
  { id: "multimodal", label: "Multimodal Threat AI (Gemma 4)", icon: Eye },
  { id: "testing", label: "Live Testing & Fixtures", icon: ShieldAlert },
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "lab", label: "Evaluation Lab", icon: FlaskConical },
  { id: "policy", label: "Policy Simulator", icon: Lock },
  { id: "scenarios", label: "Scenarios", icon: FolderKanban },
  { id: "results", label: "Results Explorer", icon: SearchCode },
  { id: "analysis", label: "Security Analysis", icon: LineChart },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "glossary", label: "Security Glossary", icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings },
]
