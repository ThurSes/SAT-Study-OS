import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth/auth-form";
import { safeNext } from "@/features/auth/redirect";
import { supabaseConfig } from "@/lib/supabase/config";
import { getIdentity } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "Entrar na sua conta" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  if (await getIdentity()) redirect(safeNext(params.next));
  return <main id="main-content" className="app-main"><div className="workspace-actions" style={{ justifyContent: "flex-end", marginBottom: 24 }}><ThemeToggle /></div>{params.error && <p role="alert">O link expirou ou não é válido. Solicite um novo link abaixo.</p>}<AuthForm configured={Boolean(supabaseConfig())} next={safeNext(params.next)} /></main>;
}
