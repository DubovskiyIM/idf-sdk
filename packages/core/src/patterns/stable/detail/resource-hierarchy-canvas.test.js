import { describe, it, expect } from "vitest";
import resourceHierarchyCanvas from "./resource-hierarchy-canvas.js";

const { findSelfRefField, findStatusFields, pickNameField, pickKindField, looksLikeStatusField } =
  resourceHierarchyCanvas._helpers;

describe("resource-hierarchy-canvas — trigger.match", () => {
  const ontologyArgo = {
    entities: {
      Application: {
        fields: { id: { type: "string" }, name: { type: "string" } },
      },
      Resource: {
        fields: {
          id:               { type: "string" },
          name:             { type: "string" },
          kind:             { type: "string", values: ["Deployment", "Pod", "Service"] },
          applicationId:    { type: "foreignKey", refs: "Application" },
          parentResourceId: { type: "foreignKey", refs: "Resource" },
          healthStatus:     { type: "string", values: ["Healthy", "Degraded", "Progressing"] },
        },
      },
    },
  };
  const projArgo = { archetype: "detail", mainEntity: "Application" };

  it("matches: detail с sub-entity (FK + self-FK + status)", () => {
    expect(resourceHierarchyCanvas.trigger.match([], ontologyArgo, projArgo)).toBe(true);
  });

  it("не matches: sub-entity без self-FK (плоский список)", () => {
    const ont = {
      entities: {
        App: { fields: { id: { type: "string" } } },
        Bid: {
          fields: {
            id:    { type: "string" },
            appId: { type: "foreignKey", refs: "App" },
            status: { type: "string", values: ["a", "b"] },
          },
        },
      },
    };
    expect(resourceHierarchyCanvas.trigger.match([], ont, { archetype: "detail", mainEntity: "App" })).toBe(false);
  });

  it("не matches: sub-entity без status field", () => {
    const ont = {
      entities: {
        App: { fields: { id: { type: "string" } } },
        Resource: {
          fields: {
            id:               { type: "string" },
            appId:            { type: "foreignKey", refs: "App" },
            parentResourceId: { type: "foreignKey", refs: "Resource" },
          },
        },
      },
    };
    expect(resourceHierarchyCanvas.trigger.match([], ont, { archetype: "detail", mainEntity: "App" })).toBe(false);
  });

  it("не matches: archetype != detail", () => {
    expect(resourceHierarchyCanvas.trigger.match([], ontologyArgo, { ...projArgo, archetype: "catalog" })).toBe(false);
  });

  it("matches через convention-based FK (mainEntity → mainEntityLowerId)", () => {
    const ont = {
      entities: {
        Workflow: { fields: { id: { type: "string" } } },
        Node: {
          fields: {
            id:         { type: "string" },
            workflowId: { type: "string" },
            parentId:   { type: "string" },
            phase:      { type: "string", values: ["pending", "running", "done"] },
          },
        },
      },
    };
    expect(resourceHierarchyCanvas.trigger.match([], ont, { archetype: "detail", mainEntity: "Workflow" })).toBe(true);
  });

  it("не matches: нет sub-entity вообще", () => {
    const ont = { entities: { Solo: { fields: { name: { type: "string" } } } } };
    expect(resourceHierarchyCanvas.trigger.match([], ont, { archetype: "detail", mainEntity: "Solo" })).toBe(false);
  });

  it("не matches: status field без values (free-form string)", () => {
    const ont = {
      entities: {
        App: { fields: { id: { type: "string" } } },
        Resource: {
          fields: {
            id:               { type: "string" },
            appId:            { type: "foreignKey", refs: "App" },
            parentResourceId: { type: "foreignKey", refs: "Resource" },
            healthStatus:     { type: "string" },
          },
        },
      },
    };
    expect(resourceHierarchyCanvas.trigger.match([], ont, { archetype: "detail", mainEntity: "App" })).toBe(false);
  });
});

