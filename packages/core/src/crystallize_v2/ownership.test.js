/**
 * Тесты multi-owner ownership (backlog 3.2).
 *
 * Проверяем через публичный контракт assignToSlotsDetail → condition
 * на toolbar-items, т.к. ownershipConditionFor не экспортирована.
 */
import { describe, it, expect } from "vitest";
import { assignToSlotsDetail } from "./assignToSlotsDetail.js";

function baseIntent(overrides = {}) {
  return {
    name: overrides.name || "Действие",
    particles: {
      entities: ["deal: Deal"],
      witnesses: [],
      confirmation: "click",
      conditions: [],
      effects: [{ α: "replace", target: "deal.title" }],
    },
    ...overrides,
  };
}

const PROJECTION = { mainEntity: "Deal", kind: "detail", entities: ["Deal"] };

function ontologyWith(entityDef) {
  return { entities: { Deal: entityDef } };
}

describe("multi-owner ownership (backlog 3.2)", () => {
  it("single ownerField (legacy) → условие на одно поле", () => {
    const slots = assignToSlotsDetail(
      { accept: baseIntent({ name: "accept" }) },
      PROJECTION,
      ontologyWith({
        ownerField: "customerId",
        fields: { status: {}, customerId: { type: "entityRef" } },
      }),
    );
    const item = slots.toolbar.find(t => t.intentId === "accept");
    expect(item).toBeTruthy();
    expect(item.condition).toBe("customerId === viewer.id");
  });

  it("entity.owners: [a,b] → OR-условие на оба", () => {
    const slots = assignToSlotsDetail(
      { cancel: baseIntent({ name: "cancel" }) },
      PROJECTION,
      ontologyWith({
        owners: ["customerId", "executorId"],
        fields: {
          title: { type: "text" },
          customerId: { type: "entityRef" },
          executorId: { type: "entityRef" },
        },
      }),
    );
    const item = slots.toolbar.find(t => t.intentId === "cancel");
    expect(item).toBeTruthy();
    expect(item.condition).toBe("(customerId === viewer.id || executorId === viewer.id)");
  });

  it("intent.permittedFor сужает owners (executor-only action)", () => {
    const submit = baseIntent({ name: "submit" });
    submit.permittedFor = "executorId";
    const slots = assignToSlotsDetail(
      { submit },
      PROJECTION,
      ontologyWith({
        owners: ["customerId", "executorId"],
        fields: {
          title: { type: "text" },
          customerId: { type: "entityRef" },
          executorId: { type: "entityRef" },
        },
      }),
    );
    const item = slots.toolbar.find(t => t.intentId === "submit");
    expect(item.condition).toBe("executorId === viewer.id");
  });

  it("intent.permittedFor как массив поддерживает подмножество owners", () => {
    const view = baseIntent({ name: "view" });
    view.permittedFor = ["customerId", "executorId"];
    const slots = assignToSlotsDetail(
      { view },
      PROJECTION,
      ontologyWith({
        owners: ["customerId", "executorId", "moderatorId"],
        fields: {
          title: { type: "text" },
          customerId: { type: "entityRef" },
          executorId: { type: "entityRef" },
          moderatorId: { type: "entityRef" },
        },
      }),
    );
    const item = slots.toolbar.find(t => t.intentId === "view");
    expect(item.condition).toBe("(customerId === viewer.id || executorId === viewer.id)");
  });

  it("backlog 3.1: phase-transition intent с parameters не идёт в primaryCTA", () => {
    const submitWithParams = {
      name: "submit_work_result",
      confirmation: "form",
      parameters: [{ name: "result", control: "textarea", required: true }],
      particles: {
        entities: ["deal: Deal"],
        witnesses: [],
        confirmation: "form",
        conditions: [],
        effects: [{ α: "replace", target: "deal.status", value: "submitted" }],
      },
    };
    const slots = assignToSlotsDetail(
      { submit_work_result: submitWithParams },
      PROJECTION,
      ontologyWith({
        owners: ["customerId", "executorId"],
        fields: { status: {}, customerId: { type: "entityRef" }, executorId: { type: "entityRef" } },
      }),
    );
    expect(slots.primaryCTA).toHaveLength(0);
    // Intent попадает в toolbar через formModal overlay flow
    const inToolbar = slots.toolbar.some(t => t.intentId === "submit_work_result");
    expect(inToolbar).toBe(true);
  });

  it("backlog 3.1: phase-transition БЕЗ parameters идёт в primaryCTA как раньше", () => {
    const acceptNoParams = {
      name: "accept",
      confirmation: "click",
      particles: {
        entities: ["deal: Deal"],
        witnesses: [],
        confirmation: "click",
        conditions: [],
        effects: [{ α: "replace", target: "deal.status", value: "accepted" }],
      },
    };
    const slots = assignToSlotsDetail(
      { accept: acceptNoParams },
      PROJECTION,
      ontologyWith({
        owners: ["customerId"],
        fields: { status: {}, customerId: { type: "entityRef" } },
      }),
    );
    expect(slots.primaryCTA).toHaveLength(1);
    expect(slots.primaryCTA[0].intentId).toBe("accept");
  });

  it("backlog 4.4: 4 toolbar-кнопки с salience=primary и fallback-иконкой все попадают в visible", () => {
    // Non-status replace → попадают в toolbar, не в primaryCTA.
    // salience: "primary" → важные, не дедупятся по icon.
    const mkPrimary = (name) => ({
      name,
      salience: "primary",
      confirmation: "click",
      particles: {
        entities: ["deal: Deal"],
        witnesses: [],
        confirmation: "click",
        conditions: [],
        effects: [{ α: "replace", target: "deal.title" }],
      },
    });
    const slots = assignToSlotsDetail(
      {
        a: mkPrimary("a"),
        b: mkPrimary("b"),
        c: mkPrimary("c"),
      },
      PROJECTION,
      ontologyWith({
        owners: ["customerId"],
        fields: {
          title: { type: "text" },
          customerId: { type: "entityRef" },
        },
      }),
    );
    // Все 3 в visible (не в overflow), несмотря на одинаковую fallback-иконку.
    const toolbarIntentIds = slots.toolbar
      .filter(t => t.type !== "overflow")
      .map(t => t.intentId);
    expect(toolbarIntentIds).toEqual(expect.arrayContaining(["a", "b", "c"]));
  });

  it("permittedFor, не пересекающийся с owners → fallback на все owners", () => {
    const wild = baseIntent({ name: "wild" });
    wild.permittedFor = "stranger";
    const slots = assignToSlotsDetail(
      { wild },
      PROJECTION,
      ontologyWith({
        owners: ["customerId", "executorId"],
        fields: {
          title: { type: "text" },
          customerId: { type: "entityRef" },
          executorId: { type: "entityRef" },
        },
      }),
    );
    const item = slots.toolbar.find(t => t.intentId === "wild");
    expect(item.condition).toBe("(customerId === viewer.id || executorId === viewer.id)");
  });
});
