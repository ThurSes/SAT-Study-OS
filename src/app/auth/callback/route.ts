import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl, supabaseConfig } from "@/lib/supabase/config";
import { safeNext } from "@/features/auth/redirect";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (!supabaseConfig()) return NextResponse.redirect(new URL("/login?error=link", siteUrl()));
  const db = await createClient();
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  let success = false;
  if (code) success = !(await db.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && (type === "email" || type === "signup" || type === "recovery")) success = !(await db.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  const next = type === "recovery" ? "/recuperar" : safeNext(params.get("next"));
  const response = NextResponse.redirect(new URL(success ? next : "/login?error=link", siteUrl()));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
