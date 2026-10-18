import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { StudyView } from "@/features/study/study-view";

export const metadata: Metadata = { title: "Estudos e agenda" };

export default async function StudiesPage() {
  if (process.env.NODE_ENV !== "development") return <ConfigurationNotice />;
  const { getDevelopmentData } = await import("@/features/development/fixtures");
  const { studyItems, skills, referenceDate, developmentUserId } = getDevelopmentData();
  return <AppShell activePage="study" developmentData><StudyView initialItems={studyItems} skills={skills} referenceDate={referenceDate} userId={developmentUserId} /></AppShell>;
}
