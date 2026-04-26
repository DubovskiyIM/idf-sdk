import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  applyEffect,
  getCollectionType,
  createSnapshot,
  foldFromSnapshot,
} from "./snapshot.js";
import { fold } from "./fold.js";

describe("applyEffect (extracted helper)", () => {
  it("add — создаёт сущность в коллекции", () => {
    const collections = {};
    const ef = {
      id: "e1",
      target: "user",
      alpha: "add",
      context: { id: "u1", name: "Alice" },
    };
    applyEffect(ef, collections, {});
    expect(collections.user).toEqual({ u1: { id: "u1", name: "Alice" } });
  });

  it("replace — обновляет поле существующей сущности", () => {
    const collections = { user: { u1: { id: "u1", name: "Alice" } } };
    const ef = {
      id: "e2",
      target: "user.name",
      alpha: "replace",
      context: { id: "u1" },
      value: "Bob",
    };
    applyEffect(ef, collections, {});
    expect(collections.user.u1.name).toBe("Bob");
  });

  it("replace — upsert если сущности нет (partial entity из {id, field})", () => {
    const collections = {};
    const ef = {
      id: "e2",
      target: "user.name",
      alpha: "replace",
      context: { id: "u1" },
      value: "Bob",
    };
    applyEffect(ef, collections, {});
    expect(collections.user.u1).toEqual({ id: "u1", name: "Bob" });
  });

  it("remove — удаляет сущность", () => {
    const collections = { user: { u1: { id: "u1" } } };
    const ef = {
      id: "e3",
      target: "user",
      alpha: "remove",
      context: { id: "u1" },
    };
    applyEffect(ef, collections, {});
    expect(collections.user.u1).toBeUndefined();
  });

  it("scope=presentation — игнорируется (не мутирует)", () => {
    const collections = { user: { u1: { id: "u1", name: "A" } } };
    const ef = {
      id: "e4",
      target: "user.name",
      alpha: "replace",
      scope: "presentation",
      context: { id: "u1" },
      value: "B",
    };
    applyEffect(ef, collections, {});
    expect(collections.user.u1.name).toBe("A");
  });

  it("target=drafts — игнорируется (черновики обрабатываются отдельно)", () => {
    const collections = {};
    const ef = {
      id: "e5",
      target: "drafts",
      alpha: "add",
      context: { id: "d1" },
    };
    applyEffect(ef, collections, {});
    expect(collections).toEqual({});
  });

  it("batch — разворачивает массив под-эффектов", () => {
    const collections = {};
    const ef = {
      id: "ebatch",
      target: "user",
      alpha: "batch",
      value: [
        { id: "s1", target: "user", alpha: "add", context: { id: "u1", name: "A" } },
        { id: "s2", target: "user", alpha: "add", context: { id: "u2", name: "B" } },
      ],
    };
    applyEffect(ef, collections, {});
    expect(Object.keys(collections.user)).toEqual(["u1", "u2"]);
  });

  it("getCollectionType использует typeMap для plural", () => {
    expect(getCollectionType("user", { user: "users" })).toBe("users");
    expect(getCollectionType("user.name", { user: "users" })).toBe("users");
    expect(getCollectionType("widget", {})).toBe("widget");
  });
});

const mkAdd = (i, parent_id = null) => ({
  id: `e${i}`,
  parent_id,
  target: "user",
  alpha: "add",
  status: "confirmed",
  context: { id: `u${i}`, name: `User${i}` },
  created_at: i * 100,
});

const mkReplace = (i, entityIdx, value, parent_id = null) => ({
  id: `r${i}`,
  parent_id,
  target: "user.name",
  alpha: "replace",
  status: "confirmed",
  context: { id: `u${entityIdx}` },
  value,
  created_at: i * 100,
});

