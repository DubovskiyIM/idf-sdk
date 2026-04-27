import { describe, it, expect, vi } from "vitest";
import {
  applyRename,
  applySplitDiscriminator,
  applySetDefault,
  applyEnumMap,
  applyDeclarativeUpcaster,
  applyUpcaster,
  pathFromTo,
  upcastEffect,
  upcastEffects,
  foldWithUpcast,
} from "./upcasters.js";
import {
  addEvolutionEntry,
  createEvolutionEntry,
} from "./evolutionLog.js";
import { tagWithSchemaVersion, UNKNOWN_SCHEMA_VERSION } from "./schemaVersion.js";

// ─── Declarative steps ───────────────────────────────────────────────────────

describe("applyRename", () => {
  it("renames context field for matching entity", () => {
    const e = { id: "e1", alpha: "add", target: "Task", context: { id: "t1", title: "Old" } };
    const out = applyRename(e, [{ entity: "Task", from: "title", to: "name" }]);
    expect(out.context.name).toBe("Old");
    expect(out.context).not.toHaveProperty("title");
  });

  it("rewrites target Task.field for field-level replace", () => {
    const e = { id: "e1", alpha: "replace", target: "Task.title", context: { id: "t1" }, value: "New" };
    const out = applyRename(e, [{ entity: "Task", from: "title", to: "name" }]);
    expect(out.target).toBe("Task.name");
  });

  it("does not affect other entities", () => {
    const e = { id: "e1", alpha: "add", target: "Project", context: { title: "Hi" } };
    const out = applyRename(e, [{ entity: "Task", from: "title", to: "name" }]);
    expect(out).toBe(e);
  });

  it("does not mutate input", () => {
    const e = { id: "e1", alpha: "add", target: "Task", context: { title: "x" } };
    const before = JSON.stringify(e);
    applyRename(e, [{ entity: "Task", from: "title", to: "name" }]);
    expect(JSON.stringify(e)).toBe(before);
  });

  it("noop for empty steps", () => {
    const e = { id: "e1", alpha: "add", target: "Task", context: {} };
    expect(applyRename(e, [])).toBe(e);
    expect(applyRename(e, undefined)).toBe(e);
  });

  it("noop when field already absent", () => {
    const e = { id: "e1", alpha: "add", target: "Task", context: { id: "t1" } };
    const out = applyRename(e, [{ entity: "Task", from: "title", to: "name" }]);
    expect(out).toBe(e);
  });
});

describe("applySplitDiscriminator", () => {
  it("rewrites target when discriminator matches mapping", () => {
    const e = { id: "e1", alpha: "add", target: "Task", context: { id: "t1", kind: "child" } };
    const out = applySplitDiscriminator(e, [{ from: "Task", field: "kind", mapping: { child: "Subtask" } }]);
    expect(out.target).toBe("Subtask");
    expect(out.context.__derivedFrom).toBe("e1");
  });

  it("preserves field-path in target", () => {
    const e = { id: "e1", alpha: "replace", target: "Task.title", context: { id: "t1", kind: "child" }, value: "X" };
    const out = applySplitDiscriminator(e, [{ from: "Task", field: "kind", mapping: { child: "Subtask" } }]);
    expect(out.target).toBe("Subtask.title");
  });

  it("does not duplicate __derivedFrom if already set", () => {
    const e = { id: "e1", alpha: "add", target: "Task", context: { id: "t1", kind: "child", __derivedFrom: "preexist" } };
    const out = applySplitDiscriminator(e, [{ from: "Task", field: "kind", mapping: { child: "Subtask" } }]);
    expect(out.context.__derivedFrom).toBe("preexist");
  });

  it("noop when discriminator value not in mapping", () => {
    const e = { id: "e1", alpha: "add", target: "Task", context: { id: "t1", kind: "regular" } };
    const out = applySplitDiscriminator(e, [{ from: "Task", field: "kind", mapping: { child: "Subtask" } }]);
    expect(out).toBe(e);
  });

  it("noop when from-entity does not match", () => {
    const e = { id: "e1", alpha: "add", target: "Project", context: { kind: "child" } };
    const out = applySplitDiscriminator(e, [{ from: "Task", field: "kind", mapping: { child: "Subtask" } }]);
    expect(out).toBe(e);
  });

  it("does not mutate input", () => {
    const e = { id: "e1", alpha: "add", target: "Task", context: { kind: "child" } };
    const before = JSON.stringify(e);
    applySplitDiscriminator(e, [{ from: "Task", field: "kind", mapping: { child: "Subtask" } }]);
    expect(JSON.stringify(e)).toBe(before);
  });
});

