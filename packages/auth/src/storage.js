/**
 * Storage abstraction для JWT-токенов.
 *
 * Provider interface: { get(key), set(key, value), remove(key) }.
 * Все методы — sync (для простоты; redirects / network storage — отдельный случай).
 */
export function memoryStorage() {
  const data = new Map();
  return {
    get(key) { return data.has(key) ? data.get(key) : null; },
    set(key, value) { data.set(key, value); },
    remove(key) { data.delete(key); },
  };
}

export function webStorage(backend = globalThis.localStorage) {
  if (!backend) throw new Error("webStorage: backend (localStorage) недоступен");
  return {
    get(key) { return backend.getItem(key); },
    set(key, value) { backend.setItem(key, value); },
    remove(key) { backend.removeItem(key); },
  };
}

export function defaultStorage() {
  if (typeof globalThis.localStorage !== "undefined") {
    return webStorage(globalThis.localStorage);
  }
  return memoryStorage();
}
