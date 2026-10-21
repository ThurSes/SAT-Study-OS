import type { Metadata } from "next";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { SimulatorSession } from "@/features/simulator/simulator-session";
import { supabaseConfig } from "@/lib/supabase/config";
import { getIdentity, createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { questions as catalog, questionSkills, simulatorPlan as catalogPlan } from "@/features/questions/catalog";
import { saveSimulatorEvent } from "@/features/simulator/actions";
import type { StoredSimulatorSession } from "@/types/domain";

export const metadata: Metadata = { title: "Sessão de Reading and Writing" };

export default async function SimulatorPage() {
  if (supabaseConfig()) {
    if (!await getIdentity()) redirect("/login?next=/simulador/treino");
    const db = await createClient();
    const { data, error } = await db.rpc("sat_simulator_event", { p_request_id: crypto.randomUUID(), p_expected_revision: null, p_event: { type: "read" } });
    if (error || !data) throw new Error("Não foi possível retomar a sessão. Confira a conexão e a migration do simulador.");
    return <SimulatorSession plan={catalogPlan} questions={catalog} skills={questionSkills} initialStored={data as StoredSimulatorSession} onSaveEvent={saveSimulatorEvent} />;
  }
  if (process.env.NODE_ENV !== "development") return <ConfigurationNotice />;
  const { getDevelopmentData } = await import("@/features/development/fixtures");
  const { questions, simulatorPlan, skills } = getDevelopmentData();
  return <SimulatorSession plan={simulatorPlan} questions={questions} skills={skills} />;
}
