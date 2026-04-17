// applyStructuralPatterns.test.js
import { describe, it, expect, vi } from "vitest";
import { applyStructuralPatterns } from "./applyStructuralPatterns.js";

const makePattern = (id, applyFn) => ({ id, structure: { apply: applyFn } });

describe("applyStructuralPatterns", () => {
  it("applies matched patterns in order", () => {
    const slots = { body: [] };
    const p1 = makePattern("p1", (s) => ({ ...s, a: 1 }));
    const p2 = makePattern("p2", (s) => ({ ...s, b: 2 }));
    const registry = { getPattern: vi.fn() };
    const result = applyStructuralPatterns(slots, [{ pattern: p1 }, { pattern: p2 }], { mainEntity: "X" }, {}, registry);
    expect(result).toMatchObject({ a: 1, b: 2 });
  });

  it("skips disabled patterns even if matched", () => {
    const p = makePattern("p1", (s) => ({ ...s, a: 1 }));
    const registry = { getPattern: vi.fn() };
    const result = applyStructuralPatterns({}, [{ pattern: p }], { mainEntity: "X" }, { disabled: ["p1"] }, registry);
    expect(result).toEqual({});
  });

  it("applies enabled patterns that did not match", () => {
    const p1 = makePattern("p1", (s) => ({ ...s, forced: true }));
    const registry = { getPattern: vi.fn().mockImplementation(id => id === "p1" ? p1 : null) };
    const result = applyStructuralPatterns({}, [], { mainEntity: "X" }, { enabled: ["p1"] }, registry);
    expect(result.forced).toBe(true);
  });

  it("does not double-apply if pattern is both matched and enabled", () => {
    const p1 = makePattern("p1", (s) => ({ ...s, count: (s.count || 0) + 1 }));
    const registry = { getPattern: vi.fn().mockImplementation(() => p1) };
    const result = applyStructuralPatterns({}, [{ pattern: p1 }], { mainEntity: "X" }, { enabled: ["p1"] }, registry);
    expect(result.count).toBe(1);
  });

  it("ignores patterns without structure.apply", () => {
    const p = { id: "no-apply", structure: {} };
    const registry = { getPattern: vi.fn() };
    const result = applyStructuralPatterns({ ok: true }, [{ pattern: p }], { mainEntity: "X" }, {}, registry);
    expect(result).toEqual({ ok: true });
  });
});
