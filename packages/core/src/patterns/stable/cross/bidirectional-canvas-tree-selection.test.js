/**
 * Integration tests for stable `bidirectional-canvas-tree-selection`.
 * Покрывает: trigger (via evaluateTrigger), structure.apply (opt-in gate +
 * happy path + idempotency + config override), validatePattern, explainMatch
 * на Selfai-like онтологии.
 */

import { describe, it, expect } from "vitest";
import pattern from "./bidirectional-canvas-tree-selection.js";
import { validatePattern, evaluateTrigger } from "../../schema.js";
import { explainMatch } from "../../index.js";
import { resetDefaultRegistry } from "../../registry.js";

// Selfai-like онтология (на основе thirdPartyData.gui.groups JSON с bank-client).
const selfaiOntology = {
  entities: {
    Node: {
      fields: {
        id: { type: "text" },
        workflowId: { references: "Workflow" },
        operationId: { references: "Operation" },
        uiName: { type: "text" },
      },
    },
    Workflow: {
      fields: {
        id: { type: "text" },
        name: { type: "text" },
      },
    },
    Group: {
      fields: {
        id: { type: "text" },
        name: { type: "text" },
        description: { type: "text" },
        nodeIds: { type: "entityRefArray", references: "Node" },
        parentGroupId: { type: "entityRef", references: "Group" },
      },
    },
  },
  features: {},
};

const selfaiGroupProjection = {
  mainEntity: "Group",
  archetype: "catalog",
  name: "group_tree",
};

describe("bidirectional-canvas-tree-selection — schema validity", () => {
  it("passes validatePattern", () => {
    expect(() => validatePattern(pattern)).not.toThrow();
  });

  it("status === 'stable'", () => {
    expect(pattern.status).toBe("stable");
  });

  it("archetype === null (cross-archetype, applies regardless of projection.kind)", () => {
    expect(pattern.archetype).toBe(null);
  });

  it("trigger.requires содержит co-selection-group-entity", () => {
    expect(pattern.trigger.requires).toEqual([
      { kind: "co-selection-group-entity", entity: "$mainEntity" },
    ]);
  });

  it("structure.apply — function", () => {
    expect(typeof pattern.structure.apply).toBe("function");
  });
});

describe("bidirectional-canvas-tree-selection — trigger matching (Selfai-like)", () => {
  it("matches Group entity (имеет nodeIds[] + parentGroupId)", () => {
    expect(evaluateTrigger(pattern.trigger, [], selfaiOntology, selfaiGroupProjection)).toBe(true);
  });

  it("NOT matches Node (нет hierarchy, нет membership)", () => {
    expect(evaluateTrigger(pattern.trigger, [], selfaiOntology, { mainEntity: "Node" })).toBe(false);
  });

  it("NOT matches Workflow (flat entity)", () => {
    expect(evaluateTrigger(pattern.trigger, [], selfaiOntology, { mainEntity: "Workflow" })).toBe(false);
  });

  it("NOT matches missing entity", () => {
    expect(evaluateTrigger(pattern.trigger, [], selfaiOntology, { mainEntity: "Ghost" })).toBe(false);
  });
});

