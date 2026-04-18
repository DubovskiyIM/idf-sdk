import { describe, it, expect } from "vitest";
import { mergeViewWithParent } from "./mergeViews.js";

describe("mergeViewWithParent", () => {
  const parent = {
    kind: "catalog",
    mainEntity: "Task",
    entities: ["Task"],
    witnesses: ["title", "status"],
    filter: "a === b",
    sort: "-createdAt",
    patterns: { enabled: ["p1"], disabled: [] },
  };

  it("inherits parent keys if view omits them", () => {
    const view = { id: "v1", name: "Alt", kind: "catalog", layout: "table" };
    const { merged } = mergeViewWithParent(parent, view);
    expect(merged.mainEntity).toBe("Task");
    expect(merged.filter).toBe("a === b");
    expect(merged.witnesses).toEqual(["title", "status"]);
    expect(merged.kind).toBe("catalog");
    expect(merged.layout).toBe("table");
  });

  it("view override wins for render-level keys", () => {
    const view = { id: "v1", kind: "dashboard", sort: "name", layout: "grid" };
    const { merged } = mergeViewWithParent(parent, view);
    expect(merged.kind).toBe("dashboard");
    expect(merged.sort).toBe("name");
    expect(merged.layout).toBe("grid");
  });

  it("Q-level override ignored with warning", () => {
    const view = { id: "v1", kind: "catalog", filter: "different", witnesses: ["x"], mainEntity: "Other" };
    const { merged, warnings } = mergeViewWithParent(parent, view);
    expect(merged.filter).toBe("a === b");
    expect(merged.witnesses).toEqual(["title", "status"]);
    expect(merged.mainEntity).toBe("Task");
    expect(warnings).toHaveLength(3);
    expect(warnings[0]).toMatch(/filter/);
  });

  it("archetype whitelist — fallback to parent.kind with warning", () => {
    const view = { id: "v1", kind: "detail" };
    const { merged, warnings } = mergeViewWithParent(parent, view);
    expect(merged.kind).toBe("catalog");
    expect(warnings.some(w => w.includes("archetype"))).toBe(true);
  });

  it("patterns — shallow merge (view keys over parent)", () => {
    const view = { id: "v1", patterns: { disabled: ["p2"] } };
    const { merged } = mergeViewWithParent(parent, view);
    expect(merged.patterns.enabled).toEqual(["p1"]);
    expect(merged.patterns.disabled).toEqual(["p2"]);
  });

  it("array override replaces (not concat)", () => {
    const viewParent = { ...parent, widgets: [{ a: 1 }, { a: 2 }] };
    const view = { id: "v1", kind: "dashboard", widgets: [{ b: 3 }] };
    const { merged } = mergeViewWithParent(viewParent, view);
    expect(merged.widgets).toEqual([{ b: 3 }]);
  });

  it("assigns view.id as viewId marker", () => {
    const view = { id: "stats", kind: "dashboard" };
    const { merged } = mergeViewWithParent(parent, view);
    expect(merged.viewId).toBe("stats");
  });
});
