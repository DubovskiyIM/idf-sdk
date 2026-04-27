import { describe, it, expect } from "vitest";
import pattern from "./anchored-inline-comment-thread.js";

const matchingOnt = {
  entities: {
    Page: {
      fields: {
        id: { type: "id" },
        title: { type: "string" },
      },
    },
    Comment: {
      fields: {
        id: { type: "id" },
        pageId: { type: "entityRef", entity: "Page" },
        anchorRange: { type: "json", optional: true },
        resolved: { type: "boolean" },
        kind: { type: "select", options: ["text-anchored", "page-level"] },
        body: { type: "string" },
      },
    },
  },
};

const nonMatchingOnt_noAnchor = {
  entities: {
    Order: { fields: { id: { type: "id" } } },
    Note: {
      fields: {
        id: { type: "id" },
        orderId: { type: "entityRef", entity: "Order" },
        resolved: { type: "boolean" },
        body: { type: "string" },
      },
    },
  },
};

const nonMatchingOnt_noResolved = {
  entities: {
    Listing: { fields: { id: { type: "id" } } },
    Question: {
      fields: {
        id: { type: "id" },
        listingId: { type: "entityRef", entity: "Listing" },
        anchorRange: { type: "json" },
        body: { type: "string" },
      },
    },
  },
};

describe("anchored-inline-comment-thread / trigger.match", () => {
  it("matches Comment с pageId + anchorRange + resolved", () => {
    const projection = { mainEntity: "Page" };
    expect(pattern.trigger.match([], matchingOnt, projection)).toBe(true);
  });

  it("not matches без anchorRange", () => {
    const projection = { mainEntity: "Order" };
    expect(pattern.trigger.match([], nonMatchingOnt_noAnchor, projection)).toBe(false);
  });

  it("not matches без resolved boolean", () => {
    const projection = { mainEntity: "Listing" };
    expect(pattern.trigger.match([], nonMatchingOnt_noResolved, projection)).toBe(false);
  });

  it("not matches без mainEntity", () => {
    expect(pattern.trigger.match([], matchingOnt, {})).toBe(false);
  });

  it("not matches на null ontology", () => {
    expect(pattern.trigger.match([], null, { mainEntity: "Page" })).toBe(false);
  });
});

describe("anchored-inline-comment-thread / structure.apply", () => {
  const ctx = { ontology: matchingOnt, mainEntity: "Page" };

  it("добавляет 2 overlay entries (anchored + unanchored)", () => {
    const next = pattern.structure.apply({}, ctx);
    expect(next.overlay).toHaveLength(2);
    expect(next.overlay[0].band).toBe("anchored");
    expect(next.overlay[0].type).toBe("inlineCommentThread");
    expect(next.overlay[1].slot).toBe("footer");
    expect(next.overlay[1].type).toBe("subCollectionRef");
  });

  it("каждый entry имеет stable key", () => {
    const next = pattern.structure.apply({}, ctx);
    const keys = next.overlay.map((o) => o.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys[0]).toMatch(/^inline-comment-anchored__/);
    expect(keys[1]).toMatch(/^inline-comment-unanchored__/);
  });

  it("source marker на каждом entry", () => {
    const next = pattern.structure.apply({}, ctx);
    expect(next.overlay[0].source).toBe("derived:anchored-inline-comment-thread");
    expect(next.overlay[1].source).toBe("derived:anchored-inline-comment-thread");
  });

  it("idempotent: повторный apply не дублирует", () => {
    const after1 = pattern.structure.apply({}, ctx);
    const after2 = pattern.structure.apply(after1, ctx);
    expect(after2.overlay).toHaveLength(2);
  });

  it("preserves existing overlay entries (author-override)", () => {
    const slots = {
      overlay: [{ key: "custom-thing", type: "tooltip", text: "hello" }],
    };
    const next = pattern.structure.apply(slots, ctx);
    expect(next.overlay).toHaveLength(3); // 1 existing + 2 new
    expect(next.overlay[0].key).toBe("custom-thing");
  });

  it("noop без mainEntity", () => {
    const slots = { overlay: [] };
    const next = pattern.structure.apply(slots, { ontology: matchingOnt });
    expect(next).toEqual(slots);
  });

  it("noop если Comment-like entity не найдена", () => {
    const slots = { overlay: [] };
    const next = pattern.structure.apply(slots, {
      ontology: nonMatchingOnt_noAnchor,
      mainEntity: "Order",
    });
    expect(next).toEqual(slots);
  });

  it("entity ссылка корректная", () => {
    const next = pattern.structure.apply({}, ctx);
    expect(next.overlay[0].entity).toBe("Comment");
    expect(next.overlay[0].foreignKey).toBe("pageId");
    expect(next.overlay[0].anchorField).toBe("anchorRange");
    expect(next.overlay[0].resolvedField).toBe("resolved");
  });
});
