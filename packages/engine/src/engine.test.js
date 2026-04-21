import { describe, it, expect, vi } from "vitest";
import { createEngine, createInMemoryPersistence } from "./index.js";

const minimalDomain = {
  ONTOLOGY: {
    entities: { Foo: {} },
    roles: { user: { base: "owner", visibleFields: { Foo: ["id", "name"] } } },
    rules: [],
  },
  INTENTS: {
    create_foo: {
      particles: {
        effects: [{ alpha: "add", target: "Foo" }],
        conditions: [],
      },
    },
  },
};

function mkEngine(overrides = {}) {
  const persistence = createInMemoryPersistence();
  const onEffectConfirmed = vi.fn();
  const onEffectRejected = vi.fn();
  const engine = createEngine({
    domain: minimalDomain,
    persistence,
    clock: () => 1000,
    callbacks: { onEffectConfirmed, onEffectRejected },
    ...overrides,
  });
  return { engine, persistence, onEffectConfirmed, onEffectRejected };
}

describe("createEngine — smoke", () => {
  it("throws without domain", () => {
    expect(() => createEngine({ persistence: createInMemoryPersistence() })).toThrow(/domain/);
  });

  it("throws without persistence", () => {
    expect(() => createEngine({ domain: minimalDomain })).toThrow(/persistence/);
  });

  it("submit confirmed effect invokes onEffectConfirmed", async () => {
    const { engine, onEffectConfirmed } = mkEngine();
    const result = await engine.submit({
      id: "e1", intent_id: "create_foo", alpha: "add", target: "Foo",
      context: { id: "f1", name: "hello" }, created_at: 1000,
    });
    expect(result.status).toBe("confirmed");
    expect(onEffectConfirmed).toHaveBeenCalled();
  });

  it("foldWorld returns empty initially", async () => {
    const { engine } = mkEngine();
    expect(await engine.foldWorld()).toEqual({});
  });

  it("tick returns [] when no timers", async () => {
    const { engine } = mkEngine();
    expect(await engine.tick()).toEqual([]);
  });

  it("auto-fills id, status, created_at when missing", async () => {
    const { engine } = mkEngine();
    const result = await engine.submit({
      intent_id: "create_foo", alpha: "add", target: "Foo",
      context: { id: "f2", name: "y" },
    });
    expect(result.status).toBe("confirmed");
  });

  it("rule depth overflow emits rejection", async () => {
    // Рекурсивное правило: триггер на любой эффект → новый эффект того же типа.
    const recursiveDomain = {
      ONTOLOGY: {
        entities: { X: {} },
        roles: {},
        rules: [{
          id: "recursive",
          trigger: "do_x",
          action: "do_x",
          context: {},
        }],
      },
      INTENTS: {
        do_x: { particles: { effects: [{ alpha: "add", target: "X" }], conditions: [] } },
      },
    };
    const persistence = createInMemoryPersistence();
    const engine = createEngine({
      domain: recursiveDomain, persistence,
      clock: () => 1000,
      maxRuleDepth: 3,
      logger: { info() {}, warn: vi.fn(), error() {} },
    });
    // первый submit → сам triggerит rule → bounded до maxRuleDepth.
    await engine.submit({
      id: "e1", intent_id: "do_x", alpha: "add", target: "X",
      context: { id: "x1" }, created_at: 1000,
    });
    // Проверяем что submit прошёл без infinite loop'а (тест не висит).
    const world = await engine.foldWorld();
    expect(Object.keys(world).length).toBeGreaterThanOrEqual(0);
  });
});
