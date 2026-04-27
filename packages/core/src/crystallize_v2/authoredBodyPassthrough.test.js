/**
 * §13c — author body passthrough в detail-архетипе.
 *
 * Закрывает Notion field-test gap: автор объявляет
 * `slots.body: { kind: "canvas", canvasId }` для page_detail, но
 * assignToSlotsDetail игнорировал hint и derivил infoSection-column.
 */
import { describe, it, expect } from "vitest";
import { crystallizeV2 } from "./index.js";

const ontology = {
  entities: {
    Page: {
      fields: {
        id: { type: "id" },
        title: { type: "text", role: "primary-title" },
        icon: { type: "text" },
      },
    },
  },
};

const intents = {
  add_page: {
    creates: "Page",
    name: "Создать",
    particles: { entities: ["Page"], effects: [{ α: "add", target: "pages" }] },
  },
  rename_page: {
    name: "Переименовать",
    particles: {
      entities: ["Page"],
      effects: [{ α: "replace", target: "Page.title" }],
    },
    parameters: [{ name: "id", type: "entityRef", entity: "Page" }],
  },
};

describe("§13c — authored slots.body passthrough", () => {
  it("kind: \"canvas\" → slots.body становится { type: \"canvas\", canvasId }", () => {
    const projections = {
      page_detail: {
        kind: "detail",
        mainEntity: "Page",
        idParam: "pageId",
        witnesses: ["title"],
        slots: {
          body: { kind: "canvas", canvasId: "block_canvas" },
        },
      },
    };
    const arts = crystallizeV2(intents, projections, ontology, "test");
    expect(arts.page_detail.slots.body).toEqual({
      type: "canvas",
      canvasId: "block_canvas",
    });
  });

  it("kind: \"canvas\" без canvasId → canvasId: null (host fallback)", () => {
    const projections = {
      page_detail: {
        kind: "detail",
        mainEntity: "Page",
        idParam: "pageId",
        witnesses: ["title"],
        slots: { body: { kind: "canvas" } },
      },
    };
    const arts = crystallizeV2(intents, projections, ontology, "test");
    expect(arts.page_detail.slots.body).toEqual({ type: "canvas", canvasId: null });
  });

  it("kind: \"blockEditor\" → passthrough с entity / parentField", () => {
    const projections = {
      page_detail: {
        kind: "detail",
        mainEntity: "Page",
        idParam: "pageId",
        witnesses: ["title"],
        slots: {
          body: { kind: "blockEditor", entity: "Block", parentField: "pageId" },
        },
      },
    };
    const arts = crystallizeV2(intents, projections, ontology, "test");
    expect(arts.page_detail.slots.body).toEqual({
      type: "blockEditor",
      entity: "Block",
      parentField: "pageId",
    });
  });

  it("kind: \"dashboard\" → { type: \"dashboard\", widgets }", () => {
    const projections = {
      page_detail: {
        kind: "detail",
        mainEntity: "Page",
        witnesses: ["title"],
        slots: {
          body: { kind: "dashboard", widgets: [{ id: "w1" }] },
        },
      },
    };
    const arts = crystallizeV2(intents, projections, ontology, "test");
    expect(arts.page_detail.slots.body).toEqual({
      type: "dashboard",
      widgets: [{ id: "w1" }],
    });
  });

  it("already-typed body — passthrough as-is (для finalized shape)", () => {
    const projections = {
      page_detail: {
        kind: "detail",
        mainEntity: "Page",
        witnesses: ["title"],
        slots: {
          body: { type: "custom", anything: 42 },
        },
      },
    };
    const arts = crystallizeV2(intents, projections, ontology, "test");
    expect(arts.page_detail.slots.body).toEqual({ type: "custom", anything: 42 });
  });

  it("без authored body — auto-derive infoSection (backward-compat)", () => {
    const projections = {
      page_detail: {
        kind: "detail",
        mainEntity: "Page",
        witnesses: ["title", "icon"],
      },
    };
    const arts = crystallizeV2(intents, projections, ontology, "test");
    // Auto-derived body — это column / row / infoSection; не canvas/blockEditor.
    expect(arts.page_detail.slots.body.type).not.toBe("canvas");
    expect(arts.page_detail.slots.body.type).not.toBe("blockEditor");
  });

  it("authored body с unknown kind → fallback на auto-derive", () => {
    const projections = {
      page_detail: {
        kind: "detail",
        mainEntity: "Page",
        witnesses: ["title"],
        slots: { body: { kind: "weird-kind", x: 1 } },
      },
    };
    const arts = crystallizeV2(intents, projections, ontology, "test");
    // unknown kind не coerc'ится — fallback на auto-derive
    expect(arts.page_detail.slots.body.type).not.toBe("weird-kind");
  });
});
