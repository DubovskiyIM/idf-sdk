import { describe, it, expect, vi, beforeEach } from "vitest";
import { createJwtAuth } from "../src/providers/jwt.js";
import { memoryStorage } from "../src/storage.js";

function mockResponse(data, { ok = true, status = 200 } = {}) {
  return {
    ok, status,
    async json() { return data; },
    async text() { return JSON.stringify(data); },
  };
}

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

describe("createJwtAuth", () => {
  const config = () => ({
    signInUrl: "http://api/auth/login",
    storage: memoryStorage(),
  });

  it("signIn: POST на signInUrl + сохраняет token", async () => {
    globalThis.fetch.mockResolvedValue(
      mockResponse({ token: "jwt.abc", user: { id: "1", email: "a@b.com" } })
    );
    const auth = createJwtAuth(config());

    const { user, token } = await auth.signIn({ email: "a@b.com", password: "x" });
    expect(token).toBe("jwt.abc");
    expect(user.email).toBe("a@b.com");

    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe("http://api/auth/login");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ email: "a@b.com", password: "x" });
  });

  it("getToken: возвращает сохранённый Bearer-format", async () => {
    globalThis.fetch.mockResolvedValue(mockResponse({ token: "raw", user: {} }));
    const auth = createJwtAuth(config());
    await auth.signIn({});
    const header = await auth.getToken();
    expect(header).toBe("Bearer raw");
  });

  it("getToken: null если не залогинен", async () => {
    const auth = createJwtAuth(config());
    expect(await auth.getToken()).toBeNull();
  });

  it("signOut: очищает storage + onChange listeners", async () => {
    globalThis.fetch.mockResolvedValue(mockResponse({ token: "x", user: { id: "1" } }));
    const auth = createJwtAuth(config());
    await auth.signIn({});

    const listener = vi.fn();
    auth.onChange(listener);

    await auth.signOut();
    expect(await auth.getToken()).toBeNull();
    expect(await auth.getUser()).toBeNull();
    expect(listener).toHaveBeenCalled();
  });

  it("onChange: listener вызывается на signIn и signOut, возвращает unsubscribe", async () => {
    globalThis.fetch.mockResolvedValue(mockResponse({ token: "x", user: { id: "1" } }));
    const auth = createJwtAuth(config());
    const listener = vi.fn();
    const off = auth.onChange(listener);

    await auth.signIn({});
    expect(listener).toHaveBeenCalledTimes(1);

    off();
    await auth.signOut();
    expect(listener).toHaveBeenCalledTimes(1); // больше не вызывается
  });

  it("signIn 401 → throws с сообщением", async () => {
    globalThis.fetch.mockResolvedValue(
      mockResponse({ error: "invalid credentials" }, { ok: false, status: 401 })
    );
    const auth = createJwtAuth(config());
    await expect(auth.signIn({})).rejects.toThrow(/invalid credentials/i);
  });

  it("persistence: storage восстанавливается на init если token был", async () => {
    const storage = memoryStorage();
    storage.set("idf.auth.token", "saved-token");
    storage.set("idf.auth.user", JSON.stringify({ id: "99" }));

    const auth = createJwtAuth({ signInUrl: "http://api", storage });
    expect(await auth.getToken()).toBe("Bearer saved-token");
    expect((await auth.getUser()).id).toBe("99");
  });
});
