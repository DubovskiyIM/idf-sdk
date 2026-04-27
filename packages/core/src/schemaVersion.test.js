import { describe, expect, it } from "vitest";
import {
  UNKNOWN_SCHEMA_VERSION,
  getSchemaVersion,
  tagWithSchemaVersion,
  hashOntology,
} from "./schemaVersion.js";

describe("getSchemaVersion", () => {
  it("returns UNKNOWN_SCHEMA_VERSION for legacy effect without context.schemaVersion", () => {
    expect(getSchemaVersion({ id: "e1", alpha: "add", target: "task" })).toBe(UNKNOWN_SCHEMA_VERSION);
  });

  it("returns the value when present", () => {
    const e = { id: "e1", alpha: "add", target: "task", context: { schemaVersion: "abc123def456" } };
    expect(getSchemaVersion(e)).toBe("abc123def456");
  });

  it("returns UNKNOWN_SCHEMA_VERSION for null/undefined effect", () => {
    expect(getSchemaVersion(null)).toBe(UNKNOWN_SCHEMA_VERSION);
    expect(getSchemaVersion(undefined)).toBe(UNKNOWN_SCHEMA_VERSION);
  });

  it("returns UNKNOWN_SCHEMA_VERSION for effect with non-object context", () => {
    expect(getSchemaVersion({ context: "not-an-object" })).toBe(UNKNOWN_SCHEMA_VERSION);
  });

  it("returns UNKNOWN_SCHEMA_VERSION for empty-string schemaVersion", () => {
    expect(getSchemaVersion({ context: { schemaVersion: "" } })).toBe(UNKNOWN_SCHEMA_VERSION);
  });

  it("returns UNKNOWN_SCHEMA_VERSION for non-string schemaVersion", () => {
    expect(getSchemaVersion({ context: { schemaVersion: 42 } })).toBe(UNKNOWN_SCHEMA_VERSION);
  });
});

describe("tagWithSchemaVersion", () => {
  it("adds schemaVersion to context (legacy effect without context)", () => {
    const e = { id: "e1", alpha: "add", target: "task" };
    const tagged = tagWithSchemaVersion(e, "abc123");
    expect(tagged.context.schemaVersion).toBe("abc123");
    expect(getSchemaVersion(tagged)).toBe("abc123");
  });

  it("preserves existing context fields", () => {
    const e = { id: "e1", context: { actor: "user-7", __irr: { point: "high", at: "2026-04-01" } } };
    const tagged = tagWithSchemaVersion(e, "v2");
    expect(tagged.context.actor).toBe("user-7");
    expect(tagged.context.__irr.point).toBe("high");
    expect(tagged.context.schemaVersion).toBe("v2");
  });

  it("does not mutate the input", () => {
    const e = { id: "e1", context: { actor: "user-7" } };
    const before = JSON.stringify(e);
    tagWithSchemaVersion(e, "v2");
    expect(JSON.stringify(e)).toBe(before);
  });

  it("overwrites existing schemaVersion", () => {
    const e = { id: "e1", context: { schemaVersion: "old" } };
    expect(getSchemaVersion(tagWithSchemaVersion(e, "new"))).toBe("new");
  });

  it("returns input unchanged for empty version (defensive)", () => {
    const e = { id: "e1", context: { actor: "u" } };
    expect(tagWithSchemaVersion(e, "")).toBe(e);
    expect(tagWithSchemaVersion(e, null)).toBe(e);
  });

  it("returns input unchanged when effect is null/undefined", () => {
    expect(tagWithSchemaVersion(null, "v1")).toBeNull();
    expect(tagWithSchemaVersion(undefined, "v1")).toBeUndefined();
  });
});

describe("hashOntology", () => {
  it("returns a 14-character hex string", () => {
    const h = hashOntology({ entities: { Task: { fields: {} } } });
    expect(h).toMatch(/^[0-9a-f]{14}$/);
  });

  it("is deterministic across calls", () => {
    const ontology = { entities: { Task: { fields: { title: { type: "string" } } } } };
    expect(hashOntology(ontology)).toBe(hashOntology(ontology));
  });

  it("is order-independent for object keys", () => {
    const a = { entities: { Task: { fields: { title: { type: "string" } } } }, version: "1" };
    const b = { version: "1", entities: { Task: { fields: { title: { type: "string" } } } } };
    expect(hashOntology(a)).toBe(hashOntology(b));
  });

  it("is order-sensitive for arrays (intentional — array order is semantic)", () => {
    const a = { intents: [{ id: "a" }, { id: "b" }] };
    const b = { intents: [{ id: "b" }, { id: "a" }] };
    expect(hashOntology(a)).not.toBe(hashOntology(b));
  });

  it("differs when a field is added", () => {
    const a = { entities: { Task: { fields: { title: { type: "string" } } } } };
    const b = { entities: { Task: { fields: { title: { type: "string" }, priority: { type: "number" } } } } };
    expect(hashOntology(a)).not.toBe(hashOntology(b));
  });

  it("differs when a field type changes", () => {
    const a = { entities: { Task: { fields: { count: { type: "number" } } } } };
    const b = { entities: { Task: { fields: { count: { type: "string" } } } } };
    expect(hashOntology(a)).not.toBe(hashOntology(b));
  });

  it("returns 14 zeros for null/undefined", () => {
    expect(hashOntology(null)).toBe("00000000000000");
    expect(hashOntology(undefined)).toBe("00000000000000");
  });

  it("handles deeply nested structures", () => {
    const ont = {
      entities: {
        A: { fields: { x: { type: "ref", entity: "B" } } },
        B: { fields: { y: { type: "ref", entity: "C" } } },
        C: { fields: { z: { type: "string" } } },
      },
    };
    expect(hashOntology(ont)).toMatch(/^[0-9a-f]{14}$/);
  });

  it("treats empty ontology and null differently", () => {
    expect(hashOntology({})).not.toBe(hashOntology(null));
  });
});

describe("integration: tag + read round-trip", () => {
  it("tag with hashOntology output, read back equals", () => {
    const ontology = { entities: { Task: { fields: { title: { type: "string" } } } } };
    const version = hashOntology(ontology);
    const effect = { id: "e1", alpha: "add", target: "task", context: { actor: "u" } };
    const tagged = tagWithSchemaVersion(effect, version);
    expect(getSchemaVersion(tagged)).toBe(version);
  });

  it("legacy effect through tag-untagged path stays UNKNOWN", () => {
    const effect = { id: "e1", alpha: "add", target: "task" };
    expect(getSchemaVersion(effect)).toBe(UNKNOWN_SCHEMA_VERSION);
  });
});
