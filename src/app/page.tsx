import { AppShell } from "@/components/app-shell";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { DashboardView } from "@/features/dashboard/dashboard-view";

export default async function DashboardPage() {
  if (process.env.NODE_ENV !== "development") return <ConfigurationNotice />;
  const { getDevelopmentData } = await import("@/features/development/fixtures");
  const { dashboardData } = getDevelopmentData();
  return <AppShell activePage="dashboard" developmentData><DashboardView data={dashboardData} developmentData /></AppShell>;
}
