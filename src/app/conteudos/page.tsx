import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { lessons } from "@/features/content/content-catalog";
import { ContentView } from "@/features/content/content-view";
import { saveLessonProgress } from "@/features/workspace/actions";
import { createClient, getIdentity } from "@/lib/supabase/server";
import type { LessonProgress } from "@/types/domain";

export const metadata: Metadata = { title: "Conteúdos | SAT Study OS" };

export default async function ContentPage() {
  let signedIn = false;
  let progressUnavailable = false;
  let progress: LessonProgress[] = [];
  try {
    const user = await getIdentity();
    signedIn = Boolean(user);
    if (user) {
      const db = await createClient();
      const { data, error } = await db.from("sat_lesson_progress").select("lesson_id,completed,notes").eq("user_id", user.id).limit(500);
      if (error) progressUnavailable = true;
      else progress = (data || []).map(row => ({ lessonId: row.lesson_id, completed: row.completed, notes: row.notes }));
    }
  } catch { progressUnavailable = true; }
  return <AppShell activePage="content"><ContentView lessons={lessons} initialProgress={progress} onSaveProgress={signedIn && !progressUnavailable ? saveLessonProgress : undefined} progressUnavailable={progressUnavailable} developmentData={false} /></AppShell>;
}
