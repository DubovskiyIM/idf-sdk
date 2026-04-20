import { describe, it, expect } from "vitest";
import pattern from "./hero-create.js";

describe("hero-create.structure.apply", () => {
  it("маркирует heroCreate-item в hero слоте", () => {
    const slots = {
      hero: [
        { type: "heroCreate", intentId: "create_task" },
      ],
    };
    const result = pattern.structure.apply(slots, { mainEntity: "Task" });
    expect(result.hero[0].source).toBe("derived:hero-create");
  });

  it("без heroCreate item → no-op", () => {
    const slots = { hero: [{ type: "intentButton", intentId: "x" }] };
    const result = pattern.structure.apply(slots, { mainEntity: "Task" });
    expect(result).toBe(slots);
  });

  it("пустой hero → no-op", () => {
    const slots = { hero: [] };
    const result = pattern.structure.apply(slots, { mainEntity: "Task" });
    expect(result).toBe(slots);
  });

  it("idempotent: existing source → no-op", () => {
    const slots = {
      hero: [{ type: "heroCreate", source: "derived:hero-create" }],
    };
    const result = pattern.structure.apply(slots, { mainEntity: "Task" });
    expect(result).toBe(slots);
  });
});
