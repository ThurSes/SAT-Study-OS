import type { Metadata } from "next";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { SimulatorSession } from "@/features/simulator/simulator-session";

export const metadata: Metadata = { title: "Sessão de Reading and Writing" };

export default async function SimulatorPage() {
  if (process.env.NODE_ENV !== "development") return <ConfigurationNotice />;
  const { getDevelopmentData } = await import("@/features/development/fixtures");
  const { questions, simulatorPlan, skills } = getDevelopmentData();
  return <SimulatorSession plan={simulatorPlan} questions={questions} skills={skills} />;
}