describe("applySetDefault", () => {
  it("fills missing field on add effect", () => {
    const e = { id: "e1", alpha: "add", target: "Task", context: { id: "t1", title: "x" } };
    const out = applySetDefault(e, [{ entity: "Task", field: "priority", value: "low" }]);
    expect(out.context.priority).toBe("low");
  });

  it("does not overwrite existing field", () => {
    const e = { id: "e1", alpha: "add", target: "Task", context: { id: "t1", priority: "high" } };
    const out = applySetDefault(e, [{ entity: "Task", field: "priority", value: "low" }]);
    expect(out.context.priority).toBe("high");
  });

  it("only applies to add — not replace/remove (partial-merge semantics)", () => {
    const eReplace = { id: "e1", alpha: "replace", target: "Task", context: { id: "t1" } };
    const eRemove = { id: "e2", alpha: "remove", target: "Task", context: { id: "t1" } };
    expect(applySetDefault(eReplace, [{ entity: "Task", field: "priority", value: "low" }])).toBe(eReplace);
    expect(applySetDefault(eRemove, [{ entity: "Task", field: "priority", value: "low" }])).toBe(eRemove);
  });

  it("noop for entity mismatch", () => {
    const e = { id: "e1", alpha: "add", target: "Other", context: {} };
    expect(applySetDefault(e, [{ entity: "Task", field: "priority", value: "low" }])).toBe(e);
  });

  it("supports nullish defaults", () => {
    const e = { id: "e1", alpha: "add", target: "Task", context: {} };
    const out = applySetDefault(e, [{ entity: "Task", field: "ref", value: null }]);
    expect(out.context.ref).toBeNull();
    expect("ref" in out.context).toBe(true);
  });
});

describe("applyEnumMap", () => {
  it("maps context[field] for add", () => {
    const e = { id: "e1", alpha: "add", target: "Task", context: { id: "t1", status: "open" } };
    const out = applyEnumMap(e, [{ entity: "Task", field: "status", mapping: { open: "active" } }]);
    expect(out.context.status).toBe("active");
  });

  it("maps context[field] for replace whole-entity", () => {
    const e = { id: "e1", alpha: "replace", target: "Task", context: { id: "t1", status: "open" } };
    const out = applyEnumMap(e, [{ entity: "Task", field: "status", mapping: { open: "active" } }]);
    expect(out.context.status).toBe("active");
  });

  it("maps value for replace Task.field", () => {
    const e = { id: "e1", alpha: "replace", target: "Task.status", context: { id: "t1" }, value: "open" };
    const out = applyEnumMap(e, [{ entity: "Task", field: "status", mapping: { open: "active" } }]);
    expect(out.value).toBe("active");
  });

  it("leaves unknown enum values unchanged (reader gap policy decides)", () => {
    const e = { id: "e1", alpha: "add", target: "Task", context: { status: "weird" } };
    const out = applyEnumMap(e, [{ entity: "Task", field: "status", mapping: { open: "active" } }]);
    expect(out.context.status).toBe("weird");
  });

  it("noop for entity mismatch", () => {
    const e = { id: "e1", alpha: "add", target: "Other", context: { status: "open" } };
    expect(applyEnumMap(e, [{ entity: "Task", field: "status", mapping: { open: "active" } }])).toBe(e);
  });
});

// ─── applyDeclarativeUpcaster — composition order ────────────────────────────

describe("applyDeclarativeUpcaster — fixed order", () => {
  it("applies rename → splitDiscriminator → setDefault → enumMap", () => {
    // Сценарий: эффект с старым именем поля title (теперь name), kind=child переезжает
    // в Subtask, должен получить default priority=low, и старый status=open → active.
    const e = {
      id: "e1",
      alpha: "add",
      target: "Task",
      context: { id: "t1", title: "T", kind: "child", status: "open" },
    };
    const decl = {
      rename: [{ entity: "Task", from: "title", to: "name" }],
      splitDiscriminator: [{ from: "Task", field: "kind", mapping: { child: "Subtask" } }],
      setDefault: [{ entity: "Subtask", field: "priority", value: "low" }],
      enumMap: [{ entity: "Subtask", field: "status", mapping: { open: "active" } }],
    };
    const out = applyDeclarativeUpcaster(e, decl);
    expect(out.target).toBe("Subtask");
    expect(out.context.name).toBe("T");
    expect(out.context).not.toHaveProperty("title");
    expect(out.context.priority).toBe("low");
    expect(out.context.status).toBe("active");
    expect(out.context.__derivedFrom).toBe("e1");
  });

  it("noop when declarative is null/undefined/empty", () => {
    const e = { id: "e1", alpha: "add", target: "Task", context: {} };
    expect(applyDeclarativeUpcaster(e, null)).toBe(e);
    expect(applyDeclarativeUpcaster(e, undefined)).toBe(e);
    expect(applyDeclarativeUpcaster(e, {})).toBe(e);
  });
});

