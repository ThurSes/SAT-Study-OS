import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { getIdentity } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { runExamCommand } from "@/features/simulator/exam-actions";
import { ExamWorkspace } from "@/features/simulator/exam-workspace";
export const metadata={title:"Simulado adaptativo"};
export default async function ExamPage({searchParams}:{searchParams:Promise<{attempt?:string}>}) {
  if (!supabaseConfig()) return <ConfigurationNotice />;
  if (!await getIdentity()) redirect("/login?next=/simulador");
  const {attempt}=await searchParams;
  const result=await runExamCommand({operation:"sync",requestId:crypto.randomUUID(),...(attempt?{attemptId:attempt}:{})});
  if (!result.ok) return <main className="configuration-notice"><h1>Não foi possível abrir o simulado.</h1><p role="alert">{result.error}</p><Link href="/simulador">Tentar novamente</Link><p><Link href="/simulador/treino">Abrir treino curto</Link></p></main>;
  return <ExamWorkspace initialSnapshot={result.value} onCommand={runExamCommand} />;
}
