import { describe, it, expect } from "vitest";
import pattern from "./inline-search.js";

describe("inline-search.structure.apply", () => {
  it("маркирует inlineSearch item в toolbar", () => {
    const slots = {
      toolbar: [
        { type: "intentButton", intentId: "add" },
        { type: "inlineSearch", intentId: "search" },
      ],
    };
    const result = pattern.structure.apply(slots, {});
    expect(result.toolbar[1].source).toBe("derived:inline-search");
    expect(result.toolbar[0].source).toBeUndefined();
  });

  it("без inlineSearch → no-op", () => {
    const slots = { toolbar: [{ type: "intentButton" }] };
    const result = pattern.structure.apply(slots, {});
    expect(result).toBe(slots);
  });

  it("idempotent: existing source → no-op", () => {
    const slots = {
      toolbar: [{ type: "inlineSearch", source: "derived:inline-search" }],
    };
    const result = pattern.structure.apply(slots, {});
    expect(result).toBe(slots);
  });
});
