import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { siteUrl, supabaseConfig } from "./config";

beforeEach(() => {
  for (const name of ["NEXT_PUBLIC_SITE_URL", "VERCEL", "VERCEL_ENV", "VERCEL_URL", "VERCEL_PROJECT_PRODUCTION_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) vi.stubEnv(name, undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("Supabase deployment configuration", () => {
  it("requires both API variables without treating .env.example as runtime configuration", () => {
    expect(supabaseConfig()).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    expect(supabaseConfig()).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", " sb_publishable_test\n");
    expect(supabaseConfig()).toEqual({ url: "https://example.supabase.co", key: "sb_publishable_test" });
  });

  it("uses a configured HTTPS origin for confirmation and recovery", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", " https://study.example.com/ ");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "study.vercel.app");
    expect(siteUrl()).toBe("https://study.example.com");
  });

  it("uses the stable production domain on Vercel when Site URL is absent or still local", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "study.vercel.app");
    vi.stubEnv("VERCEL_URL", "study-build.vercel.app");
    expect(siteUrl()).toBe("https://study.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    expect(siteUrl()).toBe("https://study.vercel.app");
  });

  it("keeps a preview's callback on that deployment unless an explicit origin is set", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "study-preview.vercel.app");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "study.vercel.app");
    expect(siteUrl()).toBe("https://study-preview.vercel.app");
  });

  it("allows local development and an explicitly configured local production smoke test", () => {
    expect(siteUrl()).toBe("http://127.0.0.1:3000");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:3002");
    expect(siteUrl()).toBe("http://127.0.0.1:3002");
  });

  it("never silently falls back to localhost in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => siteUrl()).toThrow("NEXT_PUBLIC_SITE_URL");
  });

  it.each(["javascript:alert(1)", "http://study.example.com", "https://user:pass@study.example.com", "https://study.example.com/auth/callback", "https://study.example.com?next=evil", "//evil.example.com"])("rejects invalid callback origins: %s", value => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", value);
    expect(() => siteUrl()).toThrow("NEXT_PUBLIC_SITE_URL");
  });
});