describe("bidirectional-canvas-tree-selection — structure.apply", () => {
  const { apply } = pattern.structure;

  it("no-op без author-signal (pattern matched, но apply opt-in)", () => {
    const slots = { sidebar: [] };
    const result = apply(slots, {
      ontology: selfaiOntology,
      mainEntity: "Group",
      projection: selfaiGroupProjection,
    });
    expect(result).toBe(slots); // identity — no-op returns same object
    expect(result.sidebar).toEqual([]);
  });

  it("injects coSelectionTreeNav при features.coSelectionTree === true", () => {
    const ontologyOptIn = {
      ...selfaiOntology,
      features: { coSelectionTree: true },
    };
    const slots = { sidebar: [] };
    const result = apply(slots, {
      ontology: ontologyOptIn,
      mainEntity: "Group",
      projection: selfaiGroupProjection,
    });
    expect(result.sidebar).toHaveLength(1);
    expect(result.sidebar[0]).toEqual({
      type: "coSelectionTreeNav",
      groupEntity: "Group",
      parentField: "parentGroupId",
      memberField: "nodeIds",
      targetEntity: "Node",
      source: "derived:bidirectional-canvas-tree-selection",
    });
  });

  it("injects при projection.patterns.enabled includes pattern id", () => {
    const projection = {
      ...selfaiGroupProjection,
      patterns: { enabled: ["bidirectional-canvas-tree-selection"] },
    };
    const slots = { sidebar: [] };
    const result = apply(slots, {
      ontology: selfaiOntology,
      mainEntity: "Group",
      projection,
    });
    expect(result.sidebar).toHaveLength(1);
    expect(result.sidebar[0].type).toBe("coSelectionTreeNav");
  });

  it("sidebar-injection — prepend (существующие items сохранены)", () => {
    const ontologyOptIn = { ...selfaiOntology, features: { coSelectionTree: true } };
    const slots = { sidebar: [{ type: "someOtherPanel" }] };
    const result = apply(slots, {
      ontology: ontologyOptIn,
      mainEntity: "Group",
      projection: selfaiGroupProjection,
    });
    expect(result.sidebar).toHaveLength(2);
    expect(result.sidebar[0].type).toBe("coSelectionTreeNav");
    expect(result.sidebar[1].type).toBe("someOtherPanel");
  });

  it("idempotent: повторный apply не дублирует", () => {
    const ontologyOptIn = { ...selfaiOntology, features: { coSelectionTree: true } };
    const slots = { sidebar: [] };
    const first = apply(slots, {
      ontology: ontologyOptIn,
      mainEntity: "Group",
      projection: selfaiGroupProjection,
    });
    const second = apply(first, {
      ontology: ontologyOptIn,
      mainEntity: "Group",
      projection: selfaiGroupProjection,
    });
    expect(second).toBe(first); // no-op idempotent
    expect(second.sidebar).toHaveLength(1);
  });

  it("no-op когда entity без array-ref field", () => {
    const ontologyBroken = {
      ...selfaiOntology,
      entities: {
        Node: selfaiOntology.entities.Node,
        Group: {
          fields: {
            name: { type: "text" },
            parentGroupId: { references: "Group" }, // self-ref есть, но нет array-ref
          },
        },
      },
      features: { coSelectionTree: true },
    };
    const slots = { sidebar: [] };
    const result = apply(slots, {
      ontology: ontologyBroken,
      mainEntity: "Group",
      projection: selfaiGroupProjection,
    });
    expect(result).toBe(slots);
  });

  it("no-op когда entity без self-reference", () => {
    const ontologyBroken = {
      ...selfaiOntology,
      entities: {
        Node: selfaiOntology.entities.Node,
        Group: {
          fields: {
            name: { type: "text" },
            nodeIds: { type: "entityRefArray", references: "Node" },
            // нет parentGroupId
          },
        },
      },
      features: { coSelectionTree: true },
    };
    const slots = { sidebar: [] };
    const result = apply(slots, {
      ontology: ontologyBroken,
      mainEntity: "Group",
      projection: selfaiGroupProjection,
    });
    expect(result).toBe(slots);
  });

  it("config.memberField + config.parentField — explicit override", () => {
    const ontologyMulti = {
      entities: {
        Node: { fields: {} },
        ExtraTarget: { fields: {} },
        Group: {
          fields: {
            nodeIds: { type: "entityRefArray", references: "Node" },
            extraIds: { type: "entityRefArray", references: "ExtraTarget" },
            parentGroupId: { references: "Group" },
            ancestor: { references: "Group" },
          },
        },
      },
      features: { coSelectionTree: true },
    };
    const projection = {
      ...selfaiGroupProjection,
      patterns: {
        config: {
          "bidirectional-canvas-tree-selection": {
            memberField: "extraIds",
            parentField: "ancestor",
          },
        },
      },
    };
    const slots = { sidebar: [] };
    const result = apply(slots, {
      ontology: ontologyMulti,
      mainEntity: "Group",
      projection,
    });
    expect(result.sidebar[0]).toMatchObject({
      memberField: "extraIds",
      parentField: "ancestor",
      targetEntity: "ExtraTarget",
    });
  });
});

describe("bidirectional-canvas-tree-selection — explainMatch integration (Selfai-like)", () => {
  // explainMatch использует default registry (loadStablePatterns), поэтому
  // pattern должен быть зарегистрирован через registry.js — resetDefaultRegistry
  // между тестами чтобы перечитать stable set.

  it("integration: explainMatch включает pattern в matched для Group projection", () => {
    resetDefaultRegistry();
    const projection = { ...selfaiGroupProjection, kind: "catalog" };
    const result = explainMatch([], selfaiOntology, projection);
    const matched = result.structural.matched.map(m => m.pattern.id);
    expect(matched).toContain("bidirectional-canvas-tree-selection");
  });

  it("integration: NOT matched для Node projection", () => {
    resetDefaultRegistry();
    const projection = { mainEntity: "Node", kind: "detail" };
    const result = explainMatch([], selfaiOntology, projection);
    const matched = result.structural.matched.map(m => m.pattern.id);
    expect(matched).not.toContain("bidirectional-canvas-tree-selection");
  });
});
