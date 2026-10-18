"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { authenticate, updatePassword, type AuthState } from "./actions";
import styles from "@/features/workspace/workspace.module.css";

export function AuthForm({ configured, next = "/", recovery = false }: { configured: boolean; next?: string; recovery?: boolean }) {
  const [mode, setMode] = useState("login");
  const [state, action, pending] = useActionState(recovery ? updatePassword : authenticate, {} as AuthState);
  return <div className={styles.panel} style={{ maxWidth: 520, margin: "0 auto" }}>
    <p className={styles.kicker}>SAT Study OS · Sua conta</p>
    <h1 style={{ fontFamily: "var(--font-source-serif)", fontSize: "2.5rem", margin: "16px 0" }}>{recovery ? "Uma nova senha." : mode === "signup" ? "Comece sua trajetória." : mode === "recover" ? "Recupere seu acesso." : "Bom ter você por aqui."}</h1>
    <p className={styles.muted}>Entre para guardar sua agenda, anotações, progresso e revisões na sua conta.</p>
    {!configured && <p role="status" className={styles.note}>A conexão com Supabase aguarda a URL e a chave publicável do projeto. O login ficará disponível após a configuração.</p>}
    <form action={action} className={styles.form}>
      <input type="hidden" name="mode" value={mode} /><input type="hidden" name="next" value={next} />
      {mode === "signup" && !recovery && <div className={`${styles.field} ${styles.full}`}><label htmlFor="auth-name">Seu nome</label><input id="auth-name" name="name" autoComplete="name" maxLength={80} required /></div>}
      {!recovery && <div className={`${styles.field} ${styles.full}`}><label htmlFor="auth-email">E-mail</label><input id="auth-email" name="email" type="email" autoComplete="email" maxLength={254} required /></div>}
      {(mode !== "recover" || recovery) && <div className={`${styles.field} ${styles.full}`}><label htmlFor="auth-password">{recovery ? "Nova senha" : "Senha"}</label><input id="auth-password" name="password" type="password" autoComplete={mode === "signup" || recovery ? "new-password" : "current-password"} minLength={8} maxLength={128} required /></div>}
      {recovery && <div className={`${styles.field} ${styles.full}`}><label htmlFor="auth-confirmation">Repita a nova senha</label><input id="auth-confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></div>}
      {state.error && <p role="alert" className={`${styles.error} ${styles.full}`}>{state.error}</p>}
      {state.message && <p role="status" className={`${styles.feedback} ${styles.full}`}>{state.message}</p>}
      <div className={`${styles.actions} ${styles.full}`}><Button disabled={!configured || pending} type="submit">{pending ? "Aguarde…" : recovery ? "Atualizar senha" : mode === "signup" ? "Criar conta" : mode === "recover" ? "Enviar link" : "Entrar"}</Button></div>
    </form>
    {!recovery && <div className={styles.actions}><Button variant="ghost" disabled={pending} onClick={() => setMode(mode === "signup" ? "login" : "signup")}>{mode === "signup" ? "Já tenho conta" : "Criar uma conta"}</Button><Button variant="ghost" disabled={pending} onClick={() => setMode(mode === "recover" ? "login" : "recover")}>{mode === "recover" ? "Voltar ao login" : "Esqueci minha senha"}</Button></div>}
    <div className={styles.actions}><Link className="text-link" href="/conteudos">Explorar conteúdos</Link><Link className="text-link" href="/">Voltar ao início</Link></div>
  </div>;
}
