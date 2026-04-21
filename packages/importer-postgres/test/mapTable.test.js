import { describe, it, expect } from "vitest";
import { mapTable } from "../src/mapTable.js";

const uuidCol = (name) => ({
  column_name: name,
  data_type: "uuid",
  is_nullable: "NO",
  column_default: null,
  character_maximum_length: null,
});

const textCol = (name) => ({
  column_name: name,
  data_type: "text",
  is_nullable: "NO",
  column_default: null,
  character_maximum_length: null,
});

describe("mapTable", () => {
  it("orders → Order (singular + PascalCase)", () => {
    const e = mapTable({
      table_name: "orders",
      columns: [uuidCol("id")],
      primary_key: ["id"],
    });
    expect(e.name).toBe("Order");
  });

  it("order_items → OrderItem", () => {
    const e = mapTable({
      table_name: "order_items",
      columns: [uuidCol("id")],
      primary_key: ["id"],
    });
    expect(e.name).toBe("OrderItem");
  });

  it("categories → Category (-ies → -y)", () => {
    const e = mapTable({
      table_name: "categories",
      columns: [uuidCol("id")],
      primary_key: ["id"],
    });
    expect(e.name).toBe("Category");
  });

  it("columns маппятся в fields через mapColumn", () => {
    const e = mapTable({
      table_name: "tasks",
      columns: [uuidCol("id"), textCol("title")],
      primary_key: ["id"],
    });
    expect(e.fields.id.type).toBe("string");
    expect(e.fields.id.readOnly).toBe(true);
    expect(e.fields.title.role).toBe("primary-title");
  });

  it("ownerField устанавливается если есть user_id", () => {
    const e = mapTable({
      table_name: "tasks",
      columns: [uuidCol("id"), uuidCol("user_id")],
      primary_key: ["id"],
    });
    expect(e.ownerField).toBe("user_id");
  });

  it("kind: internal по умолчанию", () => {
    const e = mapTable({
      table_name: "tasks",
      columns: [uuidCol("id")],
      primary_key: ["id"],
    });
    expect(e.kind).toBe("internal");
  });
});
