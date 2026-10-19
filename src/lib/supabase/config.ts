export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  try {
    if (new URL(url).protocol !== "https:") return null;
  } catch { return null; }
  return { url, key };
}

export function siteUrl() {
  const deploymentHost = process.env.VERCEL_ENV === "preview"
    ? process.env.VERCEL_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const candidates = [configured, deploymentHost ? `https://${deploymentHost}` : undefined];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) continue;
      // A local .env copied to Vercel must never send confirmation links to localhost.
      if (local && (process.env.VERCEL || deploymentHost)) continue;
      if (url.protocol === "https:" || (url.protocol === "http:" && local)) return url.origin;
    } catch { /* Try the trusted deployment environment instead of a request Host header. */ }
  }
  if (!process.env.VERCEL && !deploymentHost && process.env.NODE_ENV !== "production" && !configured) return "http://127.0.0.1:3000";
  throw new Error("Configure NEXT_PUBLIC_SITE_URL com a URL HTTPS da aplicação.");
}
