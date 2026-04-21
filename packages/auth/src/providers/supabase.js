/**
 * Supabase auth-provider. Wrapper вокруг supabase-js client.
 *
 * @param {SupabaseClient} client — результат createClient() из @supabase/supabase-js
 * @param {{ tokenPrefix?: string }} opts
 */
export function createSupabaseAuth(client, opts = {}) {
  const { tokenPrefix = "Bearer" } = opts;

  if (!client?.auth) {
    throw new Error("createSupabaseAuth: ожидался Supabase client (результат createClient())");
  }

  async function getToken() {
    const { data, error } = await client.auth.getSession();
    if (error || !data?.session?.access_token) return null;
    return `${tokenPrefix} ${data.session.access_token}`;
  }

  async function getUser() {
    const { data } = await client.auth.getUser();
    return data?.user ?? null;
  }

  async function signIn(credentials) {
    // Поддержка { email, password } — типичный Supabase flow.
    // Magic-link и OAuth — отдельные методы (supabase.auth.signInWithOtp и др.);
    // можно использовать client напрямую, provider отдаёт общий CRUD-путь.
    const { data, error } = await client.auth.signInWithPassword(credentials);
    if (error) throw new Error(error.message || "Sign-in failed");
    return {
      user: data?.user ?? null,
      token: data?.session?.access_token ?? null,
    };
  }

  async function signOut() {
    const { error } = await client.auth.signOut();
    if (error) throw new Error(error.message || "Sign-out failed");
  }

  function onChange(listener) {
    const { data } = client.auth.onAuthStateChange((event, session) => {
      listener({ event, session });
    });
    const subscription = data?.subscription;
    return () => subscription?.unsubscribe?.();
  }

  return { getToken, getUser, signIn, signOut, onChange };
}
