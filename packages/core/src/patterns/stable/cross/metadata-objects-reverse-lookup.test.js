import { describe, it, expect } from "vitest";
import { PATTERN, scanMetadataObjects } from "./metadata-objects-reverse-lookup.js";

const WORLD = {
  catalogs: [{ id: "c1", name: "hive", tags: ["ALPHA"], policies: ["pii-mask"] }],
  schemas:  [{ id: "s1", name: "hr",   catalogId: "c1", tags: ["ALPHA"], policies: [] }],
  tables:   [{ id: "t1", name: "users", schemaId: "s1", tags: [], policies: ["pii-mask"] }],
  filesets: [],
  topics:   [],
  models:   [],
};

describe("metadata-objects-reverse-lookup pattern", () => {
  it("scan tag ALPHA → catalog hive + schema hive.hr", () => {
    const out = scanMetadataObjects(WORLD, "tag", "ALPHA");
    expect(out.length).toBe(2);
    expect(out.find(o => o.fullName === "hive")).toBeDefined();
    expect(out.find(o => o.fullName === "hive.hr")).toBeDefined();
  });

  it("scan policy pii-mask → catalog + table", () => {
    const out = scanMetadataObjects(WORLD, "policy", "pii-mask");
    expect(out.length).toBe(2);
    expect(out.find(o => o.fullName === "hive")).toBeDefined();
    expect(out.find(o => o.fullName === "hive.hr.users")).toBeDefined();
  });

  it("apply populates items для derived source", () => {
    const slots = { subCollections: [{ source: "derived:metadata-objects-by-tag", title: "Objects" }] };
    const context = { world: WORLD, routeParams: { tagName: "ALPHA" } };
    const next = PATTERN.structure.apply(slots, context);
    expect(next.subCollections[0].items.length).toBe(2);
  });

  it("pass-through когда source не derived", () => {
    const slots = { subCollections: [{ source: "regular", title: "X" }] };
    const next = PATTERN.structure.apply(slots, { world: WORLD });
    expect(next.subCollections[0].items).toBeUndefined();
  });

  it("empty items когда нет world matches", () => {
    const slots = { subCollections: [{ source: "derived:metadata-objects-by-tag", title: "Objects" }] };
    const context = { world: WORLD, routeParams: { tagName: "NONEXISTENT" } };
    const next = PATTERN.structure.apply(slots, context);
    expect(next.subCollections[0].items).toEqual([]);
  });
});
