import { createClient } from "@/lib/supabase/server";

/** Authenticated media proxy; private originals never enter the public build. */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const reference = path.join("/");
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(reference) || reference.includes("..")) return new Response(null, { status: 404 });
  const db = await createClient();
  const { data: identity } = await db.auth.getUser();
  if (!identity.user) return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  if (!reference.startsWith(`${identity.user.id}/`)) return new Response(null, { status: 404 });
  const { data, error } = await db.rpc("sat_exam_asset", { p_path: reference });
  if (error || !data || !["image/png", "image/jpeg"].includes(data.contentType) || typeof data.base64 !== "string") {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return new Response(Buffer.from(data.base64, "base64"), { headers: {
    "Content-Type": data.contentType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin",
  } });
}
