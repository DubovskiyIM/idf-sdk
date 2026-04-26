import { describe, it, expect } from "vitest";
import {
  CANONICAL_TYPES,
  TYPE_ALIASES,
  normalizeFieldType,
  normalizeFieldDef,
  camelToSnake,
  snakeToCamel,
  inferWireFieldName,
  applyFieldMapping,
  buildAutoFieldMapping,
} from "./typeMapping.js";

describe("CANONICAL_TYPES + TYPE_ALIASES", () => {
  it("CANONICAL_TYPES is frozen non-empty array", () => {
    expect(Array.isArray(CANONICAL_TYPES)).toBe(true);
    expect(CANONICAL_TYPES.length).toBeGreaterThan(20);
    expect(Object.isFrozen(CANONICAL_TYPES)).toBe(true);
  });

  it("CANONICAL_TYPES has no duplicates", () => {
    expect(new Set(CANONICAL_TYPES).size).toBe(CANONICAL_TYPES.length);
  });

  it("TYPE_ALIASES values all point to canonical types", () => {
    for (const [alias, canonical] of Object.entries(TYPE_ALIASES)) {
      expect(CANONICAL_TYPES).toContain(canonical);
      expect(typeof alias).toBe("string");
    }
  });

  it("contains expected canonical types", () => {
    expect(CANONICAL_TYPES).toEqual(expect.arrayContaining([
      "text", "number", "integer", "decimal", "boolean",
      "datetime", "id", "uuid", "email", "url", "secret",
      "select", "entityRef", "entityRefArray", "json",
      "money", "percentage", "coordinate", "address", "zone",
    ]));
  });
});

describe("normalizeFieldType", () => {
  it("canonical types pass through unchanged", () => {
    expect(normalizeFieldType("text")).toBe("text");
    expect(normalizeFieldType("number")).toBe("number");
    expect(normalizeFieldType("entityRef")).toBe("entityRef");
  });

  it("string aliases → text", () => {
    expect(normalizeFieldType("string")).toBe("text");
    expect(normalizeFieldType("varchar")).toBe("text");
    expect(normalizeFieldType("char")).toBe("text");
    expect(normalizeFieldType("String")).toBe("text");
    expect(normalizeFieldType("TEXT")).toBe("text");
  });

  it("integer aliases → integer", () => {
    expect(normalizeFieldType("int")).toBe("integer");
    expect(normalizeFieldType("bigint")).toBe("integer");
    expect(normalizeFieldType("smallint")).toBe("integer");
    expect(normalizeFieldType("Int")).toBe("integer");
    expect(normalizeFieldType("serial")).toBe("integer");
  });

  it("decimal aliases → decimal", () => {
    expect(normalizeFieldType("float")).toBe("decimal");
    expect(normalizeFieldType("double")).toBe("decimal");
    expect(normalizeFieldType("numeric")).toBe("decimal");
    expect(normalizeFieldType("real")).toBe("decimal");
  });

  it("boolean aliases → boolean", () => {
    expect(normalizeFieldType("bool")).toBe("boolean");
    expect(normalizeFieldType("Boolean")).toBe("boolean");
    expect(normalizeFieldType("bit")).toBe("boolean");
  });

  it("timestamp aliases → datetime", () => {
    expect(normalizeFieldType("timestamp")).toBe("datetime");
    expect(normalizeFieldType("timestamptz")).toBe("datetime");
    expect(normalizeFieldType("DateTime")).toBe("datetime");
  });

  it("ORM relation aliases → entityRef family", () => {
    expect(normalizeFieldType("ManyToOne")).toBe("entityRef");
    expect(normalizeFieldType("OneToMany")).toBe("entityRefArray");
    expect(normalizeFieldType("ManyToMany")).toBe("entityRefArray");
    expect(normalizeFieldType("reference")).toBe("entityRef");
  });

  it("case-insensitive fallback for unknown casing", () => {
    expect(normalizeFieldType("TEXTAREA")).toBe("textarea");
    expect(normalizeFieldType("BOOLEAN")).toBe("boolean");
  });

  it("unknown types pass through (graceful degradation)", () => {
    expect(normalizeFieldType("custom-quantum-type")).toBe("custom-quantum-type");
  });

  it("null / undefined / non-string → 'text'", () => {
    expect(normalizeFieldType(null)).toBe("text");
    expect(normalizeFieldType(undefined)).toBe("text");
    expect(normalizeFieldType(123)).toBe("text");
    expect(normalizeFieldType({})).toBe("text");
  });
});

