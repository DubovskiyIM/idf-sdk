import { describe, it, expect } from "vitest";
import { assignToSlotsCatalog } from "./assignToSlotsCatalog.js";

const INTENTS = {
  add_task: {
    name: "Создать",
    creates: "Task",
    particles: { effects: [{ α: "add", target: "tasks" }] },
  },
};
const ONTOLOGY = {
  entities: {
    Task: { fields: { id: { type: "text" }, title: { type: "text" } } },
  },
};

describe("projection.sidebar (UI-gap #2)", () => {
  it("без projection.sidebar → slots.sidebar пустой массив", () => {
    const projection = { kind: "catalog", mainEntity: "Task", entities: ["Task"] };
    const slots = assignToSlotsCatalog(INTENTS, projection, ONTOLOGY);
    expect(slots.sidebar).toEqual([]);
  });

  it("projection.sidebar прокидывается в slots.sidebar as-is", () => {
    const sidebar = [
      {
        type: "card",
        children: [
          { type: "heading", content: "Как поручить задание?" },
          { type: "text", content: "Посмотрите короткое видео." },
        ],
      },
      {
        type: "card",
        children: [
          { type: "text", content: "Подарите другу и себе по 100 ₽" },
        ],
      },
    ];
    const projection = {
      kind: "catalog",
      mainEntity: "Task",
      entities: ["Task"],
      sidebar,
    };
    const slots = assignToSlotsCatalog(INTENTS, projection, ONTOLOGY);
    expect(slots.sidebar).toHaveLength(2);
    expect(slots.sidebar[0].type).toBe("card");
  });

  it("non-array projection.sidebar → пустой массив (graceful)", () => {
    const projection = {
      kind: "catalog",
      mainEntity: "Task",
      entities: ["Task"],
      sidebar: "invalid",
    };
    const slots = assignToSlotsCatalog(INTENTS, projection, ONTOLOGY);
    expect(slots.sidebar).toEqual([]);
  });
});
