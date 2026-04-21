import { useState, useEffect, useCallback } from "react";

/**
 * React-hook для работы с AuthProvider.
 *
 * Подписывается на onChange, держит user/token/loading в state,
 * exposes signIn/signOut.
 */
export function useAuth(provider) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!provider) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }
    const [u, t] = await Promise.all([provider.getUser(), provider.getToken()]);
    setUser(u);
    setToken(t);
    setLoading(false);
  }, [provider]);

  useEffect(() => {
    refresh();
    if (!provider?.onChange) return;
    const unsubscribe = provider.onChange(() => {
      refresh();
    });
    return () => { unsubscribe?.(); };
  }, [provider, refresh]);

  const signIn = useCallback(async (credentials) => {
    if (!provider) throw new Error("useAuth: provider не передан");
    const result = await provider.signIn(credentials);
    await refresh();
    return result;
  }, [provider, refresh]);

  const signOut = useCallback(async () => {
    if (!provider) return;
    await provider.signOut();
    await refresh();
  }, [provider, refresh]);

  return { user, token, loading, signIn, signOut };
}
