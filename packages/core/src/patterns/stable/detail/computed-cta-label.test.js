import { describe, it, expect } from "vitest";
import pattern from "./computed-cta-label.js";
import { validatePattern, evaluateTriggerExplained } from "../../schema.js";

describe("computed-cta-label (merge promotion)", () => {
  const makeOntology = () => ({
    entities: {
      Listing: {
        fields: {
          id: {},
          title: { type: "text" },
          price: { type: "number", fieldRole: "money" },
        },
      },
      ListingExtra: {
        fields: {
          id: {},
          listingId: { type: "entityRef" },
          price: { type: "number", fieldRole: "money" },
          label: { type: "text" },
        },
      },
    },
  });

  const makeIntents = () => [{
    id: "create_order",
    name: "Заказать",
    creates: "Order",
    particles: { conditions: [], effects: [{ α: "add", target: "orders" }] },
    parameters: [{ name: "qty" }],
  }];

  it("passes schema validation", () => {
    expect(() => validatePattern(pattern)).not.toThrow();
  });

  it("matches: detail + money + extras-child + order-creator", () => {
    const projection = { kind: "detail", mainEntity: "Listing" };
    const res = evaluateTriggerExplained(pattern.trigger, makeIntents(), makeOntology(), projection);
    expect(res.ok).toBe(true);
  });

  it("NOT matches: нет order-creator intent", () => {
    const projection = { kind: "detail", mainEntity: "Listing" };
    const intents = [{ id: "edit", particles: { effects: [{ α: "replace", target: "listing.title" }] } }];
    const res = evaluateTriggerExplained(pattern.trigger, intents, makeOntology(), projection);
    expect(res.ok).toBe(false);
  });

  it("NOT matches: нет money-field", () => {
    const ontology = {
      entities: {
        Tag: { fields: { id: {}, name: { type: "text" } } },
        TagExtra: { fields: { id: {}, tagId: {}, price: { type: "number" } } },
      },
    };
    const projection = { kind: "detail", mainEntity: "Tag" };
    const res = evaluateTriggerExplained(pattern.trigger, makeIntents(), ontology, projection);
    expect(res.ok).toBe(false);
  });

  it("NOT matches: нет extras-child", () => {
    const ontology = {
      entities: { Listing: { fields: { id: {}, price: { fieldRole: "money" } } } },
    };
    const projection = { kind: "detail", mainEntity: "Listing" };
    const res = evaluateTriggerExplained(pattern.trigger, makeIntents(), ontology, projection);
    expect(res.ok).toBe(false);
  });

  it("NOT matches: projection.computedCta=false", () => {
    const projection = { kind: "detail", mainEntity: "Listing", computedCta: false };
    const res = evaluateTriggerExplained(pattern.trigger, makeIntents(), makeOntology(), projection);
    expect(res.ok).toBe(false);
  });

  it("apply: добавляет labelTemplate + computed к CTA", () => {
    const next = pattern.structure.apply(
      { primaryCTA: [] },
      {
        projection: { kind: "detail", mainEntity: "Listing" },
        ontology: makeOntology(),
        intents: makeIntents(),
      }
    );
    expect(next.primaryCTA).toHaveLength(1);
    expect(next.primaryCTA[0]).toMatchObject({
      intentId: "create_order",
      labelTemplate: "{label} за {computed.total}",
      computed: {
        basePrice: "listing.price",
        extrasEntity: "ListingExtra",
        parentField: "price",
      },
    });
  });

  it("apply: существующий CTA обогащается (не дублируется)", () => {
    const slots = {
      primaryCTA: [{
        intentId: "create_order",
        label: "Заказать",
        conditions: [],
        parameters: [],
      }],
    };
    const next = pattern.structure.apply(slots, {
      projection: { kind: "detail", mainEntity: "Listing" },
      ontology: makeOntology(),
      intents: makeIntents(),
    });
    expect(next.primaryCTA).toHaveLength(1);
    expect(next.primaryCTA[0].labelTemplate).toBe("{label} за {computed.total}");
  });

  it("apply idempotent: labelTemplate уже задан", () => {
    const slots = {
      primaryCTA: [{
        intentId: "create_order",
        label: "Заказать",
        labelTemplate: "authored",
      }],
    };
    const next = pattern.structure.apply(slots, {
      projection: { kind: "detail", mainEntity: "Listing" },
      ontology: makeOntology(),
      intents: makeIntents(),
    });
    expect(next).toBe(slots);
  });
});
