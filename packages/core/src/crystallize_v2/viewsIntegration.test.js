import { describe, it, expect } from "vitest";
import { crystallizeV2 } from "./index.js";

describe("crystallize_v2 multi-archetype views", () => {
  const ontology = {
    entities: {
      Task: {
        fields: {
          id: {},
          title: { type: "text" },
          status: { type: "enum" },
          projectId: { type: "entityRef" },
        },
      },
    },
  };
  const intents = {
    add_task: {
      creates: "Task",
      name: "Добавить",
      particles: {
        entities: ["Task"],
        effects: [{ α: "add", target: "tasks" }],
        witnesses: ["title"],
      },
    },
  };

  it("projection без views — artifact.views is null (backward-compat)", () => {
    const projections = {
      tasks_list: { kind: "catalog", mainEntity: "Task", witnesses: ["title"] },
    };
    const artifacts = crystallizeV2(intents, projections, ontology, "test");
    expect(artifacts.tasks_list.views).toBeNull();
    expect(artifacts.tasks_list.viewSwitcher).toBeNull();
    expect(artifacts.tasks_list.defaultView).toBeNull();
    expect(artifacts.tasks_list.archetype).toBe("catalog");
  });

  it("projection с 3 views — artifact содержит views array + viewSwitcher spec", () => {
    const projections = {
      tasks_list: {
        kind: "catalog",
        mainEntity: "Task",
        witnesses: ["title", "status"],
        views: [
          { id: "board", name: "Доска", kind: "catalog", layout: "grid" },
          { id: "table", name: "Таблица", kind: "catalog", layout: "table" },
          { id: "stats", name: "Сводка", kind: "dashboard", widgets: [] },
        ],
        defaultView: "board",
      },
    };
    const art = crystallizeV2(intents, projections, ontology, "test").tasks_list;
    expect(art.views).toHaveLength(3);
    expect(art.defaultView).toBe("board");
    expect(art.viewSwitcher).toEqual({
      views: [
        { id: "board", name: "Доска", archetype: "catalog" },
        { id: "table", name: "Таблица", archetype: "catalog" },
        { id: "stats", name: "Сводка", archetype: "dashboard" },
      ],
      activeId: "board",
    });
  });

  it("default view = views[0].id если defaultView не указан", () => {
    const projections = {
      tasks_list: {
        kind: "catalog",
        mainEntity: "Task",
        witnesses: ["title"],
        views: [
          { id: "v1", name: "First", kind: "catalog", layout: "grid" },
          { id: "v2", name: "Second", kind: "catalog", layout: "table" },
        ],
      },
    };
    const art = crystallizeV2(intents, projections, ontology, "test").tasks_list;
    expect(art.defaultView).toBe("v1");
  });

  it("top-level slots/archetype = default view's", () => {
    const projections = {
      tasks_list: {
        kind: "catalog",
        mainEntity: "Task",
        witnesses: ["title"],
        views: [
          { id: "board", name: "Доска", kind: "catalog", layout: "grid" },
          { id: "stats", name: "Сводка", kind: "dashboard", widgets: [] },
        ],
        defaultView: "stats",
      },
    };
    const art = crystallizeV2(intents, projections, ontology, "test").tasks_list;
    expect(art.archetype).toBe("dashboard");
    const defaultView = art.views.find(v => v.id === "stats");
    expect(art.slots).toBe(defaultView.slots);
  });

  it("каждая view — независимая pass с собственным archetype и matched patterns array", () => {
    const projections = {
      tasks_list: {
        kind: "catalog",
        mainEntity: "Task",
        witnesses: ["title"],
        views: [
          { id: "board", name: "Доска", kind: "catalog", layout: "grid" },
          { id: "stats", name: "Сводка", kind: "dashboard", widgets: [] },
        ],
      },
    };
    const art = crystallizeV2(intents, projections, ontology, "test").tasks_list;
    const board = art.views.find(v => v.id === "board");
    const stats = art.views.find(v => v.id === "stats");
    expect(board.archetype).toBe("catalog");
    expect(stats.archetype).toBe("dashboard");
    expect(Array.isArray(board.matchedPatterns)).toBe(true);
    expect(Array.isArray(stats.matchedPatterns)).toBe(true);
  });

  it("single-view array — всё равно null views (threshold >= 2)", () => {
    const projections = {
      tasks_list: {
        kind: "catalog",
        mainEntity: "Task",
        witnesses: ["title"],
        views: [{ id: "only", name: "One", kind: "catalog" }],
      },
    };
    const art = crystallizeV2(intents, projections, ontology, "test").tasks_list;
    expect(art.views).toBeNull();
  });
});

describe("crystallize_v2 temporal witness (v0.14)", () => {
  it("detail с temporal subCollection → artifact.witnesses содержит basis=temporal-section", () => {
    const ontology = {
      entities: {
        Payment: { fields: { id: {}, amount: { type: "number" }, userId: { type: "entityRef" } }, ownerField: "userId" },
        PaymentEvent: {
          temporality: "causal-chain",
          ownerField: "paymentId",
          fields: {
            id: {},
            paymentId: { type: "entityRef" },
            kind: { type: "enum" },
            at: { type: "datetime" },
          },
        },
      },
    };
    const intents = {};
    const projections = {
      payment_detail: {
        kind: "detail",
        mainEntity: "Payment",
        subCollections: [
          { collection: "events", entity: "PaymentEvent", foreignKey: "paymentId" },
        ],
      },
    };
    const artifacts = crystallizeV2(intents, projections, ontology, "test");
    const w = artifacts.payment_detail.witnesses.find(x => x.basis === "temporal-section");
    expect(w).toBeDefined();
    expect(w.reliability).toBe("rule-based");
    expect(w.pattern).toBe("temporal:event-timeline");
    expect(w.requirements[0].spec.entity).toBe("PaymentEvent");
    expect(w.requirements[0].spec.temporality).toBe("causal-chain");
  });
});