// ─── applyUpcaster — declarative + functional ────────────────────────────────

describe("applyUpcaster", () => {
  it("applies declarative then fn", () => {
    const e = { id: "e1", alpha: "add", target: "Task", context: { id: "t1" } };
    const upcaster = {
      fromHash: "h1",
      toHash: "h2",
      declarative: { setDefault: [{ entity: "Task", field: "priority", value: "low" }] },
      fn: (effect) => ({ ...effect, context: { ...effect.context, fnTouched: true } }),
    };
    const out = applyUpcaster(e, upcaster);
    expect(out.context.priority).toBe("low");
    expect(out.context.fnTouched).toBe(true);
  });

  it("returns null when fn returns null (drop)", () => {
    const e = { id: "e1", alpha: "add", target: "Task", context: {} };
    const upcaster = { fn: () => null };
    expect(applyUpcaster(e, upcaster)).toBeNull();
  });

  it("returns Effect[] when fn returns array (split)", () => {
    const e = { id: "e1", alpha: "add", target: "Task", context: { id: "t1" } };
    const upcaster = {
      fn: (effect) => [
        effect,
        { ...effect, id: "e1-derived", target: "Subtask", context: { id: "t1-sub", __derivedFrom: "e1" } },
      ],
    };
    const out = applyUpcaster(e, upcaster);
    expect(Array.isArray(out)).toBe(true);
    expect(out).toHaveLength(2);
  });

  it("falls back to declarative result when fn throws", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const e = { id: "e1", alpha: "add", target: "Task", context: { id: "t1" } };
    const upcaster = {
      declarative: { setDefault: [{ entity: "Task", field: "priority", value: "low" }] },
      fn: () => { throw new Error("boom"); },
    };
    const out = applyUpcaster(e, upcaster);
    expect(out.context.priority).toBe("low");
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("noop for null/invalid upcaster", () => {
    const e = { id: "e1", alpha: "add", target: "Task", context: {} };
    expect(applyUpcaster(e, null)).toBe(e);
    expect(applyUpcaster(e, undefined)).toBe(e);
  });

  it("filters falsy values from fn array result", () => {
    const e = { id: "e1", alpha: "add", target: "Task", context: {} };
    const upcaster = { fn: () => [e, null, undefined, false] };
    const out = applyUpcaster(e, upcaster);
    expect(out).toHaveLength(1);
  });
});

// ─── pathFromTo — chain resolution ───────────────────────────────────────────

describe("pathFromTo", () => {
  function build3StepOntology() {
    let ont = {};
    ont = addEvolutionEntry(ont, createEvolutionEntry({
      hash: "h1", parentHash: null, authorId: "a",
    }));
    ont = addEvolutionEntry(ont, createEvolutionEntry({
      hash: "h2", parentHash: "h1", authorId: "a",
      upcasters: [{ fromHash: "h1", toHash: "h2", declarative: { rename: [{ entity: "Task", from: "title", to: "name" }] } }],
    }));
    ont = addEvolutionEntry(ont, createEvolutionEntry({
      hash: "h3", parentHash: "h2", authorId: "a",
      upcasters: [{ fromHash: "h2", toHash: "h3", declarative: { setDefault: [{ entity: "Task", field: "priority", value: "low" }] } }],
    }));
    return ont;
  }

  it("returns [] when fromHash === toHash", () => {
    const ont = build3StepOntology();
    expect(pathFromTo("h2", "h2", ont)).toEqual([]);
  });

  it("returns full chain from UNKNOWN to current", () => {
    const ont = build3StepOntology();
    const path = pathFromTo(UNKNOWN_SCHEMA_VERSION, "h3", ont);
    expect(path).toHaveLength(2);
    expect(path[0].toHash).toBe("h2");
    expect(path[1].toHash).toBe("h3");
  });

  it("returns subset h1 → h3 (skip already-applied)", () => {
    const ont = build3StepOntology();
    const path = pathFromTo("h1", "h3", ont);
    expect(path).toHaveLength(2);
  });

  it("returns subset h2 → h3", () => {
    const ont = build3StepOntology();
    const path = pathFromTo("h2", "h3", ont);
    expect(path).toHaveLength(1);
    expect(path[0].toHash).toBe("h3");
  });

  it("returns [] when fromHash not in target ancestry", () => {
    const ont = build3StepOntology();
    expect(pathFromTo("ghost", "h3", ont)).toEqual([]);
  });

  it("returns [] for empty ontology", () => {
    expect(pathFromTo("h1", "h2", {})).toEqual([]);
  });
});

// ─── upcastEffect / upcastEffects ────────────────────────────────────────────

describe("upcastEffect / upcastEffects", () => {
  function buildOntology() {
    let ont = {};
    ont = addEvolutionEntry(ont, createEvolutionEntry({ hash: "h1", parentHash: null, authorId: "a" }));
    ont = addEvolutionEntry(ont, createEvolutionEntry({
      hash: "h2", parentHash: "h1", authorId: "a",
      upcasters: [{
        fromHash: "h1", toHash: "h2",
        declarative: { rename: [{ entity: "Task", from: "title", to: "name" }] },
      }],
    }));
    return ont;
  }

  it("upcasts legacy (UNKNOWN) effect through the chain", () => {
    const ont = buildOntology();
    const e = { id: "e1", alpha: "add", target: "Task", context: { id: "t1", title: "Old" } };
    const out = upcastEffect(e, "h2", ont);
    expect(out).toHaveLength(1);
    expect(out[0].context.name).toBe("Old");
    expect(out[0].context).not.toHaveProperty("title");
  });

  it("noop when effect schemaVersion === target", () => {
    const ont = buildOntology();
    const e = tagWithSchemaVersion(
      { id: "e1", alpha: "add", target: "Task", context: { id: "t1", title: "Old" } },
      "h2",
    );
    const out = upcastEffect(e, "h2", ont);
    expect(out).toEqual([e]);
  });

  it("supports drop via fn=null", () => {
    let ont = {};
    ont = addEvolutionEntry(ont, createEvolutionEntry({ hash: "h1", parentHash: null, authorId: "a" }));
    ont = addEvolutionEntry(ont, createEvolutionEntry({
      hash: "h2", parentHash: "h1", authorId: "a",
      upcasters: [{ fromHash: "h1", toHash: "h2", fn: () => null }],
    }));
    const e = { id: "e1", alpha: "add", target: "Task", context: {} };
    expect(upcastEffect(e, "h2", ont)).toEqual([]);
  });

  it("supports split via fn=Effect[]", () => {
    let ont = {};
    ont = addEvolutionEntry(ont, createEvolutionEntry({ hash: "h1", parentHash: null, authorId: "a" }));
    ont = addEvolutionEntry(ont, createEvolutionEntry({
      hash: "h2", parentHash: "h1", authorId: "a",
      upcasters: [{
        fromHash: "h1", toHash: "h2",
        fn: (e) => [e, { ...e, id: e.id + "-extra", context: { ...e.context, kind: "extra" } }],
      }],
    }));
    const e = { id: "e1", alpha: "add", target: "Task", context: { id: "t1" } };
    const out = upcastEffect(e, "h2", ont);
    expect(out).toHaveLength(2);
    expect(out[1].id).toBe("e1-extra");
  });

  it("upcastEffects flattens batch results", () => {
    let ont = {};
    ont = addEvolutionEntry(ont, createEvolutionEntry({ hash: "h1", parentHash: null, authorId: "a" }));
    ont = addEvolutionEntry(ont, createEvolutionEntry({
      hash: "h2", parentHash: "h1", authorId: "a",
      upcasters: [{
        fromHash: "h1", toHash: "h2",
        declarative: { setDefault: [{ entity: "Task", field: "priority", value: "low" }] },
      }],
    }));
    const effects = [
      { id: "e1", alpha: "add", target: "Task", context: { id: "t1" } },
      { id: "e2", alpha: "add", target: "Task", context: { id: "t2", priority: "high" } },
    ];
    const out = upcastEffects(effects, ont);
    expect(out).toHaveLength(2);
    expect(out[0].context.priority).toBe("low");
    expect(out[1].context.priority).toBe("high");
  });

  it("upcastEffects noop when no evolution log", () => {
    const effects = [{ id: "e1", alpha: "add", target: "Task", context: {} }];
    const out = upcastEffects(effects, { entities: {} });
    expect(out).toEqual(effects);
    expect(out).not.toBe(effects);
  });
});

// ─── foldWithUpcast — full integration ───────────────────────────────────────

describe("foldWithUpcast", () => {
  it("falls back to plain fold when ontology has no evolution log", () => {
    const effects = [
      { id: "e1", alpha: "add", target: "Task", context: { id: "t1", title: "Hello" }, status: "confirmed", created_at: 1 },
    ];
    const world = foldWithUpcast(effects, { entities: { Task: {} } });
    expect(world.Task).toHaveLength(1);
    expect(world.Task[0].title).toBe("Hello");
  });

  it("upcasts legacy effects then folds", () => {
    let ont = { entities: { Task: {} } };
    ont = addEvolutionEntry(ont, createEvolutionEntry({ hash: "h1", parentHash: null, authorId: "a" }));
    ont = addEvolutionEntry(ont, createEvolutionEntry({
      hash: "h2", parentHash: "h1", authorId: "a",
      upcasters: [{
        fromHash: "h1", toHash: "h2",
        declarative: {
          rename: [{ entity: "Task", from: "title", to: "name" }],
          setDefault: [{ entity: "Task", field: "priority", value: "low" }],
        },
      }],
    }));

    const legacy = { id: "e1", alpha: "add", target: "Task", context: { id: "t1", title: "Old" }, status: "confirmed", created_at: 1 };
    const fresh = tagWithSchemaVersion(
      { id: "e2", alpha: "add", target: "Task", context: { id: "t2", name: "New", priority: "high" }, status: "confirmed", created_at: 2 },
      "h2",
    );

    const world = foldWithUpcast([legacy, fresh], ont);
    expect(world.Task).toHaveLength(2);
    const t1 = world.Task.find(t => t.id === "t1");
    const t2 = world.Task.find(t => t.id === "t2");
    expect(t1.name).toBe("Old");
    expect(t1.priority).toBe("low");
    expect(t1).not.toHaveProperty("title");
    expect(t2.name).toBe("New");
    expect(t2.priority).toBe("high");
  });

  it("supports split: legacy Task with kind:'child' becomes Subtask collection", () => {
    let ont = { entities: { Task: {}, Subtask: {} } };
    ont = addEvolutionEntry(ont, createEvolutionEntry({ hash: "h1", parentHash: null, authorId: "a" }));
    ont = addEvolutionEntry(ont, createEvolutionEntry({
      hash: "h2", parentHash: "h1", authorId: "a",
      upcasters: [{
        fromHash: "h1", toHash: "h2",
        declarative: {
          splitDiscriminator: [{ from: "Task", field: "kind", mapping: { child: "Subtask" } }],
        },
      }],
    }));

    const effects = [
      { id: "e1", alpha: "add", target: "Task", context: { id: "t1", kind: "regular", name: "Top" }, status: "confirmed", created_at: 1 },
      { id: "e2", alpha: "add", target: "Task", context: { id: "t2", kind: "child", name: "Sub" }, status: "confirmed", created_at: 2 },
    ];
    const world = foldWithUpcast(effects, ont);
    expect(world.Task).toHaveLength(1);
    expect(world.Task[0].id).toBe("t1");
    expect(world.Subtask).toHaveLength(1);
    expect(world.Subtask[0].id).toBe("t2");
    expect(world.Subtask[0].__derivedFrom).toBe("e2");
  });

  it("respects targetHash override", () => {
    let ont = { entities: { Task: {} } };
    ont = addEvolutionEntry(ont, createEvolutionEntry({ hash: "h1", parentHash: null, authorId: "a" }));
    ont = addEvolutionEntry(ont, createEvolutionEntry({
      hash: "h2", parentHash: "h1", authorId: "a",
      upcasters: [{ fromHash: "h1", toHash: "h2", declarative: { setDefault: [{ entity: "Task", field: "priority", value: "low" }] } }],
    }));

    const effects = [{ id: "e1", alpha: "add", target: "Task", context: { id: "t1" }, status: "confirmed", created_at: 1 }];

    // targetHash = "h1" (older) → не должны применять upcast h1→h2
    const worldOld = foldWithUpcast(effects, ont, { targetHash: "h1" });
    expect(worldOld.Task[0]).not.toHaveProperty("priority");

    // targetHash = "h2" (current) → priority должен быть низким
    const worldNew = foldWithUpcast(effects, ont, { targetHash: "h2" });
    expect(worldNew.Task[0].priority).toBe("low");
  });
});
