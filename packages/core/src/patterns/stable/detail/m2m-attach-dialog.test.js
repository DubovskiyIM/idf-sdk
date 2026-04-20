import { describe, it, expect } from "vitest";
import pattern from "./m2m-attach-dialog.js";

describe("m2m-attach-dialog trigger.match", () => {
  it("срабатывает на assignment-entity", () => {
    const ontology = {
      entities: {
        Portfolio: { fields: {} },
        Assignment: {
          kind: "assignment",
          ownerField: "advisorId",
          fields: {
            id: { type: "text" },
            advisorId: { type: "entityRef" },
            portfolioId: { type: "entityRef" },
          },
        },
      },
    };
    expect(pattern.trigger.match([], ontology, {})).toBe(true);
  });

  it("срабатывает на role.scope.via", () => {
    const ontology = {
      roles: {
        advisor: { scope: { portfolios: { via: "assignments" } } },
      },
    };
    expect(pattern.trigger.match([], ontology, {})).toBe(true);
  });

  it("не срабатывает без assignment", () => {
    const ontology = { entities: { Portfolio: { fields: {} } } };
    expect(pattern.trigger.match([], ontology, {})).toBe(false);
  });
});

describe("m2m-attach-dialog.structure.apply", () => {
  const mkOntology = () => ({
    entities: {
      Portfolio: { ownerField: "userId", fields: { id: { type: "text" } } },
      Assignment: {
        kind: "assignment",
        ownerField: "advisorId",
        fields: {
          id: { type: "text" },
          advisorId: { type: "entityRef" },
          portfolioId: { type: "entityRef" },
        },
      },
    },
  });

  it("добавляет секцию для assignment-entity с FK на mainEntity", () => {
    const slots = { sections: [] };
    const result = pattern.structure.apply(slots, {
      ontology: mkOntology(),
      mainEntity: "Portfolio",
      projection: {},
    });
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].kind).toBe("attachList");
    expect(result.sections[0].entity).toBe("Assignment");
    expect(result.sections[0].foreignKey).toBe("portfolioId");
    expect(result.sections[0].otherField).toBe("advisorId");
    expect(result.sections[0].otherEntity).toBe("Advisor");
  });

  it("attachControl: multi-select dialog с otherEntity", () => {
    const slots = { sections: [] };
    const result = pattern.structure.apply(slots, {
      ontology: mkOntology(),
      mainEntity: "Portfolio",
      projection: {},
    });
    const section = result.sections[0];
    expect(section.attachControl).toEqual({
      type: "attachDialog",
      multiSelect: true,
      otherEntity: "Advisor",
    });
  });

  it("idempotent: existing section с тем же id → не дублирует", () => {
    const slots = {
      sections: [{ id: "m2m_assignment", kind: "custom" }],
    };
    const result = pattern.structure.apply(slots, {
      ontology: mkOntology(),
      mainEntity: "Portfolio",
      projection: {},
    });
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].kind).toBe("custom");  // не перетёрт
  });

  it("author subCollections projections → apply skip'ает (author wins)", () => {
    const slots = { sections: [] };
    const result = pattern.structure.apply(slots, {
      ontology: mkOntology(),
      mainEntity: "Portfolio",
      projection: { subCollections: [{ entity: "Custom" }] },
    });
    expect(result).toBe(slots);
  });

  it("без assignment entities → no-op", () => {
    const slots = { sections: [] };
    const result = pattern.structure.apply(slots, {
      ontology: { entities: { Portfolio: { fields: {} } } },
      mainEntity: "Portfolio",
      projection: {},
    });
    expect(result).toBe(slots);
  });

  it("witness: section.source = 'derived:m2m-attach-dialog'", () => {
    const slots = { sections: [] };
    const result = pattern.structure.apply(slots, {
      ontology: mkOntology(),
      mainEntity: "Portfolio",
      projection: {},
    });
    expect(result.sections[0].source).toBe("derived:m2m-attach-dialog");
  });
});
