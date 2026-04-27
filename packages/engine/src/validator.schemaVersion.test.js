import { describe, it, expect } from "vitest";
import { hashOntology, getSchemaVersion, UNKNOWN_SCHEMA_VERSION } from "@intent-driven/core";
import { createEngine, createInMemoryPersistence } from "./index.js";

const baseDomain = {
  ONTOLOGY: {
    entities: { Foo: {} },
    roles: { user: { base: "owner", visibleFields: { Foo: ["id", "name"] } } },
    rules: [],
  },
  INTENTS: {
    create_foo: {
      particles: { effects: [{ alpha: "add", target: "Foo" }], conditions: [] },
    },
    update_foo: {
      particles: { effects: [{ alpha: "replace", target: "Foo" }], conditions: [] },
    },
    batch_foo: {
      particles: { effects: [{ alpha: "batch", target: "Foo" }], conditions: [] },
    },
  },
};

function mkEngine(domain = baseDomain) {
  const persistence = createInMemoryPersistence();
  const engine = createEngine({ domain, persistence, clock: () => 1000 });
  return { engine, persistence };
}

describe("Φ schema-versioning Phase 1: validator submit tagging", () => {
  it("exposes schemaVersion derived from ontology hash", () => {
    const { engine } = mkEngine();
    const expected = hashOntology(baseDomain.ONTOLOGY);
    expect(engine.schemaVersion).toBe(expected);
    expect(engine.schemaVersion).toMatch(/^[0-9a-f]{14}$/);
  });

  it("two engines with the same ontology agree on schemaVersion", () => {
    const a = mkEngine();
    const b = mkEngine();
    expect(a.engine.schemaVersion).toBe(b.engine.schemaVersion);
  });

  it("different ontologies produce different schemaVersion", () => {
    const altDomain = {
      ...baseDomain,
      ONTOLOGY: { ...baseDomain.ONTOLOGY, entities: { Foo: {}, Bar: {} } },
    };
    const a = mkEngine();
    const b = mkEngine(altDomain);
    expect(a.engine.schemaVersion).not.toBe(b.engine.schemaVersion);
  });

  it("submit tags confirmed effect.context.schemaVersion with engine hash", async () => {
    const { engine, persistence } = mkEngine();
    await engine.submit({
      id: "e1",
      intent_id: "create_foo",
      alpha: "add",
      target: "Foo",
      context: { id: "f1", name: "hello" },
      created_at: 1000,
    });

    const stored = (await persistence.readEffects({ status: "confirmed" })).find(e => e.id === "e1");
    expect(stored).toBeDefined();
    expect(getSchemaVersion(stored)).toBe(engine.schemaVersion);
  });

  it("preserves existing context fields (actor, __irr) when tagging", async () => {
    const { engine, persistence } = mkEngine();
    await engine.submit({
      id: "e2",
      intent_id: "create_foo",
      alpha: "add",
      target: "Foo",
      context: {
        id: "f2",
        name: "with-irr",
        actor: "user-7",
        __irr: { point: "high", at: "2026-04-01" },
      },
      created_at: 1000,
    });

    const stored = (await persistence.readEffects({ status: "confirmed" })).find(e => e.id === "e2");
    expect(stored.context.actor).toBe("user-7");
    expect(stored.context.__irr.point).toBe("high");
    expect(stored.context.schemaVersion).toBe(engine.schemaVersion);
  });

  it("tags rejected effects too (audit trail keeps version on every persisted effect)", async () => {
    const { engine, persistence } = mkEngine();
    // replace без существующей сущности → rejected с reason existence
    await engine.submit({
      id: "e3",
      intent_id: "update_foo",
      alpha: "replace",
      target: "Foo",
      context: { id: "missing", name: "x" },
      created_at: 1000,
    });

    const stored = (await persistence.readEffects({ status: "rejected" })).find(e => e.id === "e3");
    expect(stored).toBeDefined();
    expect(getSchemaVersion(stored)).toBe(engine.schemaVersion);
  });

  it("handles JSON-string context (host-style PG JSONB serialization)", async () => {
    const { engine, persistence } = mkEngine();
    const ctxObj = { id: "f4", name: "stringified", actor: "u" };
    await engine.submit({
      id: "e4",
      intent_id: "create_foo",
      alpha: "add",
      target: "Foo",
      context: JSON.stringify(ctxObj),
      created_at: 1000,
    });

    const stored = (await persistence.readEffects({ status: "confirmed" })).find(e => e.id === "e4");
    expect(stored).toBeDefined();
    expect(typeof stored.context).toBe("string");
    const parsed = JSON.parse(stored.context);
    expect(parsed.schemaVersion).toBe(engine.schemaVersion);
    expect(parsed.id).toBe("f4");
    expect(parsed.actor).toBe("u");
  });

  it("tags batch sub-effects with the same schemaVersion as parent", async () => {
    const { engine, persistence } = mkEngine();
    await engine.submit({
      id: "e5",
      intent_id: "batch_foo",
      alpha: "batch",
      target: "Foo",
      value: [
        { id: "e5a", alpha: "add", target: "Foo", context: { id: "f5a", name: "a" } },
        { id: "e5b", alpha: "add", target: "Foo", context: { id: "f5b", name: "b" } },
      ],
      context: {},
      created_at: 1000,
    });

    const stored = (await persistence.readEffects({ status: "confirmed" })).find(e => e.id === "e5");
    expect(stored).toBeDefined();
    expect(getSchemaVersion(stored)).toBe(engine.schemaVersion);
    expect(Array.isArray(stored.value)).toBe(true);
    for (const sub of stored.value) {
      expect(getSchemaVersion(sub)).toBe(engine.schemaVersion);
    }
  });

  it("does not mutate the input effect", async () => {
    const { engine } = mkEngine();
    const input = {
      id: "e6",
      intent_id: "create_foo",
      alpha: "add",
      target: "Foo",
      context: { id: "f6", name: "hi" },
      created_at: 1000,
    };
    const snapshot = JSON.stringify(input);
    await engine.submit(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("legacy effects (no schemaVersion) read from persistence return UNKNOWN", async () => {
    // Симулируем legacy Φ: вручную appendEffect без тегирования.
    const persistence = createInMemoryPersistence();
    await persistence.appendEffect({
      id: "legacy-1",
      intent_id: "create_foo",
      alpha: "add",
      target: "Foo",
      context: { id: "f-legacy", name: "old" },
      status: "confirmed",
      created_at: 100,
    });

    const stored = (await persistence.readEffects({ status: "confirmed" }))[0];
    expect(getSchemaVersion(stored)).toBe(UNKNOWN_SCHEMA_VERSION);
  });
});