describe("normalizeFieldDef", () => {
  it("normalizes type while preserving other props", () => {
    const out = normalizeFieldDef({ type: "string", required: true, fieldRole: "label" });
    expect(out.type).toBe("text");
    expect(out.required).toBe(true);
    expect(out.fieldRole).toBe("label");
  });

  it("does not mutate input", () => {
    const input = { type: "int" };
    const out = normalizeFieldDef(input);
    expect(input.type).toBe("int");
    expect(out.type).toBe("integer");
  });

  it("derives type:'entityRef' from references shape", () => {
    expect(normalizeFieldDef({ references: "User" })).toEqual({
      type: "entityRef",
      references: "User",
    });
  });

  it("derives type:'entityRefArray' from references + array marker", () => {
    expect(normalizeFieldDef({ references: "Tag", array: true })).toMatchObject({
      type: "entityRefArray",
      references: "Tag",
    });
    expect(normalizeFieldDef({ references: "Tag", multi: true }).type).toBe("entityRefArray");
    expect(normalizeFieldDef({ references: "Tag", many: true }).type).toBe("entityRefArray");
  });

  it("derives entityRef from entityRef shorthand", () => {
    const out = normalizeFieldDef({ entityRef: "User" });
    expect(out.type).toBe("entityRef");
    expect(out.references).toBe("User");
  });

  it("missing type without references → 'text'", () => {
    expect(normalizeFieldDef({}).type).toBe("text");
    expect(normalizeFieldDef(null).type).toBe("text");
    expect(normalizeFieldDef(undefined).type).toBe("text");
  });
});

describe("camelToSnake / snakeToCamel — name bridge", () => {
  it("camelToSnake basic", () => {
    expect(camelToSnake("botToken")).toBe("bot_token");
    expect(camelToSnake("helloWorld")).toBe("hello_world");
    expect(camelToSnake("autoReply")).toBe("auto_reply");
  });

  it("camelToSnake handles uppercase runs (acronyms)", () => {
    expect(camelToSnake("URLPath")).toBe("url_path");
    expect(camelToSnake("XMLParser")).toBe("xml_parser");
    expect(camelToSnake("isHTTPSEnabled")).toBe("is_https_enabled");
  });

  it("camelToSnake idempotent on already-snake", () => {
    expect(camelToSnake("bot_token")).toBe("bot_token");
    expect(camelToSnake("simple")).toBe("simple");
  });

  it("camelToSnake handles digits", () => {
    expect(camelToSnake("user2Id")).toBe("user2_id");
    expect(camelToSnake("name3")).toBe("name3");
  });

  it("snakeToCamel basic", () => {
    expect(snakeToCamel("bot_token")).toBe("botToken");
    expect(snakeToCamel("hello_world")).toBe("helloWorld");
    expect(snakeToCamel("auto_reply_enabled")).toBe("autoReplyEnabled");
  });

  it("snakeToCamel idempotent on camelCase", () => {
    expect(snakeToCamel("botToken")).toBe("botToken");
    expect(snakeToCamel("simple")).toBe("simple");
  });

  it("non-string input passes through", () => {
    expect(camelToSnake(null)).toBe(null);
    expect(camelToSnake(undefined)).toBe(undefined);
    expect(snakeToCamel("")).toBe("");
  });
});

describe("inferWireFieldName", () => {
  it("default snake_case", () => {
    expect(inferWireFieldName("botToken")).toBe("bot_token");
    expect(inferWireFieldName("autoReplyEnabled")).toBe("auto_reply_enabled");
  });

  it("explicit case option", () => {
    expect(inferWireFieldName("bot_token", { case: "camel" })).toBe("botToken");
    expect(inferWireFieldName("botToken", { case: "original" })).toBe("botToken");
  });
});

