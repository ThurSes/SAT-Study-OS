"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { siteUrl, supabaseConfig } from "@/lib/supabase/config";
import { safeNext } from "./redirect";

export interface AuthState { error?: string; message?: string }

export async function authenticate(_state: AuthState, form: FormData): Promise<AuthState> {
  if (!supabaseConfig()) return { error: "A conexão com Supabase ainda não foi configurada." };
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const mode = String(form.get("mode") || "login");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: "Informe um e-mail válido." };
  if (mode !== "recover" && (password.length < 8 || password.length > 128)) return { error: "Use uma senha entre 8 e 128 caracteres." };
  const db = await createClient();
  try {
    if (mode === "recover") {
      const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/callback?next=/recuperar` });
      if (error) return { error: "Não foi possível solicitar a recuperação agora. Tente novamente em alguns minutos." };
      return { message: "Se existir uma conta com esse e-mail, você receberá o link para redefinir a senha." };
    }
    if (mode === "signup") {
      const name = String(form.get("name") || "").trim();
      if (!name || name.length > 80) return { error: "Informe seu nome (até 80 caracteres)." };
      const { data, error } = await db.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: `${siteUrl()}/auth/callback` } });
      if (error) return { error: "Não foi possível criar a conta. Verifique os dados ou tente recuperar seu acesso." };
      if (!data.session) return { message: "Confira seu e-mail para confirmar a conta antes de entrar." };
    } else if (mode === "login") {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) return { error: "E-mail ou senha inválidos, ou conta ainda não confirmada." };
    } else return { error: "Solicitação inválida." };
  } catch { return { error: "Não foi possível conectar. Verifique sua conexão e tente novamente." }; }
  revalidatePath("/", "layout");
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  const db = await createClient();
  const { error } = await db.auth.signOut();
  if (error) throw new Error("Não foi possível sair. Tente novamente.");
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function updatePassword(_state: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") || "");
  if (password.length < 8 || password.length > 128 || password !== form.get("confirmation")) return { error: "As senhas devem ser iguais e ter entre 8 e 128 caracteres." };
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) return { error: "Abra novamente o link de recuperação enviado por e-mail." };
  const { error } = await db.auth.updateUser({ password });
  return error ? { error: "Não foi possível alterar a senha. Solicite um novo link de recuperação." } : { message: "Senha atualizada. Você já pode continuar seus estudos." };
}
