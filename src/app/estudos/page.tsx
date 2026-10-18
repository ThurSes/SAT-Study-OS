import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { StudyView } from "@/features/study/study-view";
import { supabaseConfig } from "@/lib/supabase/config";
import { requireWorkspace } from "@/lib/supabase/workspace";
import { questionSkills } from "@/features/questions/catalog";
import { contentSkills } from "@/features/content/content-catalog";
import { saveStudyItem } from "@/features/workspace/actions";

export const metadata: Metadata = { title: "Estudos e agenda" };

export default async function StudiesPage() {
  if (supabaseConfig()) {
    const { studyItems, referenceDate, user } = await requireWorkspace();
    const skills = [...new Map([...questionSkills, ...contentSkills].map(skill => [skill.id, skill])).values()];
    return <AppShell activePage="study"><StudyView initialItems={studyItems} skills={skills} referenceDate={referenceDate} userId={user.id} onSave={saveStudyItem} developmentData={false} /></AppShell>;
  }
  if (process.env.NODE_ENV !== "development") return <ConfigurationNotice />;
  const { getDevelopmentData } = await import("@/features/development/fixtures");
  const { studyItems, skills, referenceDate, developmentUserId } = getDevelopmentData();
  return <AppShell activePage="study" developmentData><StudyView initialItems={studyItems} skills={skills} referenceDate={referenceDate} userId={developmentUserId} /></AppShell>;
}
