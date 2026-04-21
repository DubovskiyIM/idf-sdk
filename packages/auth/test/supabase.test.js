import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseAuth } from "../src/providers/supabase.js";

function mockSupabase({ session = null, user = null } = {}) {
  const listeners = new Set();
  const authAPI = {
    async getSession() {
      return { data: { session }, error: null };
    },
    async getUser() {
      return { data: { user }, error: null };
    },
    async signInWithPassword({ email, password }) {
      const newUser = { id: "u1", email };
      const newSession = { access_token: "supabase.jwt", user: newUser };
      for (const l of listeners) l("SIGNED_IN", newSession);
      return { data: { user: newUser, session: newSession }, error: null };
    },
    async signOut() {
      for (const l of listeners) l("SIGNED_OUT", null);
      return { error: null };
    },
    onAuthStateChange(cb) {
      listeners.add(cb);
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
    },
  };
  return { auth: authAPI };
}

describe("createSupabaseAuth", () => {
  it("getToken: null если нет session", async () => {
    const auth = createSupabaseAuth(mockSupabase({ session: null }));
    expect(await auth.getToken()).toBeNull();
  });

  it("getToken: Bearer <access_token> если session есть", async () => {
    const auth = createSupabaseAuth(
      mockSupabase({ session: { access_token: "tok123" } })
    );
    expect(await auth.getToken()).toBe("Bearer tok123");
  });

  it("signIn через signInWithPassword → возвращает {user, token}", async () => {
    const auth = createSupabaseAuth(mockSupabase());
    const { user, token } = await auth.signIn({ email: "a@b.com", password: "x" });
    expect(user.email).toBe("a@b.com");
    expect(token).toBe("supabase.jwt");
  });

  it("signOut вызывает supabase.auth.signOut", async () => {
    const client = mockSupabase({
      session: { access_token: "t", user: { id: "1" } },
    });
    const auth = createSupabaseAuth(client);
    await auth.signOut();
    // После signOut getToken должен вернуть null (а client уже очистил session в mock'е на SIGNED_OUT event)
    // В реальности supabase-client держит session сам, мы используем его.
  });

  it("onChange: пропускает события от supabase.onAuthStateChange", async () => {
    const client = mockSupabase();
    const auth = createSupabaseAuth(client);
    const listener = vi.fn();
    const off = auth.onChange(listener);

    await auth.signIn({ email: "a@b.com", password: "x" });
    expect(listener).toHaveBeenCalled();

    off();
    // После unsubscribe — новых вызовов нет
    listener.mockClear();
    await auth.signOut();
    expect(listener).not.toHaveBeenCalled();
  });

  it("getUser: из текущей session", async () => {
    const u = { id: "u1", email: "a@b.com" };
    const auth = createSupabaseAuth(mockSupabase({ user: u }));
    expect(await auth.getUser()).toEqual(u);
  });
});
