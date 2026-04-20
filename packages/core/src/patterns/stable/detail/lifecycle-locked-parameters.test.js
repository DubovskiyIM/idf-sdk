import { describe, it, expect } from "vitest";
import pattern from "./lifecycle-locked-parameters.js";

const mkOntology = () => ({
  entities: {
    Subscription: {
      fields: {
        status: { type: "select", options: ["draft", "active", "cancelled"] },
        maxAmount: { type: "number" },
        scope: { type: "text" },
        endDate: { type: "datetime" },
      },
    },
  },
});

const intents = [
  {
    id: "set_max_amount",
    particles: { effects: [{ α: "replace", target: "subscription.maxAmount" }] },
  },
  {
    id: "update_scope",
    particles: { effects: [{ α: "replace", target: "subscription.scope" }] },
  },
  {
    id: "activate",
    particles: { effects: [{ α: "replace", target: "subscription.status", value: "active" }] },
  },
];

describe("lifecycle-locked-parameters.structure.apply", () => {
  it("добавляет section lockedParameters с list полей", () => {
    const slots = { sections: [] };
    const result = pattern.structure.apply(slots, {
      ontology: mkOntology(),
      mainEntity: "Subscription",
      intents,
    });
    expect(result.sections).toHaveLength(1);
    const section = result.sections[0];
    expect(section.id).toBe("lockedParameters");
    expect(section.kind).toBe("lockedParameters");
    expect(section.entity).toBe("Subscription");
    expect(section.fields).toEqual(expect.arrayContaining(["maxAmount", "scope"]));
    expect(section.fields).not.toContain("status");
  });

  it("lockedWhen выражение содержит active-status", () => {
    const slots = { sections: [] };
    const result = pattern.structure.apply(slots, {
      ontology: mkOntology(),
      mainEntity: "Subscription",
      intents,
    });
    expect(result.sections[0].lockedWhen).toBe("item.status === 'active'");
  });

  it("без active-status → no-op", () => {
    const slots = { sections: [] };
    const ontology = {
      entities: {
        Draft: {
          fields: {
            status: { type: "select", options: ["draft", "deleted"] },
            title: { type: "text" },
          },
        },
      },
    };
    const result = pattern.structure.apply(slots, { ontology, mainEntity: "Draft", intents: [] });
    expect(result).toBe(slots);
  });

  it("idempotent: existing lockedParameters section → no-op", () => {
    const slots = {
      sections: [{ id: "lockedParameters", kind: "custom" }],
    };
    const result = pattern.structure.apply(slots, {
      ontology: mkOntology(),
      mainEntity: "Subscription",
      intents,
    });
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].kind).toBe("custom");
  });

  it("witness: section.source = 'derived:lifecycle-locked-parameters'", () => {
    const slots = { sections: [] };
    const result = pattern.structure.apply(slots, {
      ontology: mkOntology(),
      mainEntity: "Subscription",
      intents,
    });
    expect(result.sections[0].source).toBe("derived:lifecycle-locked-parameters");
  });

  it("сохраняет существующие sections", () => {
    const slots = {
      sections: [{ id: "other", kind: "something" }],
    };
    const result = pattern.structure.apply(slots, {
      ontology: mkOntology(),
      mainEntity: "Subscription",
      intents,
    });
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].id).toBe("other");
    expect(result.sections[1].id).toBe("lockedParameters");
  });
});
