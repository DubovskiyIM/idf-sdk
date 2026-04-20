import { describe, it, expect } from "vitest";
import pattern from "./phase-aware-primary-cta.js";

describe("phase-aware-primary-cta.structure.apply", () => {
  it("маркирует все primaryCTA items", () => {
    const slots = {
      primaryCTA: [
        { intentId: "publish", label: "Publish" },
        { intentId: "close", label: "Close" },
      ],
    };
    const result = pattern.structure.apply(slots, { mainEntity: "Poll" });
    expect(result.primaryCTA[0].source).toBe("derived:phase-aware-primary-cta");
    expect(result.primaryCTA[1].source).toBe("derived:phase-aware-primary-cta");
  });

  it("пустой primaryCTA → no-op", () => {
    const slots = { primaryCTA: [] };
    const result = pattern.structure.apply(slots, { mainEntity: "Poll" });
    expect(result).toBe(slots);
  });

  it("idempotent: existing source не перетирается", () => {
    const slots = {
      primaryCTA: [
        { intentId: "x", source: "other-pattern" },
      ],
    };
    const result = pattern.structure.apply(slots, { mainEntity: "Poll" });
    expect(result).toBe(slots);
  });
});