describe("createSnapshot", () => {
  it("пустой effects → пустой world и нулевые метаданные", () => {
    const snap = createSnapshot([]);
    expect(snap.world).toEqual({});
    expect(snap.count).toBe(0);
    expect(snap.lastEffectId).toBeNull();
    expect(snap.lastCreatedAt).toBe(0);
    expect(snap.typeMap).toEqual({});
  });

  it("non-empty effects → snapshot.world ≡ fold(effects)", () => {
    const effects = [mkAdd(1), mkReplace(2, 1, "Bob")];
    const snap = createSnapshot(effects);
    expect(snap.world).toEqual(fold(effects));
    expect(snap.count).toBe(2);
    expect(snap.lastEffectId).toBe("r2");
  });

  it("сохраняет typeMap для последующего foldFromSnapshot", () => {
    const typeMap = { user: "users" };
    const snap = createSnapshot([mkAdd(1)], typeMap);
    expect(snap.typeMap).toEqual(typeMap);
    expect(snap.world.users).toBeDefined();
    expect(snap.world.user).toBeUndefined();
  });

  it("count и last* отражают реально применённый порядок (после causalSort)", () => {
    const parent = mkAdd(1);
    const child = mkReplace(2, 1, "Bob", "e1");
    const snap = createSnapshot([child, parent]); // shuffled input
    expect(snap.count).toBe(2);
    // Последний в causal-order — child (parent → child через parent_id)
    expect(snap.lastEffectId).toBe("r2");
  });
});

describe("foldFromSnapshot", () => {
  it("пустой snapshot + delta ≡ fold(delta)", () => {
    const empty = createSnapshot([]);
    const delta = [mkAdd(1)];
    expect(foldFromSnapshot(empty, delta)).toEqual(fold(delta));
  });

  it("snapshot префикса + delta ≡ fold(всего)", () => {
    const all = [mkAdd(1), mkReplace(2, 1, "Bob"), mkAdd(3)];
    const snap = createSnapshot(all.slice(0, 2));
    const delta = all.slice(2);
    expect(foldFromSnapshot(snap, delta)).toEqual(fold(all));
  });

  it("не мутирует snapshot.world между вызовами", () => {
    const snap = createSnapshot([mkAdd(1)]);
    const before = JSON.parse(JSON.stringify(snap.world));
    foldFromSnapshot(snap, [mkReplace(2, 1, "Bob")]);
    foldFromSnapshot(snap, [mkAdd(3)]);
    foldFromSnapshot(snap, [mkAdd(4)]);
    expect(snap.world).toEqual(before);
  });

  it("использует typeMap из snapshot, если не передан явно", () => {
    const typeMap = { user: "users" };
    const snap = createSnapshot([mkAdd(1)], typeMap);
    const world = foldFromSnapshot(snap, [mkAdd(2)]);
    expect(world.users).toHaveLength(2);
    expect(world.user).toBeUndefined();
  });

  it("delta с parent_id, ссылающимся на effect в snapshot — child применяется поверх", () => {
    const parentEf = mkAdd(1);
    const childEf = mkReplace(2, 1, "Bob", "e1");
    const snap = createSnapshot([parentEf]);
    const world = foldFromSnapshot(snap, [childEf]);
    expect(world.user[0].name).toBe("Bob");
  });

  it("delta с remove — корректно удаляет сущность из snapshot.world", () => {
    const snap = createSnapshot([mkAdd(1), mkAdd(2)]);
    const removeEf = {
      id: "rm1",
      parent_id: null,
      target: "user",
      alpha: "remove",
      status: "confirmed",
      context: { id: "u1" },
      created_at: 1000,
    };
    const world = foldFromSnapshot(snap, [removeEf]);
    expect(world.user).toHaveLength(1);
    expect(world.user[0].id).toBe("u2");
  });
});

// Сравнение worlds по содержимому без учёта порядка в массивах сущностей.
// fold/foldFromSnapshot могут возвращать сущности в разном порядке —
// важна только идентичность набора и состояния каждой.
function expectSameWorld(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const arrA = a[k] || [];
    const arrB = b[k] || [];
    expect(arrA.length).toBe(arrB.length);
    const byIdA = Object.fromEntries(arrA.map(e => [e.id, e]));
    const byIdB = Object.fromEntries(arrB.map(e => [e.id, e]));
    expect(byIdA).toEqual(byIdB);
  }
}

