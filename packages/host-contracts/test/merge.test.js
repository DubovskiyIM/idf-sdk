import { describe, it, expect } from "vitest";
import { mergeNavSections } from "../src/merge.js";

describe("mergeNavSections", () => {
  it("returns single list unchanged (sorted by order)", () => {
    const a = [{ id: "main", order: 1, items: [{ id: "h", label: "H", path: "/" }] }];
    const merged = mergeNavSections(a);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("main");
    expect(merged[0].items).toHaveLength(1);
  });

  it("merges items from two modules into the same section", () => {
    const a = [{ id: "main", items: [{ id: "a", label: "A", path: "/a" }] }];
    const b = [{ id: "main", items: [{ id: "b", label: "B", path: "/b" }] }];
    const merged = mergeNavSections(a, b);
    expect(merged).toHaveLength(1);
    expect(merged[0].items.map((it) => it.id)).toEqual(["a", "b"]);
    expect(merged.conflicts).toBeUndefined();
  });

  it("detects item-id collisions across modules", () => {
    const a = [{ id: "main", items: [{ id: "home", label: "A-home", path: "/a" }] }];
    const b = [{ id: "main", items: [{ id: "home", label: "B-home", path: "/b" }] }];
    const merged = mergeNavSections(a, b);
    expect(merged[0].items).toHaveLength(1);
    expect(merged[0].items[0].label).toBe("A-home");
    expect(merged.conflicts).toBeDefined();
    expect(merged.conflicts[0]).toContain('item id collision: "home"');
  });

  it("preserves order across multiple sections", () => {
    const a = [{ id: "z", order: 99, items: [] }];
    const b = [{ id: "a", order: 1, items: [] }];
    const c = [{ id: "m", order: 50, items: [] }];
    const merged = mergeNavSections(a, b, c);
    expect(merged.map((s) => s.id)).toEqual(["a", "m", "z"]);
  });

  it("places sections without order at the end", () => {
    const a = [{ id: "ordered", order: 5, items: [] }];
    const b = [{ id: "unordered", items: [] }];
    const merged = mergeNavSections(a, b);
    expect(merged.map((s) => s.id)).toEqual(["ordered", "unordered"]);
  });

  it("uses first-defined label/order when sections collide", () => {
    const a = [{ id: "main", label: "First", items: [] }];
    const b = [{ id: "main", label: "Second", order: 1, items: [] }];
    const merged = mergeNavSections(a, b);
    expect(merged[0].label).toBe("First");
    expect(merged[0].order).toBe(1);
  });

  it("ignores invalid input gracefully", () => {
    expect(mergeNavSections()).toEqual([]);
    expect(mergeNavSections(null, undefined, [])).toEqual([]);
  });
});
