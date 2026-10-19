import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { QuestionBankView } from "@/features/questions/question-bank-view";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireWorkspace } from "@/lib/supabase/workspace";
import { questions as catalog, questionSkills } from "@/features/questions/catalog";
import { submitPracticeAnswer, saveErrorReflection } from "@/features/workspace/actions";

export const metadata: Metadata = { title: "Banco de questões" };

export default async function QuestionsPage() {
  if (supabaseConfig()) {
    await requireWorkspace();
    return <AppShell activePage="questions"><QuestionBankView questions={catalog} skills={questionSkills} onSubmitAnswer={submitPracticeAnswer} onSaveReflection={saveErrorReflection} developmentData={false} /></AppShell>;
  }
  if (process.env.NODE_ENV !== "development") return <ConfigurationNotice />;
  const { getDevelopmentData } = await import("@/features/development/fixtures");
  const { questions, skills } = getDevelopmentData();
  return <AppShell activePage="questions" developmentData><QuestionBankView questions={questions} skills={skills} /></AppShell>;
}
