import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const TTL_MS = 7 * 24 * 3600 * 1000; // 7 дней

export function hashKey(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

export function defaultCacheDir() {
  return path.join(os.homedir(), ".cache", "intent-driven", "enricher");
}

export function createCache({ dir = defaultCacheDir(), ttlMs = TTL_MS } = {}) {
  async function ensureDir() {
    await fs.mkdir(dir, { recursive: true });
  }

  return {
    async get(key) {
      const hash = hashKey(key);
      const file = path.join(dir, `${hash}.json`);
      try {
        const raw = await fs.readFile(file, "utf8");
        const entry = JSON.parse(raw);
        if (Date.now() - entry.ts > ttlMs) return null;
        return entry.value;
      } catch (err) {
        if (err.code === "ENOENT") return null;
        throw err;
      }
    },

    async set(key, value) {
      await ensureDir();
      const hash = hashKey(key);
      const file = path.join(dir, `${hash}.json`);
      const entry = { value, ts: Date.now() };
      await fs.writeFile(file, JSON.stringify(entry));
    },

    async clear() {
      try {
        const entries = await fs.readdir(dir);
        await Promise.all(
          entries
            .filter((e) => e.endsWith(".json"))
            .map((e) => fs.unlink(path.join(dir, e)))
        );
      } catch (err) {
        if (err.code !== "ENOENT") throw err;
      }
    },
  };
}
