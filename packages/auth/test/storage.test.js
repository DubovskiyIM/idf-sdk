import { describe, it, expect } from "vitest";
import { memoryStorage, webStorage } from "../src/storage.js";

describe("memoryStorage", () => {
  it("set/get/remove round-trip", () => {
    const s = memoryStorage();
    expect(s.get("k")).toBeNull();
    s.set("k", "v");
    expect(s.get("k")).toBe("v");
    s.remove("k");
    expect(s.get("k")).toBeNull();
  });
});

describe("webStorage", () => {
  function fakeWebStorage() {
    const data = new Map();
    return {
      getItem(k) { return data.has(k) ? data.get(k) : null; },
      setItem(k, v) { data.set(k, v); },
      removeItem(k) { data.delete(k); },
    };
  }

  it("проксирует к Storage.getItem/setItem/removeItem", () => {
    const fake = fakeWebStorage();
    const s = webStorage(fake);
    s.set("token", "abc");
    expect(fake.getItem("token")).toBe("abc");
    expect(s.get("token")).toBe("abc");
    s.remove("token");
    expect(fake.getItem("token")).toBeNull();
  });
});
