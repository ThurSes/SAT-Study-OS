import { AppShell } from "@/components/app-shell";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireWorkspace } from "@/lib/supabase/workspace";

export default async function DashboardPage() {
  if (supabaseConfig()) {
    const { dashboardData } = await requireWorkspace();
    return <AppShell activePage="dashboard"><DashboardView data={dashboardData} /></AppShell>;
  }
  if (process.env.NODE_ENV !== "development") return <ConfigurationNotice />;
  const { getDevelopmentData } = await import("@/features/development/fixtures");
  const { dashboardData } = getDevelopmentData();
  return <AppShell activePage="dashboard" developmentData><DashboardView data={dashboardData} developmentData /></AppShell>;
}
