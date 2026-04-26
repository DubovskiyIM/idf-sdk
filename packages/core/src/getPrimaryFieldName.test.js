import { describe, it, expect } from "vitest";
import { getPrimaryFieldName, getPrimaryFieldValue } from "./getPrimaryFieldName.js";

describe("getPrimaryFieldName", () => {
  it("находит явный fieldRole: primary", () => {
    const entity = {
      fields: {
        id: { type: "text" },
        title: { type: "text", fieldRole: "primary" },
        body: { type: "textarea" },
      },
    };
    expect(getPrimaryFieldName(entity)).toBe("title");
  });

  it("находит legacy fieldRole: primary-title", () => {
    const entity = {
      fields: {
        id: { type: "text" },
        myTitle: { type: "text", fieldRole: "primary-title" },
      },
    };
    expect(getPrimaryFieldName(entity)).toBe("myTitle");
  });

  it("fallback name → title → label → displayName → ticker", () => {
    expect(getPrimaryFieldName({ fields: { id: {}, name: { type: "text" } } })).toBe("name");
    expect(getPrimaryFieldName({ fields: { id: {}, title: { type: "text" } } })).toBe("title");
    expect(getPrimaryFieldName({ fields: { id: {}, label: { type: "text" } } })).toBe("label");
    expect(getPrimaryFieldName({ fields: { id: {}, displayName: { type: "text" } } })).toBe("displayName");
    expect(getPrimaryFieldName({ fields: { id: {}, ticker: { type: "text" } } })).toBe("ticker");
  });

  it("Notion Page case: возвращает title", () => {
    const Page = {
      fields: {
        id: { type: "text" },
        workspaceId: { type: "entityRef" },
        title: { type: "text", required: true },
        icon: { type: "text" },
      },
    };
    expect(getPrimaryFieldName(Page)).toBe("title");
  });

  it("explicit fieldRole побеждает hardcoded fallback", () => {
    const entity = {
      fields: {
        name: { type: "text" },
        slug: { type: "text", fieldRole: "primary" },
      },
    };
    expect(getPrimaryFieldName(entity)).toBe("slug");
  });

  it("первое text-поле как fallback (если нет hardcoded имён)", () => {
    const entity = {
      fields: {
        id: { type: "text" },
        description: { type: "textarea" },
        amount: { type: "number" },
      },
    };
    expect(getPrimaryFieldName(entity)).toBe("description");
  });

  it("'id' fallback если только number/date", () => {
    const entity = {
      fields: {
        id: { type: "text" },
        amount: { type: "number" },
        date: { type: "datetime" },
      },
    };
    expect(getPrimaryFieldName(entity)).toBe("id");
  });

  it("'id' для undefined/null entity", () => {
    expect(getPrimaryFieldName(null)).toBe("id");
    expect(getPrimaryFieldName(undefined)).toBe("id");
    expect(getPrimaryFieldName({})).toBe("id");
  });
});

describe("getPrimaryFieldValue", () => {
  it("возвращает значение primary-поля", () => {
    const entity = { fields: { id: {}, title: { type: "text" } } };
    expect(getPrimaryFieldValue({ id: "1", title: "Hello" }, entity)).toBe("Hello");
  });

  it("fallback на row.id если primary поле пустое", () => {
    const entity = { fields: { id: {}, title: { type: "text" } } };
    expect(getPrimaryFieldValue({ id: "1", title: "" }, entity)).toBe("1");
    expect(getPrimaryFieldValue({ id: "1", title: null }, entity)).toBe("1");
  });

  it("пустая строка для null row", () => {
    expect(getPrimaryFieldValue(null, {})).toBe("");
  });
});
