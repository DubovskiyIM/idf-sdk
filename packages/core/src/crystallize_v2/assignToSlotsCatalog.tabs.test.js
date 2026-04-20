import { describe, it, expect } from "vitest";
import { assignToSlotsCatalog } from "./assignToSlotsCatalog.js";

// Минимальные объекты для теста catalog с tabs.
const INTENTS = {
  add_task: {
    name: "Создать",
    creates: "Task",
    particles: { effects: [{ α: "add", target: "tasks" }] },
  },
};
const ONTOLOGY = {
  entities: {
    Task: {
      fields: { id: { type: "text" }, title: { type: "text" }, status: { type: "text" } },
    },
  },
};

describe("projection.tabs (UI-gap #1)", () => {
  it("без projection.tabs → body.tabs отсутствует", () => {
    const projection = { kind: "catalog", mainEntity: "Task", entities: ["Task"] };
    const slots = assignToSlotsCatalog(INTENTS, projection, ONTOLOGY);
    expect(slots.body.tabs).toBeUndefined();
  });

  it("projection.tabs → body.tabs нормализованы + defaultTab прокинут", () => {
    const projection = {
      kind: "catalog",
      mainEntity: "Task",
      entities: ["Task"],
      tabs: [
        { id: "new", label: "+ Новое", filter: "item.status === 'draft'" },
        { id: "open", label: "Открытые", filter: "item.status === 'published'" },
        { id: "history", label: "История", filter: "item.status === 'closed'" },
      ],
      defaultTab: "open",
    };
    const slots = assignToSlotsCatalog(INTENTS, projection, ONTOLOGY);
    expect(slots.body.tabs).toHaveLength(3);
    expect(slots.body.tabs[0]).toEqual({
      id: "new",
      label: "+ Новое",
      filter: "item.status === 'draft'",
    });
    expect(slots.body.defaultTab).toBe("open");
  });

  it("tabs с structured filter (объект) прокидывается as-is", () => {
    const projection = {
      kind: "catalog",
      mainEntity: "Task",
      entities: ["Task"],
      tabs: [
        { id: "mine", label: "Мои", filter: { field: "customerId", op: "=", value: "me.id" } },
      ],
    };
    const slots = assignToSlotsCatalog(INTENTS, projection, ONTOLOGY);
    expect(slots.body.tabs[0].filter).toEqual({
      field: "customerId",
      op: "=",
      value: "me.id",
    });
  });

  it("invalid entries (без id) drop-аются", () => {
    const projection = {
      kind: "catalog",
      mainEntity: "Task",
      entities: ["Task"],
      tabs: [
        { id: "ok", label: "OK" },
        null,
        { label: "no-id" },
        undefined,
        { id: "ok2" },
      ],
    };
    const slots = assignToSlotsCatalog(INTENTS, projection, ONTOLOGY);
    expect(slots.body.tabs.map(t => t.id)).toEqual(["ok", "ok2"]);
  });

  it("пустой tabs массив → tabs отсутствует", () => {
    const projection = {
      kind: "catalog",
      mainEntity: "Task",
      entities: ["Task"],
      tabs: [],
    };
    const slots = assignToSlotsCatalog(INTENTS, projection, ONTOLOGY);
    expect(slots.body.tabs).toBeUndefined();
  });
});
