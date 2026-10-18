import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { HistoryView } from "@/features/history/history-view";

export const metadata: Metadata = { title: "Histórico de avaliações" };

export default async function HistoryPage() {
  if (process.env.NODE_ENV !== "development") return <ConfigurationNotice />;
  const { getDevelopmentData } = await import("@/features/development/fixtures");
  const { dashboardData } = getDevelopmentData();
  return <AppShell activePage="history" developmentData><HistoryView initialResults={dashboardData.history} /></AppShell>;
}
