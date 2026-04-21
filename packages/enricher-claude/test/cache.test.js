import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createCache, hashKey } from "../src/cache.js";

describe("cache", () => {
  let tmp;
  let cache;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "enricher-cache-"));
    cache = createCache({ dir: tmp });
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  describe("hashKey", () => {
    it("deterministic — same input → same hash", () => {
      expect(hashKey("a")).toBe(hashKey("a"));
    });

    it("разные inputs → разные hash'и", () => {
      expect(hashKey("a")).not.toBe(hashKey("b"));
    });

    it("hash — 64-символьный hex (SHA-256)", () => {
      expect(hashKey("x")).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("get/set", () => {
    it("get возвращает null если ключа нет", async () => {
      expect(await cache.get("missing")).toBeNull();
    });

    it("set → get round-trip", async () => {
      await cache.set("key1", { foo: "bar" });
      expect(await cache.get("key1")).toEqual({ foo: "bar" });
    });

    it("expired entry (TTL 7 дней) возвращает null", async () => {
      const stale = { value: "x", ts: Date.now() - 8 * 24 * 3600 * 1000 };
      const hash = hashKey("stale-key");
      await fs.writeFile(path.join(tmp, `${hash}.json`), JSON.stringify(stale));
      expect(await cache.get("stale-key")).toBeNull();
    });
  });

  describe("clear", () => {
    it("удаляет все записи", async () => {
      await cache.set("a", 1);
      await cache.set("b", 2);
      await cache.clear();
      expect(await cache.get("a")).toBeNull();
      expect(await cache.get("b")).toBeNull();
    });
  });
});
