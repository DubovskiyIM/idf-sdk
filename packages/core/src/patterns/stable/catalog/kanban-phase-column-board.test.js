import { describe, it, expect } from "vitest";
import pattern from "./kanban-phase-column-board.js";

const mkOntology = () => ({
  entities: {
    Order: {
      fields: {
        id: { type: "text" },
        status: {
          type: "select",
          options: ["draft", "active", "completed", "cancelled"],
        },
      },
    },
  },
});

describe("kanban-phase-column-board.structure.apply", () => {
  it("body.layout устанавливается как kanban с колонками по status options", () => {
    const slots = { body: { type: "list", source: "orders", item: {} } };
    const result = pattern.structure.apply(slots, {
      ontology: mkOntology(),
      mainEntity: "Order",
    });
    expect(result.body.layout.type).toBe("kanban");
    expect(result.body.layout.columnField).toBe("status");
    expect(result.body.layout.columns.map(c => c.id)).toEqual([
      "draft", "active", "completed", "cancelled",
    ]);
  });

  it("columns: object-options → label/value", () => {
    const ontology = {
      entities: {
        Order: {
          fields: {
            status: {
              type: "select",
              options: [
                { value: "draft", label: "Черновик" },
                { value: "active", label: "Активный" },
                { value: "done", label: "Готово" },
              ],
            },
          },
        },
      },
    };
    const slots = { body: { type: "list" } };
    const result = pattern.structure.apply(slots, { ontology, mainEntity: "Order" });
    expect(result.body.layout.columns[0]).toEqual({ id: "draft", label: "Черновик" });
    expect(result.body.layout.columns[1]).toEqual({ id: "active", label: "Активный" });
  });

  it("entity.statuses legacy shape → columns", () => {
    const ontology = {
      entities: {
        Task: { statuses: ["todo", "doing", "done"] },
      },
    };
    const slots = { body: { type: "list" } };
    const result = pattern.structure.apply(slots, { ontology, mainEntity: "Task" });
    expect(result.body.layout.columns.map(c => c.id)).toEqual(["todo", "doing", "done"]);
  });

  it("author-override: существующий body.layout → skip", () => {
    const slots = { body: { type: "list", layout: "grid" } };
    const result = pattern.structure.apply(slots, {
      ontology: mkOntology(),
      mainEntity: "Order",
    });
    expect(result).toBe(slots);
    expect(result.body.layout).toBe("grid");
  });

  it("< 3 status options → no-op", () => {
    const ontology = {
      entities: { Task: { fields: { status: { options: ["on", "off"] } } } },
    };
    const slots = { body: { type: "list" } };
    const result = pattern.structure.apply(slots, { ontology, mainEntity: "Task" });
    expect(result).toBe(slots);
  });

  it("без body → no-op", () => {
    const slots = {};
    const result = pattern.structure.apply(slots, {
      ontology: mkOntology(),
      mainEntity: "Order",
    });
    expect(result).toBe(slots);
  });

  it("witness: layout.source = 'derived:kanban-phase-column-board'", () => {
    const slots = { body: { type: "list" } };
    const result = pattern.structure.apply(slots, {
      ontology: mkOntology(),
      mainEntity: "Order",
    });
    expect(result.body.layout.source).toBe("derived:kanban-phase-column-board");
  });
});
