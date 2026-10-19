import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { supabaseConfig } from "./config";

export async function createClient() {
  const config = supabaseConfig();
  if (!config) throw new Error("Configure o projeto Supabase para usar sua conta.");
  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Server Components refresh through proxy; Actions can write cookies. */ }
      },
    },
  });
}

export const getIdentity = cache(async () => {
  if (!supabaseConfig()) return null;
  const db = await createClient();
  const { data, error } = await db.auth.getUser();
  return error ? null : data.user;
});
