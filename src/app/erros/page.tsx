import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { ErrorDiaryView } from "@/features/errors/error-diary-view";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireWorkspace } from "@/lib/supabase/workspace";
import { questionSkills } from "@/features/questions/catalog";
import { saveErrorReflection, reviewError } from "@/features/workspace/actions";

export const metadata: Metadata = { title: "Diário de erros" };

export default async function ErrorsPage() {
  if (supabaseConfig()) {
    const { errorRecords, referenceDate } = await requireWorkspace();
    return <AppShell activePage="errors"><ErrorDiaryView initialRecords={errorRecords} skills={questionSkills} referenceDate={referenceDate} onSaveReflection={saveErrorReflection} onReview={reviewError} developmentData={false} /></AppShell>;
  }
  if (process.env.NODE_ENV !== "development") return <ConfigurationNotice />;
  const { getDevelopmentData } = await import("@/features/development/fixtures");
  const { errorRecords, skills, referenceDate } = getDevelopmentData();
  return <AppShell activePage="errors" developmentData><ErrorDiaryView initialRecords={errorRecords} skills={skills} referenceDate={referenceDate} /></AppShell>;
}
