"use server";

import { createClient } from "@/lib/supabase/server";
import type { SessionEvent } from "@/lib/sat/session";
import { isUuid } from "@/features/workspace/validation";
import { questions } from "@/features/questions/catalog";
import type { SaveResult, StoredSimulatorSession } from "@/types/domain";

export async function saveSimulatorEvent(requestId: string, revision: number, event: SessionEvent): Promise<SaveResult<StoredSimulatorSession>> {
  if (!isUuid(requestId) || !Number.isInteger(revision) || revision < 0 || !event || !["start", "pause", "resume", "restart", "tick", "select", "toggle-review"].includes(event.type)) return { ok: false, error: "Ação inválida." };
  if ((event.type === "select" || event.type === "toggle-review") && !questions.some(question => question.id === event.questionId && (event.type !== "select" || event.optionId === null || question.options.some(option => option.id === event.optionId)))) return { ok: false, error: "Questão ou alternativa inválida." };
  try {
    const db = await createClient();
    const { data: identity } = await db.auth.getUser();
    if (!identity.user) return { ok: false, error: "Sua sessão de login expirou. Entre novamente para continuar." };
    const { data, error } = await db.rpc("sat_simulator_event", { p_request_id: requestId, p_expected_revision: revision, p_event: event });
    if (error || !data) return { ok: false, error: "Não foi possível confirmar a ação. Tente novamente. Se outra aba alterou a sessão, recarregue para retomar o estado confirmado." };
    return { ok: true, value: data as StoredSimulatorSession };
  } catch { return { ok: false, error: "Conexão indisponível. Tente novamente antes de sair." }; }
}
