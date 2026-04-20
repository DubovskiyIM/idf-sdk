import { describe, it, expect } from "vitest";
import pattern from "./discriminator-wizard.js";

const mkOntology = () => ({
  entities: {
    Catalog: {
      fields: {
        id: { type: "text" },
        type: {
          type: "select",
          options: ["hive", "iceberg", "kafka"],
        },
        name: { type: "text" },
      },
    },
  },
});

const createIntent = {
  id: "create_catalog",
  name: "Create Catalog",
  creates: "Catalog",
};

describe("discriminator-wizard.structure.apply", () => {
  it("emit _wizardCandidates когда есть discriminator + creator intent", () => {
    const slots = {};
    const result = pattern.structure.apply(slots, {
      ontology: mkOntology(),
      mainEntity: "Catalog",
      intents: [createIntent],
    });
    expect(result._wizardCandidates).toHaveLength(1);
    expect(result._wizardCandidates[0]).toMatchObject({
      discriminatorField: "type",
      variants: ["hive", "iceberg", "kafka"],
      creatorIntentId: "create_catalog",
    });
  });

  it("options as { value, label } → variants как values", () => {
    const ontology = {
      entities: {
        Deal: {
          fields: {
            kind: {
              type: "select",
              options: [
                { value: "retail", label: "Розница" },
                { value: "wholesale", label: "Опт" },
              ],
            },
          },
        },
      },
    };
    const result = pattern.structure.apply({}, {
      ontology, mainEntity: "Deal",
      intents: [{ id: "create_deal", creates: "Deal" }],
    });
    expect(result._wizardCandidates[0].variants).toEqual(["retail", "wholesale"]);
  });

  it("без creator intent → no-op", () => {
    const slots = {};
    const result = pattern.structure.apply(slots, {
      ontology: mkOntology(),
      mainEntity: "Catalog",
      intents: [{ id: "update_catalog" }],  // не creates Catalog
    });
    expect(result).toBe(slots);
  });

  it("без discriminator field → no-op", () => {
    const ontology = {
      entities: {
        Simple: { fields: { id: { type: "text" }, name: { type: "text" } } },
      },
    };
    const result = pattern.structure.apply({}, {
      ontology, mainEntity: "Simple",
      intents: [{ id: "create", creates: "Simple" }],
    });
    expect(result).toEqual({});
  });

  it("< 2 options в discriminator → no-op", () => {
    const ontology = {
      entities: {
        Entity: {
          fields: { type: { type: "select", options: ["only"] } },
        },
      },
    };
    const result = pattern.structure.apply({}, {
      ontology, mainEntity: "Entity",
      intents: [{ id: "create", creates: "Entity" }],
    });
    expect(result._wizardCandidates).toBeUndefined();
  });

  it("idempotent: existing _wizardCandidates → no-op", () => {
    const slots = { _wizardCandidates: [{ discriminatorField: "other" }] };
    const result = pattern.structure.apply(slots, {
      ontology: mkOntology(),
      mainEntity: "Catalog",
      intents: [createIntent],
    });
    expect(result).toBe(slots);
  });

  it("discriminator probe порядок: type → provider → kind → category", () => {
    const ontology = {
      entities: {
        Item: {
          fields: {
            provider: { type: "select", options: ["aws", "gcp"] },
            kind: { type: "select", options: ["block", "object"] },
          },
        },
      },
    };
    const result = pattern.structure.apply({}, {
      ontology, mainEntity: "Item",
      intents: [{ id: "create_item", creates: "Item" }],
    });
    // "type" отсутствует, "provider" совпадает первым.
    expect(result._wizardCandidates[0].discriminatorField).toBe("provider");
  });

  it("witness: source = 'derived:discriminator-wizard'", () => {
    const result = pattern.structure.apply({}, {
      ontology: mkOntology(),
      mainEntity: "Catalog",
      intents: [createIntent],
    });
    expect(result._wizardCandidates[0].source).toBe("derived:discriminator-wizard");
  });
});
