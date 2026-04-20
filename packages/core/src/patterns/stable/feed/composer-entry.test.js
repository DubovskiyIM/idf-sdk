import { describe, it, expect } from "vitest";
import pattern from "./composer-entry.js";

describe("composer-entry.structure.apply", () => {
  it("маркирует composer с source", () => {
    const slots = { composer: { type: "composerEntry", intentId: "send_message" } };
    const result = pattern.structure.apply(slots, {});
    expect(result.composer.source).toBe("derived:composer-entry");
  });

  it("пустой composer → no-op", () => {
    const slots = {};
    const result = pattern.structure.apply(slots, {});
    expect(result).toBe(slots);
  });

  it("idempotent: existing source → no-op", () => {
    const slots = { composer: { type: "composerEntry", source: "derived:composer-entry" } };
    const result = pattern.structure.apply(slots, {});
    expect(result).toBe(slots);
  });
});
