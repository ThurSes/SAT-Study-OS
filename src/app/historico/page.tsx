import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { HistoryView } from "@/features/history/history-view";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireWorkspace } from "@/lib/supabase/workspace";
import { saveAssessment } from "@/features/workspace/actions";

export const metadata: Metadata = { title: "Histórico de avaliações" };

export default async function HistoryPage() {
  if (supabaseConfig()) {
    const { history } = await requireWorkspace();
    return <AppShell activePage="history"><HistoryView initialResults={history} onSave={saveAssessment} developmentData={false} /></AppShell>;
  }
  if (process.env.NODE_ENV !== "development") return <ConfigurationNotice />;
  const { getDevelopmentData } = await import("@/features/development/fixtures");
  const { dashboardData } = getDevelopmentData();
  return <AppShell activePage="history" developmentData><HistoryView initialResults={dashboardData.history} /></AppShell>;
}
