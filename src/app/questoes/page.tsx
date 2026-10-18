import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { QuestionBankView } from "@/features/questions/question-bank-view";

export const metadata: Metadata = { title: "Banco de questões" };

export default async function QuestionsPage() {
  if (process.env.NODE_ENV !== "development") return <ConfigurationNotice />;
  const { getDevelopmentData } = await import("@/features/development/fixtures");
  const { questions, skills } = getDevelopmentData();
  return <AppShell activePage="questions" developmentData><QuestionBankView questions={questions} skills={skills} /></AppShell>;
}
