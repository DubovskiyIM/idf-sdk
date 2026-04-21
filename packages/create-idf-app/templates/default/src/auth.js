import { config } from "./config.js";

/**
 * Создаёт auth-provider в соответствии с VITE_AUTH_PROVIDER env.
 *
 * - "none" (default) → null — scaffold работает без auth
 * - "jwt" → @intent-driven/auth/jwt с VITE_AUTH_SIGN_IN_URL
 * - "supabase" → @intent-driven/auth/supabase; нужен @supabase/supabase-js в deps
 */
export async function createAuthProvider() {
  const kind = config.authProvider;

  if (kind === "none" || !kind) return null;

  if (kind === "jwt") {
    const { createJwtAuth } = await import("@intent-driven/auth/jwt");
    const signInUrl = import.meta.env.VITE_AUTH_SIGN_IN_URL || `${config.apiUrl}/auth/login`;
    return createJwtAuth({ signInUrl });
  }

  if (kind === "supabase") {
    const { createSupabaseAuth } = await import("@intent-driven/auth/supabase");
    const { createClient } = await import("@supabase/supabase-js");
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.warn("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY не заданы — auth отключён");
      return null;
    }
    return createSupabaseAuth(createClient(url, key));
  }

  console.warn(`Unknown VITE_AUTH_PROVIDER: ${kind} — auth отключён`);
  return null;
}
