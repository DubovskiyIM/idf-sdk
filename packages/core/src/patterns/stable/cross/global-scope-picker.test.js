import { describe, it, expect } from "vitest";
import pattern from "./global-scope-picker.js";

const { findScopeEntity, countScopedEntities, humanize } = pattern._helpers;

// ── Вспомогательные онтологии ──────────────────────────────────────────────

const argoOntology = {
  entities: {
    Project: {
      kind: "reference",
      label: "Проект",
      fields: { id: { type: "text" }, name: { type: "text" } },
    },
    Application: { fields: { id: { type: "text" }, projectId: { type: "text" }, name: { type: "text" } } },
    Cluster:     { fields: { id: { type: "text" }, projectId: { type: "text" }, server: { type: "text" } } },
    Repository:  { fields: { id: { type: "text" }, projectId: { type: "text" }, url: { type: "text" } } },
    Certificate: { fields: { id: { type: "text" }, projectId: { type: "text" } } },
  },
};

const keycloakOntology = {
  entities: {
    Realm:  { isScope: true, label: "Realm", fields: { id: { type: "text" }, name: { type: "text" } } },
    Client: { fields: { id: { type: "text" }, realmId: { type: "text" } } },
    User:   { fields: { id: { type: "text" }, realmId: { type: "text" } } },
    Group:  { fields: { id: { type: "text" }, realmId: { type: "text" } } },
    Role:   { fields: { id: { type: "text" }, realmId: { type: "text" } } },
  },
};

const lifequestOntology = {
  entities: {
    User:  { fields: { id: { type: "text" } }, ownerField: "userId" },
    Goal:  { fields: { id: { type: "text" }, userId: { type: "text" } } },
    Habit: { fields: { id: { type: "text" }, userId: { type: "text" } } },
    Task:  { fields: { id: { type: "text" }, userId: { type: "text" } } },
  },
};

const planningOntology = {
  entities: {
    Poll:        { fields: { id: { type: "text" }, title: { type: "text" } }, ownerField: "organizerId" },
    TimeOption:  { fields: { id: { type: "text" }, pollId: { type: "text" } } },
    Participant: { fields: { id: { type: "text" }, pollId: { type: "text" } } },
    Vote:        { fields: { id: { type: "text" }, pollId: { type: "text" }, participantId: { type: "text" } } },
  },
};

const clusterOntology = {
  entities: {
    Cluster:    { fields: { id: { type: "text" }, name: { type: "text" } } },
    Node:       { fields: { id: { type: "text" }, clusterId: { type: "text" } } },
    Workload:   { fields: { id: { type: "text" }, clusterId: { type: "text" } } },
    Namespace:  { fields: { id: { type: "text" }, clusterId: { type: "text" } } },
    ConfigMap:  { fields: { id: { type: "text" }, clusterId: { type: "text" } } },
  },
};

// ── _helpers ───────────────────────────────────────────────────────────────

describe("_helpers.findScopeEntity", () => {
  it("находит entity с isScope: true (наивысший приоритет)", () => {
    const found = findScopeEntity(keycloakOntology);
    expect(found?.name).toBe("Realm");
  });

  it("находит entity с kind='reference'", () => {
    const found = findScopeEntity(argoOntology);
    expect(found?.name).toBe("Project");
  });

  it("находит entity по naming convention (Cluster)", () => {
    const found = findScopeEntity(clusterOntology);
    expect(found?.name).toBe("Cluster");
  });

  it("возвращает null если нет scope entity", () => {
    expect(findScopeEntity(planningOntology)).toBeNull();
  });

  it("возвращает null при пустом ontology", () => {
    expect(findScopeEntity({})).toBeNull();
    expect(findScopeEntity(null)).toBeNull();
  });

  it("находит entity с role.base='reference'", () => {
    const ont = {
      entities: {
        Workspace: { role: { base: "reference" }, fields: { id: { type: "text" } } },
        Doc:  { fields: { id: { type: "text" }, workspaceId: { type: "text" } } },
        Page: { fields: { id: { type: "text" }, workspaceId: { type: "text" } } },
        Tag:  { fields: { id: { type: "text" }, workspaceId: { type: "text" } } },
      },
    };
    const found = findScopeEntity(ont);
    expect(found?.name).toBe("Workspace");
  });
});

describe("_helpers.countScopedEntities", () => {
  it("считает entities с FK <scopeLower>Id (argoOntology → 4)", () => {
    expect(countScopedEntities(argoOntology, "Project")).toBe(4);
  });

  it("считает entities с FK в keycloakOntology (Realm → 4)", () => {
    expect(countScopedEntities(keycloakOntology, "Realm")).toBe(4);
  });

  it("не считает scope entity саму себя", () => {
    expect(countScopedEntities(argoOntology, "Project")).not.toBeGreaterThan(4);
  });

  it("возвращает 0 для entity без FK-зависимых", () => {
    const ont = {
      entities: {
        Scope: { fields: { id: { type: "text" } } },
        Other: { fields: { id: { type: "text" }, name: { type: "text" } } },
      },
    };
    expect(countScopedEntities(ont, "Scope")).toBe(0);
  });

  it("учитывает поле с references === scopeName", () => {
    const ont = {
      entities: {
        Scope: { fields: { id: { type: "text" } } },
        A: { fields: { id: { type: "text" }, scopeRef: { type: "entityRef", references: "Scope" } } },
        B: { fields: { id: { type: "text" }, scopeRef: { type: "entityRef", references: "Scope" } } },
        C: { fields: { id: { type: "text" }, scopeRef: { type: "entityRef", references: "Scope" } } },
      },
    };
    expect(countScopedEntities(ont, "Scope")).toBe(3);
  });
});

