import { describe, it, expect } from "vitest";
import pattern from "./faceted-filter-panel.js";
import { validatePattern, evaluateTriggerExplained } from "../../schema.js";

describe("faceted-filter-panel (merge promotion)", () => {
  it("passes schema validation", () => {
    expect(() => validatePattern(pattern)).not.toThrow();
  });

  it("matches: catalog + ≥3 filterable fields", () => {
    const ontology = {
      entities: {
        Listing: {
          fields: {
            price: { type: "number", fieldRole: "money" },
            category: { type: "text", options: ["home", "tech", "clothing"] },
            verified: { type: "boolean" },
            rating: { type: "number", fieldRole: "percentage" },
          },
        },
      },
    };
    const projection = { kind: "catalog", mainEntity: "Listing" };
    const res = evaluateTriggerExplained(pattern.trigger, [], ontology, projection);
    expect(res.ok).toBe(true);
  });

  it("matches: catalog + ≥2 filter-intents", () => {
    const intents = [
      { id: "filter_by_category", particles: { effects: [{ α: "replace", target: "session.filters.category" }] } },
      { id: "filter_by_price",    particles: { effects: [{ α: "replace", target: "session.filters.price" }] } },
    ];
    const ontology = { entities: { Listing: { fields: {} } } };
    const projection = { kind: "catalog", mainEntity: "Listing" };
    const res = evaluateTriggerExplained(pattern.trigger, intents, ontology, projection);
    expect(res.ok).toBe(true);
  });

  it("NOT matches: detail", () => {
    const ontology = {
      entities: {
        Listing: {
          fields: {
            price: { type: "number", fieldRole: "money" },
            verified: { type: "boolean" },
            rating: { type: "number", fieldRole: "percentage" },
          },
        },
      },
    };
    const projection = { kind: "detail", mainEntity: "Listing" };
    const res = evaluateTriggerExplained(pattern.trigger, [], ontology, projection);
    expect(res.ok).toBe(false);
  });

  it("NOT matches: projection.filterPanel=false (author opt-out)", () => {
    const ontology = {
      entities: {
        Listing: {
          fields: {
            price: { fieldRole: "money" },
            category: { options: ["a", "b"] },
            verified: { type: "boolean" },
          },
        },
      },
    };
    const projection = { kind: "catalog", mainEntity: "Listing", filterPanel: false };
    const res = evaluateTriggerExplained(pattern.trigger, [], ontology, projection);
    expect(res.ok).toBe(false);
  });

  it("NOT matches: <3 filterable fields, <2 filter intents", () => {
    const ontology = {
      entities: {
        Listing: {
          fields: {
            title: { type: "text" },
            verified: { type: "boolean" },
          },
        },
      },
    };
    const projection = { kind: "catalog", mainEntity: "Listing" };
    const res = evaluateTriggerExplained(pattern.trigger, [], ontology, projection);
    expect(res.ok).toBe(false);
  });

  it("apply: генерирует filterPanel с typed controls", () => {
    const ontology = {
      entities: {
        Listing: {
          fields: {
            price: { type: "number", fieldRole: "money" },
            category: { type: "text", options: ["home", "tech"] },
            verified: { type: "boolean" },
          },
        },
      },
    };
    const next = pattern.structure.apply(
      { body: {} },
      { projection: { kind: "catalog", mainEntity: "Listing" }, ontology }
    );
    expect(next.body.filterPanel.slot).toBe("sidebar");
    expect(next.body.filterPanel.liveApply).toBe(true);
    const groups = next.body.filterPanel.groups;
    expect(groups).toHaveLength(3);
    const byField = Object.fromEntries(groups.map(g => [g.field, g]));
    expect(byField.price.control).toBe("range");
    expect(byField.category.control).toBe("checklist");
    expect(byField.category.options).toEqual(["home", "tech"]);
    expect(byField.verified.control).toBe("toggle");
  });

  it("apply: projection.filterSlot=\"sheet\" (mobile) применяется", () => {
    const ontology = {
      entities: {
        Listing: {
          fields: {
            price: { fieldRole: "money" },
            cat: { options: ["a"] },
            verified: { type: "boolean" },
          },
        },
      },
    };
    const next = pattern.structure.apply(
      { body: {} },
      {
        projection: { kind: "catalog", mainEntity: "Listing", filterSlot: "sheet" },
        ontology,
      }
    );
    expect(next.body.filterPanel.slot).toBe("sheet");
  });

  it("apply: body.filterPanel уже задан → no-op", () => {
    const slots = { body: { filterPanel: { slot: "custom", groups: [] } } };
    const next = pattern.structure.apply(slots, {
      projection: { kind: "catalog", mainEntity: "Listing" },
      ontology: { entities: { Listing: { fields: { price: { fieldRole: "money" } } } } },
    });
    expect(next).toBe(slots);
  });

  it("apply: нет filterable fields → slots без изменений", () => {
    const slots = { body: {} };
    const next = pattern.structure.apply(slots, {
      projection: { kind: "catalog", mainEntity: "Tag" },
      ontology: { entities: { Tag: { fields: { title: { type: "text" } } } } },
    });
    expect(next).toBe(slots);
  });
});
