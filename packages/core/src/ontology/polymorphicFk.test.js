import { describe, it, expect } from "vitest";
import {
  isPolymorphicFkField,
  getPolymorphicFkFields,
  getActiveAlternative,
  validatePolymorphicFkRow,
  buildPolymorphicFkInvariants,
  resolvePolymorphicFkParent,
} from "./polymorphicFk.js";

const COMMENT_PFK = {
  kind: "polymorphicFk",
  alternatives: [
    { entity: "Page", field: "pageId" },
    { entity: "Block", field: "blockId" },
  ],
  cardinality: "exactly-one",
};

const COMMENT_ENTITY = {
  fields: {
    id: { type: "id" },
    pageId: { type: "id", entity: "Page", optional: true },
    blockId: { type: "id", entity: "Block", optional: true },
    target: COMMENT_PFK,
    text: { type: "text" },
  },
};

describe("isPolymorphicFkField", () => {
  it("распознаёт корректную PFK-декларацию", () => {
    expect(isPolymorphicFkField(COMMENT_PFK)).toBe(true);
  });

  it("возвращает false для regular field", () => {
    expect(isPolymorphicFkField({ type: "id", entity: "Page" })).toBe(false);
  });

  it("требует ≥2 alternatives", () => {
    expect(isPolymorphicFkField({
      kind: "polymorphicFk",
      alternatives: [{ entity: "Page", field: "pageId" }],
    })).toBe(false);
    expect(isPolymorphicFkField({ kind: "polymorphicFk", alternatives: [] })).toBe(false);
  });

  it("null / non-object → false", () => {
    expect(isPolymorphicFkField(null)).toBe(false);
    expect(isPolymorphicFkField(undefined)).toBe(false);
    expect(isPolymorphicFkField("polymorphicFk")).toBe(false);
  });
});

describe("getPolymorphicFkFields", () => {
  it("возвращает все PFK-поля entity", () => {
    const fields = getPolymorphicFkFields(COMMENT_ENTITY);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe("target");
    expect(fields[0].def).toBe(COMMENT_PFK);
  });

  it("entity без PFK → []", () => {
    expect(getPolymorphicFkFields({ fields: { id: { type: "id" } } })).toEqual([]);
  });

  it("entity без fields → []", () => {
    expect(getPolymorphicFkFields({})).toEqual([]);
    expect(getPolymorphicFkFields(null)).toEqual([]);
  });
});

describe("getActiveAlternative", () => {
  it("выбирает alternative с непустым value", () => {
    const row = { id: "c1", pageId: "p1", blockId: null, text: "hi" };
    const alt = getActiveAlternative(row, COMMENT_PFK);
    expect(alt).toEqual({ entity: "Page", field: "pageId", value: "p1" });
  });

  it("blockId set → выбирает blockId", () => {
    const row = { id: "c2", pageId: null, blockId: "b1", text: "hi" };
    const alt = getActiveAlternative(row, COMMENT_PFK);
    expect(alt).toEqual({ entity: "Block", field: "blockId", value: "b1" });
  });

  it("обе пустые → null", () => {
    const row = { id: "c3", pageId: null, blockId: null };
    expect(getActiveAlternative(row, COMMENT_PFK)).toBe(null);
  });

  it("обе заданы — возвращает первую (validate отдельно)", () => {
    const row = { id: "c4", pageId: "p1", blockId: "b1" };
    expect(getActiveAlternative(row, COMMENT_PFK).field).toBe("pageId");
  });
});

describe("validatePolymorphicFkRow — exactly-one (default)", () => {
  it("ровно одна — ok", () => {
    expect(validatePolymorphicFkRow({ pageId: "p1" }, COMMENT_PFK)).toEqual({ ok: true, count: 1 });
  });

  it("ноль — fail", () => {
    const r = validatePolymorphicFkRow({}, COMMENT_PFK);
    expect(r.ok).toBe(false);
    expect(r.count).toBe(0);
    expect(r.reason).toContain("ни одна");
  });

  it("две — fail", () => {
    const r = validatePolymorphicFkRow({ pageId: "p1", blockId: "b1" }, COMMENT_PFK);
    expect(r.ok).toBe(false);
    expect(r.count).toBe(2);
    expect(r.reason).toContain("одновременно");
  });

  it("empty-string не считается заданной", () => {
    expect(validatePolymorphicFkRow({ pageId: "", blockId: "" }, COMMENT_PFK).ok).toBe(false);
  });
});

