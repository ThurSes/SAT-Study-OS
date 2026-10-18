import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { ErrorDiaryView } from "@/features/errors/error-diary-view";

export const metadata: Metadata = { title: "Diário de erros" };

export default async function ErrorsPage() {
  if (process.env.NODE_ENV !== "development") return <ConfigurationNotice />;
  const { getDevelopmentData } = await import("@/features/development/fixtures");
  const { errorRecords, skills, referenceDate } = getDevelopmentData();
  return <AppShell activePage="errors" developmentData><ErrorDiaryView initialRecords={errorRecords} skills={skills} referenceDate={referenceDate} /></AppShell>;
}
