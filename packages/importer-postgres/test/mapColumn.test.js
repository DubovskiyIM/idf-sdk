import { describe, it, expect } from "vitest";
import { mapColumn } from "../src/mapColumn.js";

describe("mapColumn", () => {
  const base = {
    column_name: "x",
    data_type: "text",
    is_nullable: "YES",
    column_default: null,
    character_maximum_length: null,
  };

  it("text column маппится в {type:string}", () => {
    const f = mapColumn({ ...base, column_name: "note" });
    expect(f.type).toBe("string");
  });

  it("integer → {type:number}", () => {
    const f = mapColumn({ ...base, column_name: "count", data_type: "integer" });
    expect(f.type).toBe("number");
  });

  it("boolean → {type:boolean}", () => {
    const f = mapColumn({ ...base, column_name: "active", data_type: "boolean" });
    expect(f.type).toBe("boolean");
  });

  it("timestamp/timestamptz → {type:datetime}", () => {
    expect(mapColumn({ ...base, data_type: "timestamp without time zone" }).type).toBe("datetime");
    expect(mapColumn({ ...base, data_type: "timestamp with time zone" }).type).toBe("datetime");
  });

  it("uuid PK имеет readOnly=true", () => {
    const f = mapColumn({ ...base, column_name: "id", data_type: "uuid" }, { isPrimaryKey: true });
    expect(f.type).toBe("string");
    expect(f.readOnly).toBe(true);
  });

  it("title/name → role: primary-title", () => {
    expect(mapColumn({ ...base, column_name: "title" }).role).toBe("primary-title");
    expect(mapColumn({ ...base, column_name: "name" }).role).toBe("primary-title");
  });

  it("created_at / updated_at → role: date-witness + readOnly", () => {
    const f = mapColumn({ ...base, column_name: "created_at", data_type: "timestamp with time zone" });
    expect(f.role).toBe("date-witness");
    expect(f.readOnly).toBe(true);
  });

  it("email → role: contact", () => {
    expect(mapColumn({ ...base, column_name: "email" }).role).toBe("contact");
  });

  it("price + numeric → role: money", () => {
    const f = mapColumn({ ...base, column_name: "price", data_type: "numeric" });
    expect(f.role).toBe("money");
  });

  it("is_active → role: status-flag", () => {
    const f = mapColumn({ ...base, column_name: "is_active", data_type: "boolean" });
    expect(f.role).toBe("status-flag");
  });

  it("default из column_default, если не expression", () => {
    const f = mapColumn({ ...base, column_name: "status", column_default: "'todo'::text" });
    expect(f.default).toBe("todo");
  });

  it("игнорирует выражения в default (now() и тп)", () => {
    const f = mapColumn({ ...base, column_name: "created_at", column_default: "now()" });
    expect(f.default).toBeUndefined();
  });
});