describe("applyFieldMapping", () => {
  const mapping = {
    botToken: "bot_token",
    autoReplyEnabled: "auto_reply",
    webhookUrl: "webhook_url",
  };

  it("toWire — canonical → wire names", () => {
    const out = applyFieldMapping(
      { botToken: "abc", autoReplyEnabled: true, label: "Greeter" },
      mapping,
      "toWire",
    );
    expect(out).toEqual({
      bot_token: "abc",
      auto_reply: true,
      label: "Greeter", // not in mapping → passthrough
    });
  });

  it("fromWire — wire → canonical names", () => {
    const out = applyFieldMapping(
      { bot_token: "abc", auto_reply: true, label: "Greeter" },
      mapping,
      "fromWire",
    );
    expect(out).toEqual({
      botToken: "abc",
      autoReplyEnabled: true,
      label: "Greeter",
    });
  });

  it("default direction is toWire", () => {
    const out = applyFieldMapping({ botToken: "x" }, { botToken: "bot_token" });
    expect(out).toEqual({ bot_token: "x" });
  });

  it("does not mutate input", () => {
    const input = { botToken: "x" };
    applyFieldMapping(input, mapping, "toWire");
    expect(input).toEqual({ botToken: "x" });
  });

  it("empty / missing mapping passes object through (shallow clone)", () => {
    const input = { a: 1, b: 2 };
    expect(applyFieldMapping(input, {}, "toWire")).toEqual(input);
    expect(applyFieldMapping(input, null, "toWire")).toEqual(input);
  });

  it("non-object input returns as-is", () => {
    expect(applyFieldMapping(null, mapping, "toWire")).toBeNull();
    expect(applyFieldMapping([1, 2], mapping, "toWire")).toEqual([1, 2]);
  });

  it("preserves field values verbatim (no value transforms)", () => {
    const out = applyFieldMapping(
      { botToken: { nested: { key: "value" } }, count: 0, flag: false },
      { botToken: "bot_token" },
      "toWire",
    );
    expect(out.bot_token).toEqual({ nested: { key: "value" } });
    expect(out.count).toBe(0);
    expect(out.flag).toBe(false);
  });
});

describe("buildAutoFieldMapping", () => {
  it("derives snake_case mapping from camelCase fields", () => {
    const mapping = buildAutoFieldMapping(["botToken", "autoReply", "label"]);
    expect(mapping).toEqual({
      botToken: "bot_token",
      autoReply: "auto_reply",
      // "label" is identical → not included in mapping
    });
  });

  it("works on fields-as-object shape", () => {
    const mapping = buildAutoFieldMapping({
      botToken: { type: "secret" },
      webhookUrl: { type: "url" },
      id: { type: "id" },
    });
    expect(mapping).toEqual({
      botToken: "bot_token",
      webhookUrl: "webhook_url",
    });
  });

  it("returns empty mapping for already-snake fields", () => {
    expect(buildAutoFieldMapping(["bot_token", "label"])).toEqual({});
  });

  it("camel direction reverse", () => {
    const mapping = buildAutoFieldMapping(["bot_token", "auto_reply"], { case: "camel" });
    expect(mapping).toEqual({
      bot_token: "botToken",
      auto_reply: "autoReply",
    });
  });

  it("safe on non-array/object input", () => {
    expect(buildAutoFieldMapping(null)).toEqual({});
    expect(buildAutoFieldMapping(undefined)).toEqual({});
    expect(buildAutoFieldMapping("string")).toEqual({});
  });
});

describe("end-to-end: importer-output → normalize → bridge", () => {
  it("OpenAPI-shape ontology field is brought to canonical + wire", () => {
    const rawField = { type: "string", format: "date-time", references: undefined };
    const normalized = normalizeFieldDef(rawField);
    expect(normalized.type).toBe("text");

    // Now build mapping for `botToken` field on an entity:
    const mapping = buildAutoFieldMapping(["botToken", "secretToken"]);
    const wire = applyFieldMapping({ botToken: "abc", secretToken: "xyz" }, mapping, "toWire");
    expect(wire).toEqual({ bot_token: "abc", secret_token: "xyz" });

    // Round-trip:
    const roundTripped = applyFieldMapping(wire, mapping, "fromWire");
    expect(roundTripped).toEqual({ botToken: "abc", secretToken: "xyz" });
  });

  it("Postgres-shape (snake-cased + capital types) → camelCase canonical", () => {
    const rawField = { type: "VARCHAR" };
    expect(normalizeFieldDef(rawField).type).toBe("text");

    const wireRow = { bot_token: "x", auto_reply_enabled: true };
    const mapping = buildAutoFieldMapping(["botToken", "autoReplyEnabled"]);
    expect(applyFieldMapping(wireRow, mapping, "fromWire")).toEqual({
      botToken: "x",
      autoReplyEnabled: true,
    });
  });
});