describe("resource-hierarchy-canvas — structure.apply", () => {
  const ontology = {
    entities: {
      Application: { fields: { id: { type: "string" } } },
      Resource: {
        fields: {
          id:               { type: "string" },
          name:             { type: "string" },
          kind:             { type: "string", values: ["Deployment", "Pod"] },
          applicationId:    { type: "foreignKey", refs: "Application" },
          parentResourceId: { type: "foreignKey", refs: "Resource" },
          healthStatus:     { type: "string", values: ["Healthy", "Degraded"] },
        },
      },
    },
  };

  it("выставляет section.renderAs для tree-shaped sub-entity", () => {
    const slots = {
      sections: [
        { id: "resources", title: "Resources", itemEntity: "Resource", layout: "list" },
      ],
    };
    const out = resourceHierarchyCanvas.structure.apply(slots, { ontology });
    expect(out.sections[0].renderAs).toEqual({
      type: "resourceTree",
      nameField: "name",
      parentField: "parentResourceId",
      kindField: "kind",
      badgeColumns: [{ field: "healthStatus", label: "healthStatus" }],
    });
  });

  it("сохраняет другие поля section без изменений", () => {
    const slots = {
      sections: [
        { id: "resources", title: "T", itemEntity: "Resource", layout: "list", customField: 42 },
      ],
    };
    const out = resourceHierarchyCanvas.structure.apply(slots, { ontology });
    expect(out.sections[0].id).toBe("resources");
    expect(out.sections[0].title).toBe("T");
    expect(out.sections[0].layout).toBe("list");
    expect(out.sections[0].customField).toBe(42);
  });

  it("no-op: section.renderAs уже задан (author-override)", () => {
    const slots = {
      sections: [
        { id: "resources", itemEntity: "Resource", renderAs: { type: "permissionMatrix" } },
      ],
    };
    const out = resourceHierarchyCanvas.structure.apply(slots, { ontology });
    expect(out).toBe(slots);
  });

  it("no-op: section.itemEntity не tree-shaped", () => {
    const ont = {
      entities: {
        App: { fields: { id: { type: "string" } } },
        Bid: { fields: { id: { type: "string" }, appId: { type: "foreignKey", refs: "App" } } },
      },
    };
    const slots = { sections: [{ id: "bids", itemEntity: "Bid" }] };
    const out = resourceHierarchyCanvas.structure.apply(slots, { ontology: ont });
    expect(out).toBe(slots);
  });

  it("обрабатывает несколько sections — преобразует только tree-shaped", () => {
    const ont = {
      entities: {
        App: { fields: { id: { type: "string" } } },
        Resource: ontology.entities.Resource,
        Bid: { fields: { id: { type: "string" }, appId: { type: "foreignKey", refs: "App" } } },
      },
    };
    const slots = {
      sections: [
        { id: "bids", itemEntity: "Bid" },
        { id: "resources", itemEntity: "Resource" },
      ],
    };
    const out = resourceHierarchyCanvas.structure.apply(slots, { ontology: ont });
    expect(out.sections[0].renderAs).toBeUndefined();
    expect(out.sections[1].renderAs?.type).toBe("resourceTree");
  });

  it("no-op: slots.sections отсутствует или пуст", () => {
    expect(resourceHierarchyCanvas.structure.apply({}, { ontology })).toEqual({});
    expect(resourceHierarchyCanvas.structure.apply({ sections: [] }, { ontology })).toEqual({ sections: [] });
  });

  it("badgeColumns содержит все ≥1 status-fields", () => {
    const ont = {
      entities: {
        App: { fields: { id: { type: "string" } } },
        Resource: {
          fields: {
            id:               { type: "string" },
            appId:            { type: "foreignKey", refs: "App" },
            parentResourceId: { type: "foreignKey", refs: "Resource" },
            syncStatus:       { type: "string", values: ["Synced", "OutOfSync"] },
            healthStatus:     { type: "string", values: ["Healthy", "Degraded"] },
          },
        },
      },
    };
    const slots = { sections: [{ id: "resources", itemEntity: "Resource" }] };
    const out = resourceHierarchyCanvas.structure.apply(slots, { ontology: ont });
    expect(out.sections[0].renderAs.badgeColumns).toHaveLength(2);
    expect(out.sections[0].renderAs.badgeColumns.map(b => b.field)).toEqual(["syncStatus", "healthStatus"]);
  });
});

describe("resource-hierarchy-canvas — helpers", () => {
  it("findSelfRefField: explicit FK", () => {
    const entity = { fields: { foo: { type: "foreignKey", refs: "Resource" } } };
    expect(findSelfRefField("Resource", entity)).toBe("foo");
  });

  it("findSelfRefField: convention parentXxxId", () => {
    const entity = { fields: { parentNodeId: { type: "string" } } };
    expect(findSelfRefField("Node", entity)).toBe("parentNodeId");
  });

  it("findSelfRefField: generic parentId fallback", () => {
    const entity = { fields: { parentId: { type: "string" } } };
    expect(findSelfRefField("Anything", entity)).toBe("parentId");
  });

  it("findSelfRefField: возвращает null если self-FK нет", () => {
    const entity = { fields: { foo: { type: "string" } } };
    expect(findSelfRefField("X", entity)).toBe(null);
  });

  it("pickNameField: name → title → label → id", () => {
    expect(pickNameField({ fields: { name: {} } })).toBe("name");
    expect(pickNameField({ fields: { title: {} } })).toBe("title");
    expect(pickNameField({ fields: { label: {} } })).toBe("label");
    expect(pickNameField({ fields: { id: {} } })).toBe("id");
    expect(pickNameField({ fields: { foo: {} } })).toBe("id");
  });

  it("pickKindField: kind → type → resourceType → null", () => {
    expect(pickKindField({ fields: { kind: {} } })).toBe("kind");
    expect(pickKindField({ fields: { type: {} } })).toBe("type");
    expect(pickKindField({ fields: { foo: {} } })).toBe(null);
  });

  it("findStatusFields: возвращает только enum-status поля в declaration order", () => {
    const entity = {
      fields: {
        name:    { type: "string" },
        a:       { type: "string", values: ["x", "y"], fieldRole: "status" },
        color:   { type: "string", values: ["red", "blue"] },
        b:       { type: "string", values: ["m", "n"], fieldRole: "status" },
      },
    };
    const result = findStatusFields(entity);
    expect(result.map(s => s.field)).toEqual(["a", "b"]);
  });

  it("looksLikeStatusField: name-hint Health$ → true", () => {
    expect(looksLikeStatusField("podHealth", { type: "string", values: ["a", "b"] })).toBe(true);
  });
});