// ── trigger.match ─────────────────────────────────────────────────────────

describe("global-scope-picker.trigger.match", () => {
  it("matches: argo ontology (kind='reference' + 4 FK dependents)", () => {
    expect(pattern.trigger.match([], argoOntology, {})).toBe(true);
  });

  it("matches: keycloak ontology (isScope=true + 4 FK dependents)", () => {
    expect(pattern.trigger.match([], keycloakOntology, {})).toBe(true);
  });

  it("matches: cluster naming convention + 4 FK dependents", () => {
    expect(pattern.trigger.match([], clusterOntology, {})).toBe(true);
  });

  it("matches: projection.scope явно задан (без проверки ontology)", () => {
    expect(pattern.trigger.match([], {}, { scope: "SomeEntity" })).toBe(true);
  });

  it("не matches: lifequest — нет scope entity, только user-owned entities", () => {
    expect(pattern.trigger.match([], lifequestOntology, {})).toBe(false);
  });

  it("не matches: planning — нет scope entity по convention (Poll ≠ scope)", () => {
    expect(pattern.trigger.match([], planningOntology, {})).toBe(false);
  });

  it("не matches: scope entity найдена, но <3 зависимых entities", () => {
    const ont = {
      entities: {
        Realm: { isScope: true, fields: { id: { type: "text" } } },
        Client: { fields: { id: { type: "text" }, realmId: { type: "text" } } },
        User:   { fields: { id: { type: "text" }, realmId: { type: "text" } } },
        // только 2 зависимых — не достигаем порога 3
      },
    };
    expect(pattern.trigger.match([], ont, {})).toBe(false);
  });

  it("не matches: пустая ontology", () => {
    expect(pattern.trigger.match([], {}, {})).toBe(false);
  });
});

// ── structure.apply ────────────────────────────────────────────────────────

describe("global-scope-picker.structure.apply (§13b — array shape)", () => {
  // Helper: достаёт scopePicker node из array slots.header
  const findScopePicker = (header) =>
    Array.isArray(header) ? header.find((n) => n?.type === "scopePicker") : null;

  it("добавляет scopePicker node в slots.header array (argo ontology)", () => {
    const slots = { header: [] };
    const result = pattern.structure.apply(slots, { ontology: argoOntology, projection: {} });
    expect(Array.isArray(result.header)).toBe(true);
    const sp = findScopePicker(result.header);
    expect(sp).toMatchObject({
      type: "scopePicker",
      entity: "Project",
      label: "Проект",
      source: "derived:global-scope-picker",
    });
  });

  it("использует entity.label если задан", () => {
    const slots = { header: [] };
    const result = pattern.structure.apply(slots, { ontology: keycloakOntology, projection: {} });
    expect(findScopePicker(result.header).label).toBe("Realm");
  });

  it("humanize label если entity.label не задан", () => {
    const slots = { header: [] };
    const result = pattern.structure.apply(slots, { ontology: clusterOntology, projection: {} });
    const sp = findScopePicker(result.header);
    expect(sp.entity).toBe("Cluster");
    expect(sp.label).toBe("Cluster");
  });

  it("no-op: scopePicker уже задан (author-override) в array form", () => {
    const slots = {
      header: [{ type: "scopePicker", entity: "CustomScope", label: "My Scope" }],
    };
    const result = pattern.structure.apply(slots, { ontology: argoOntology, projection: {} });
    expect(result).toBe(slots);
    expect(findScopePicker(result.header).entity).toBe("CustomScope");
  });

  it("legacy: scopePicker в legacy object-form воспринимается как already-set (no-op)", () => {
    const slots = {
      header: { scopePicker: { entity: "Legacy", label: "Legacy" } },
    };
    const result = pattern.structure.apply(slots, { ontology: argoOntology, projection: {} });
    expect(result).toBe(slots);
  });

  it("no-op: нет scope entity", () => {
    const slots = { header: [] };
    const result = pattern.structure.apply(slots, { ontology: lifequestOntology, projection: {} });
    expect(result).toBe(slots);
    expect(findScopePicker(result.header)).toBeUndefined();
  });

  it("no-op: scope entity найдена но <3 зависимых", () => {
    const ont = {
      entities: {
        Realm: { isScope: true, fields: { id: { type: "text" } } },
        Client: { fields: { id: { type: "text" }, realmId: { type: "text" } } },
      },
    };
    const slots = { header: [] };
    const result = pattern.structure.apply(slots, { ontology: ont, projection: {} });
    expect(result).toBe(slots);
  });

  it("projection.scope override: entity из projection.scope, не из ontology detection", () => {
    const slots = { header: [] };
    const result = pattern.structure.apply(slots, {
      ontology: argoOntology,
      projection: { scope: "Cluster" },
    });
    expect(findScopePicker(result.header).entity).toBe("Cluster");
  });

  it("сохраняет существующие nodes в slots.header array", () => {
    const slots = { header: [{ type: "title", text: "Admin" }, { type: "breadcrumbs" }], body: {} };
    const result = pattern.structure.apply(slots, { ontology: argoOntology, projection: {} });
    expect(result.header).toHaveLength(3);
    expect(result.header[0]).toEqual({ type: "title", text: "Admin" });
    expect(result.header[1]).toEqual({ type: "breadcrumbs" });
    expect(result.header[2].type).toBe("scopePicker");
    expect(result.body).toEqual({});
  });

  it("создаёт slots.header (array) если его нет", () => {
    const slots = {};
    const result = pattern.structure.apply(slots, { ontology: argoOntology, projection: {} });
    expect(Array.isArray(result.header)).toBe(true);
    expect(findScopePicker(result.header)?.entity).toBe("Project");
  });
});
