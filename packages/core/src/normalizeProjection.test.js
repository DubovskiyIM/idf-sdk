import { describe, it, expect } from "vitest";
import { normalizeProjection, normalizeProjections } from "./normalizeProjection.js";

describe("normalizeProjection", () => {
  it("копирует archetype в kind если kind отсутствует", () => {
    const p = { id: "x", archetype: "feed", mainEntity: "Page" };
    const out = normalizeProjection(p);
    expect(out.kind).toBe("feed");
    expect(out.archetype).toBe("feed"); // оригинал не удалён
  });

  it("оставляет kind как есть если оба заданы (kind wins, не перезаписывается)", () => {
    const p = { id: "x", kind: "catalog", archetype: "feed" };
    const out = normalizeProjection(p);
    expect(out.kind).toBe("catalog");
  });

  it("no-op если нет ни kind, ни archetype", () => {
    const p = { id: "x", mainEntity: "Page" };
    const out = normalizeProjection(p);
    expect(out.kind).toBeUndefined();
    expect(out.mainEntity).toBe("Page");
  });

  it("идемпотентен", () => {
    const p = { id: "x", archetype: "feed" };
    const a = normalizeProjection(p);
    const b = normalizeProjection(a);
    expect(b.kind).toBe("feed");
  });

  it("не мутирует input", () => {
    const p = { id: "x", archetype: "feed" };
    normalizeProjection(p);
    expect(p.kind).toBeUndefined();
  });

  it("возвращает input как есть для null/undefined/non-object", () => {
    expect(normalizeProjection(null)).toBeNull();
    expect(normalizeProjection(undefined)).toBeUndefined();
    expect(normalizeProjection("string")).toBe("string");
  });
});

describe("normalizeProjections (map)", () => {
  it("нормализует все projections в map", () => {
    const map = {
      a: { id: "a", archetype: "feed" },
      b: { id: "b", kind: "catalog" },
      c: { id: "c", archetype: "detail", kind: "detail" },
    };
    const out = normalizeProjections(map);
    expect(out.a.kind).toBe("feed");
    expect(out.b.kind).toBe("catalog");
    expect(out.c.kind).toBe("detail");
  });

  it("сохраняет shape map (тот же набор ключей)", () => {
    const map = { a: { archetype: "feed" }, b: { kind: "catalog" } };
    const out = normalizeProjections(map);
    expect(Object.keys(out).sort()).toEqual(["a", "b"]);
  });
});
