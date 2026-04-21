import { describe, it, expect } from "vitest";
import { buildRelations } from "../src/buildRelations.js";

describe("buildRelations", () => {
  it("FK tasks.user_id → users.id создаёт relation на Task", () => {
    const tables = new Map([
      ["users", { name: "User" }],
      ["tasks", { name: "Task" }],
    ]);
    const fks = [
      { table: "tasks", column: "user_id", ref_table: "users", ref_column: "id" },
    ];
    const entities = {
      User: { name: "User", fields: { id: { type: "string" } } },
      Task: {
        name: "Task",
        fields: { id: { type: "string" }, user_id: { type: "string" } },
      },
    };

    buildRelations(entities, tables, fks);

    expect(entities.Task.relations).toEqual({
      user_id: { entity: "User", kind: "belongs-to" },
    });
  });

  it("несколько FK на одной таблице", () => {
    const tables = new Map([
      ["users", { name: "User" }],
      ["orders", { name: "Order" }],
      ["products", { name: "Product" }],
      ["order_items", { name: "OrderItem" }],
    ]);
    const fks = [
      { table: "order_items", column: "order_id", ref_table: "orders", ref_column: "id" },
      { table: "order_items", column: "product_id", ref_table: "products", ref_column: "id" },
    ];
    const entities = {
      Order: { name: "Order", fields: {} },
      Product: { name: "Product", fields: {} },
      OrderItem: {
        name: "OrderItem",
        fields: { order_id: { type: "string" }, product_id: { type: "string" } },
      },
      User: { name: "User", fields: {} },
    };

    buildRelations(entities, tables, fks);

    expect(entities.OrderItem.relations.order_id).toEqual({
      entity: "Order",
      kind: "belongs-to",
    });
    expect(entities.OrderItem.relations.product_id).toEqual({
      entity: "Product",
      kind: "belongs-to",
    });
  });

  it("игнорирует FK к несуществующему entity", () => {
    const tables = new Map([["tasks", { name: "Task" }]]);
    const fks = [
      { table: "tasks", column: "foo_id", ref_table: "missing", ref_column: "id" },
    ];
    const entities = { Task: { name: "Task", fields: {} } };

    buildRelations(entities, tables, fks);

    expect(entities.Task.relations).toBeUndefined();
  });
});
