import { defaultStorage } from "../storage.js";

const TOKEN_KEY = "idf.auth.token";
const USER_KEY = "idf.auth.user";

/**
 * Generic JWT auth-provider для own-backend.
 *
 * @param {{ signInUrl: string, storage?, tokenField?, userField?, tokenPrefix? }} config
 */
export function createJwtAuth(config) {
  const {
    signInUrl,
    storage = defaultStorage(),
    tokenField = "token",
    userField = "user",
    tokenPrefix = "Bearer",
  } = config;

  const listeners = new Set();
  function notify() { for (const l of listeners) l(); }

  async function signIn(credentials) {
    const res = await fetch(signInUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    let data;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    const token = data[tokenField];
    const user = data[userField] ?? null;
    storage.set(TOKEN_KEY, token);
    if (user) storage.set(USER_KEY, JSON.stringify(user));
    notify();
    return { user, token };
  }

  async function signOut() {
    storage.remove(TOKEN_KEY);
    storage.remove(USER_KEY);
    notify();
  }

  async function getToken() {
    const raw = storage.get(TOKEN_KEY);
    if (!raw) return null;
    return `${tokenPrefix} ${raw}`;
  }

  async function getUser() {
    const raw = storage.get(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  function onChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { signIn, signOut, getToken, getUser, onChange };
}
