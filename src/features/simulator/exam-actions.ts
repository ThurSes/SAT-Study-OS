"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validExamCommand } from "@/lib/sat/exam";
import type { ExamCommand, ExamSnapshot, SaveResult } from "@/types/domain";

/** Keep media private: only owner-scoped storage paths can be signed. */
async function signMedia(snapshot: ExamSnapshot, db: Awaited<ReturnType<typeof createClient>>, owner: string): Promise<ExamSnapshot> {
  const text = JSON.stringify(snapshot).replace(/exam-asset:\/\/([a-zA-Z0-9/_\-.]+)/g, (_ref, path: string) => {
    if (!path.startsWith(`${owner}/`) || path.includes("..")) throw new Error("Invalid private media path");
    return `/api/exam-assets/${path}`;
  });
  const refs = [...new Set(text.match(/storage:\/\/sat-exam-assets\/[a-zA-Z0-9/_\-.]+/g) ?? [])];
  const replacements = new Map<string,string>();
  await Promise.all(refs.map(async ref => {
    const path = ref.slice("storage://sat-exam-assets/".length);
    if (!path.startsWith(`${owner}/`) || path.includes("..")) throw new Error("Invalid private media path");
    const { data, error } = await db.storage.from("sat-exam-assets").createSignedUrl(path, 300);
    if (error || !data) throw new Error("Private media unavailable");
    replacements.set(ref,data.signedUrl);
  }));
  return JSON.parse(text.replace(/storage:\/\/sat-exam-assets\/[a-zA-Z0-9/_\-.]+/g, ref => replacements.get(ref) ?? ref)) as ExamSnapshot;
}
export async function runExamCommand(command: ExamCommand): Promise<SaveResult<ExamSnapshot>> {
  if (!validExamCommand(command)) return { ok:false, error:"Ação inválida. Confira sua resposta e tente novamente." };
  try {
    const db = await createClient();
    const { data:identity } = await db.auth.getUser();
    if (!identity.user) return { ok:false,error:"Sua sessão expirou. Entre novamente; o tempo da prova continua." };
    const { data,error } = await db.rpc("sat_exam_command",{p_command:command});
    if (error || !data) {
      const message = error?.message ?? "";
      const reason = message.includes("Revision conflict") ? "Outra aba ou a passagem de módulo alterou a prova. Recarregue o estado confirmado antes de continuar." :
        message.includes("insufficient") ? "O banco revisado ainda não cobre os dois caminhos de cada seção." :
        /closed|current module/.test(message) ? "O prazo deste módulo terminou. Recarregue o estado confirmado." :
        message.includes("Invalid numeric") ? "Use um número ou fração válida, com até cinco caracteres (seis com sinal negativo)." :
        "Não foi possível confirmar a operação. Suas alterações locais foram preservadas; tente novamente.";
      return {ok:false,error:reason};
    }
    const snapshot=await signMedia(data as ExamSnapshot,db,identity.user.id);
    if (snapshot.status==="completed") { revalidatePath("/historico"); revalidatePath("/erros"); revalidatePath("/"); }
    return {ok:true,value:snapshot};
  } catch { return {ok:false,error:"Conexão indisponível. Tente novamente; o tempo da prova continua."}; }
}