describe("foldFromSnapshot — ассоциативность (property test)", () => {
  it("для любого split k: foldFromSnapshot(snap_k, delta) ≡ fold(all)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 30 }).chain(n =>
          fc.tuple(
            fc.constant(n),
            fc.integer({ min: 0, max: n })
          )
        ),
        ([n, k]) => {
          const all = Array.from({ length: n }, (_, i) => mkAdd(i));
          const prefix = all.slice(0, k);
          const delta = all.slice(k);
          const snap = createSnapshot(prefix);
          expectSameWorld(foldFromSnapshot(snap, delta), fold(all));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("ассоциативность для add+replace (последний replace выигрывает)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 15 }),
        fc.integer({ min: 0, max: 15 }),
        (n, kRaw) => {
          const k = Math.min(kRaw, n);
          const baseAdd = mkAdd(0);
          const replaces = Array.from({ length: n }, (_, i) =>
            mkReplace(i + 1, 0, `name${i}`)
          );
          const all = [baseAdd, ...replaces];
          const prefix = all.slice(0, k + 1);
          const delta = all.slice(k + 1);
          const snap = createSnapshot(prefix);
          expectSameWorld(foldFromSnapshot(snap, delta), fold(all));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("ассоциативность для add + remove", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 20 }),
        fc.integer({ min: 1, max: 20 }),
        (n, kRaw) => {
          const k = Math.min(kRaw, n);
          const adds = Array.from({ length: n }, (_, i) => mkAdd(i));
          // remove первой половины
          const removes = adds.slice(0, Math.floor(n / 2)).map((ef, i) => ({
            id: `rm${i}`,
            parent_id: null,
            target: "user",
            alpha: "remove",
            status: "confirmed",
            context: { id: ef.context.id },
            created_at: (n + i) * 100,
          }));
          const all = [...adds, ...removes];
          const prefix = all.slice(0, k);
          const delta = all.slice(k);
          const snap = createSnapshot(prefix);
          expectSameWorld(foldFromSnapshot(snap, delta), fold(all));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("snapshot не мутируется при многократном foldFromSnapshot (10 раз)", () => {
    const initial = [mkAdd(0)];
    const snap = createSnapshot(initial);
    const snapBefore = JSON.parse(JSON.stringify(snap));

    for (let i = 1; i <= 10; i++) {
      foldFromSnapshot(snap, [mkAdd(i)]);
    }

    expect(snap).toEqual(snapBefore);
  });
});

describe("fold(effects, typeMap, options) — third arg backward-compat", () => {
  it("без options — поведение как было (1 arg)", () => {
    const effects = [mkAdd(1), mkAdd(2)];
    const world = fold(effects);
    expect(world.user).toHaveLength(2);
  });

  it("с typeMap (2 arg) — поведение как было", () => {
    const world = fold([mkAdd(1)], { user: "users" });
    expect(world.users).toHaveLength(1);
    expect(world.user).toBeUndefined();
  });

  it("с options.snapshot (3 arg) — резолвит через foldFromSnapshot", () => {
    const prefix = [mkAdd(1), mkAdd(2)];
    const delta = [mkAdd(3)];
    const snap = createSnapshot(prefix);
    expect(fold(delta, {}, { snapshot: snap })).toEqual(
      foldFromSnapshot(snap, delta)
    );
  });

  it("options.snapshot — typeMap передан явно — имеет приоритет над snapshot.typeMap", () => {
    const typeMap = { user: "users" };
    const snap = createSnapshot([mkAdd(1)], typeMap);
    // Явный typeMap (тот же) — пользователь подтверждает плюрализацию
    const world = fold([mkAdd(2)], typeMap, { snapshot: snap });
    expect(world.users).toHaveLength(2);
  });

  it("options.snapshot — typeMap не передан (undefined) — fallback на snapshot.typeMap", () => {
    const typeMap = { user: "users" };
    const snap = createSnapshot([mkAdd(1)], typeMap);
    // typeMap = undefined → foldFromSnapshot fallback'ает на snapshot.typeMap
    const world = fold([mkAdd(2)], undefined, { snapshot: snap });
    expect(world.users).toHaveLength(2);
  });
});
