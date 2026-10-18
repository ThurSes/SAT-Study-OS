import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth/auth-form";
import { getIdentity } from "@/lib/supabase/server";

export const metadata = { title: "Redefinir senha" };
export default async function RecoveryPage() {
  if (!await getIdentity()) redirect("/login");
  return <main id="main-content" className="app-main"><AuthForm configured recovery /></main>;
}