describe("validatePolymorphicFkRow — at-most-one", () => {
  const optPfk = { ...COMMENT_PFK, cardinality: "at-most-one" };

  it("ноль — ok", () => {
    expect(validatePolymorphicFkRow({}, optPfk)).toEqual({ ok: true, count: 0 });
  });

  it("одна — ok", () => {
    expect(validatePolymorphicFkRow({ pageId: "p1" }, optPfk)).toEqual({ ok: true, count: 1 });
  });

  it("две — fail", () => {
    expect(validatePolymorphicFkRow({ pageId: "p1", blockId: "b1" }, optPfk).ok).toBe(false);
  });
});

describe("validatePolymorphicFkRow — invalid input", () => {
  it("non-PFK field → ok=false", () => {
    expect(validatePolymorphicFkRow({}, { type: "id" }).ok).toBe(false);
  });

  it("unknown cardinality → fail", () => {
    const r = validatePolymorphicFkRow({}, { ...COMMENT_PFK, cardinality: "weird" });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("unknown cardinality");
  });
});

describe("buildPolymorphicFkInvariants", () => {
  const entities = {
    Comment: COMMENT_ENTITY,
    Page: { fields: { id: { type: "id" }, title: { type: "text" } } },
  };

  it("генерирует invariant per PFK-поле", () => {
    const invs = buildPolymorphicFkInvariants(entities);
    expect(invs).toHaveLength(1);
    expect(invs[0].kind).toBe("expression");
    expect(invs[0].entity).toBe("Comment");
    expect(invs[0].name).toBe("Comment_target_polymorphicFk");
    expect(invs[0].message).toContain("polymorphic FK");
    expect(invs[0].message).toContain("pageId, blockId");
  });

  it("predicate использует validatePolymorphicFkRow", () => {
    const [inv] = buildPolymorphicFkInvariants(entities);
    expect(inv.predicate({ pageId: "p1" })).toBe(true);
    expect(inv.predicate({})).toBe(false);
    expect(inv.predicate({ pageId: "p1", blockId: "b1" })).toBe(false);
  });

  it("entities без PFK → []", () => {
    expect(buildPolymorphicFkInvariants({
      Page: { fields: { id: { type: "id" } } },
    })).toEqual([]);
  });

  it("non-object → []", () => {
    expect(buildPolymorphicFkInvariants(null)).toEqual([]);
    expect(buildPolymorphicFkInvariants(undefined)).toEqual([]);
  });
});

describe("resolvePolymorphicFkParent", () => {
  const world = {
    pages: [{ id: "p1", title: "First" }, { id: "p2", title: "Second" }],
    blocks: [{ id: "b1", text: "Hello" }],
  };

  it("page parent resolved", () => {
    const row = { id: "c", pageId: "p1", blockId: null };
    const r = resolvePolymorphicFkParent(row, COMMENT_PFK, world);
    expect(r.entity).toBe("Page");
    expect(r.id).toBe("p1");
    expect(r.row.title).toBe("First");
  });

  it("block parent resolved", () => {
    const row = { id: "c", pageId: null, blockId: "b1" };
    const r = resolvePolymorphicFkParent(row, COMMENT_PFK, world);
    expect(r.entity).toBe("Block");
    expect(r.row.text).toBe("Hello");
  });

  it("missing alternative → null", () => {
    expect(resolvePolymorphicFkParent({}, COMMENT_PFK, world)).toBe(null);
  });

  it("parent не существует в world → null", () => {
    const row = { pageId: "missing" };
    expect(resolvePolymorphicFkParent(row, COMMENT_PFK, world)).toBe(null);
  });

  it("custom resolveCollection — для не-pluralized-name схем", () => {
    const w = { Pages: [{ id: "p1", title: "Custom" }] };
    const row = { pageId: "p1" };
    const r = resolvePolymorphicFkParent(row, COMMENT_PFK, w, (ent) => w[ent + "s"]);
    expect(r.row.title).toBe("Custom");
  });
});
