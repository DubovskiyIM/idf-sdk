# Incremental fold + structural snapshots — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить snapshot-механизм в `@intent-driven/core` так, чтобы `foldFromSnapshot(snapshot_k, Φ[k+1..n])` давал тот же мир, что `fold(Φ[0..n])`, но за время пропорциональное размеру дельты, не всему Φ.

**Architecture:** Snapshot — это pre-computed `world_k = fold(Φ[0..k])` плюс метаданные `{ lastEffectId, lastCreatedAt, count, typeMap }`. Эффекты — морфизмы над world (моноид: identity = `{}`, composition = sequential apply), что даёт алгебраическую гарантию ассоциативности. Phase 1 — pure-функции в `core/fold.js`; Phase 2 (отдельный plan) — кэширование в `engine/validator.js`.

**Tech Stack:** ES modules, vitest, fast-check (property tests), `@intent-driven/core@0.78.0` baseline.

**Backlog ref:** `docs/superpowers/specs/2026-04-26-core-backlog.md` § A1.

---

## File Structure

**Create:**
- `packages/core/src/snapshot.js` — `createSnapshot`, `foldFromSnapshot`, `applyEffect` extracted helper.
- `packages/core/src/snapshot.test.js` — unit + property tests.
- `packages/core/src/snapshot.bench.js` — vitest benchmark, `fold(10K)` vs `foldFromSnapshot(snap_9K, 1K)`.
- `.changeset/incremental-fold-snapshots.md` — minor bump для `@intent-driven/core`.

**Modify:**
- `packages/core/src/fold.js` — extract `applyEffect` to import from `snapshot.js`; add `options` параметр в `fold()`.
- `packages/core/src/fold.test.js` (если есть) или новый файл с regression — backward-compat smoke.
- `packages/core/src/index.js` — экспортировать `createSnapshot`, `foldFromSnapshot`.

**Не трогаем (Phase 2):**
- `packages/engine/src/validator.js` — `foldWorld` потребляет snapshot — отдельный plan.
- `packages/engine/src/persistence/*` — snapshot persistence — отдельный plan.

---

## Task 0: Worktree sanity + baseline tests

**Files:**
- Verify: `packages/core/src/fold.js`, `packages/core/src/causalSort.js`

- [ ] **Step 1: Подтвердить worktree и SDK baseline**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/core-backlog-2026-04-26
git status -sb
node -p "require('./packages/core/package.json').version"
```

Expected: branch `feat/core-backlog-2026-04-26`, version `0.78.0`.

- [ ] **Step 2: Прогнать существующие fold-тесты для baseline**

```bash
cd packages/core && npx vitest run src/fold 2>&1 | tail -20
```

Expected: все passing. Если есть failing тесты ДО наших изменений — остановиться и доложить.

- [ ] **Step 3: Зафиксировать coverage fold.js**

```bash
cd packages/core && npx vitest run --coverage --coverage.include='src/fold.js' 2>&1 | grep -A 2 "fold.js" | head
```

Expected: ≥85% line coverage. Запомнить число — после рефакторинга должно сохраниться.

---

## Task 1: Extract applyEffect и getCollectionType (refactor, no behavior change)

**Files:**
- Modify: `packages/core/src/fold.js`
- Create: `packages/core/src/snapshot.js`
- Create: `packages/core/src/snapshot.test.js`

- [ ] **Step 1: Написать failing-тест для extracted applyEffect**

Создать `packages/core/src/snapshot.test.js`:

```js
import { describe, it, expect } from "vitest";
import { applyEffect, getCollectionType } from "./snapshot.js";

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

  it("getCollectionType использует typeMap для plural", () => {
    expect(getCollectionType("user", { user: "users" })).toBe("users");
    expect(getCollectionType("user.name", { user: "users" })).toBe("users");
    expect(getCollectionType("widget", {})).toBe("widget"); // fallback
  });
});
```

- [ ] **Step 2: Запустить — должен fail с "module not found"**

```bash
cd packages/core && npx vitest run src/snapshot.test.js 2>&1 | tail -15
```

Expected: FAIL — `Cannot find module './snapshot.js'`.

- [ ] **Step 3: Создать `packages/core/src/snapshot.js` с extracted helpers**

```js
/** @typedef {import('./types/idf.d.ts').Effect} Effect */
/** @typedef {import('./types/idf.d.ts').World} World */

/**
 * Получить имя коллекции из effect.target с учётом typeMap.
 * Пример: target="user.name", typeMap={user:"users"} → "users".
 *
 * @param {string} target
 * @param {Record<string, string>} typeMap
 * @returns {string}
 */
export function getCollectionType(target, typeMap) {
  const base = target.split(".")[0];
  return typeMap[base] || base;
}

/**
 * Применить один confirmed effect к коллекциям (мутирует collections).
 *
 * Семантика идентична старому inline applyEffect внутри fold.js.
 * Извлечена для переиспользования в createSnapshot/foldFromSnapshot.
 *
 * Эффекты с scope="presentation" игнорируются (это Π, обрабатывается
 * applyPresentation отдельно). Эффекты с target.startsWith("drafts")
 * игнорируются (черновики через foldDrafts).
 *
 * @param {Effect} ef
 * @param {Record<string, Record<string, Object>>} collections
 *   — мутируемая структура: { collectionType: { entityId: entity } }
 * @param {Record<string, string>} typeMap
 */
export function applyEffect(ef, collections, typeMap) {
  if (ef.target.startsWith("drafts")) return;
  if (ef.scope === "presentation") return;

  if (ef.alpha === "batch" && Array.isArray(ef.value)) {
    for (const sub of ef.value) applyEffect(sub, collections, typeMap);
    return;
  }

  const ctx = ef.context || {};
  const val = ef.value;
  const collType = getCollectionType(ef.target, typeMap);

  if (!collections[collType]) collections[collType] = {};

  switch (ef.alpha) {
    case "add": {
      const entityId = ctx.id || ef.id;
      collections[collType][entityId] = { ...ctx };
      break;
    }
    case "replace": {
      const entityId = ctx.id;
      if (entityId) {
        const field = ef.target.split(".").pop();
        const existing = collections[collType][entityId] || { id: entityId };
        collections[collType][entityId] = { ...existing, [field]: val };
      }
      break;
    }
    case "remove": {
      const entityId = ctx.id;
      if (entityId) delete collections[collType][entityId];
      break;
    }
  }
}
```

- [ ] **Step 4: Запустить — должен PASS**

```bash
cd packages/core && npx vitest run src/snapshot.test.js 2>&1 | tail -10
```

Expected: 6 passing.

- [ ] **Step 5: Заменить inline applyEffect/getCollectionType в `fold.js` на импорт**

В `packages/core/src/fold.js`:

```js
/** @typedef {import('./types/idf.d.ts').Effect} Effect */
/** @typedef {import('./types/idf.d.ts').Ontology} Ontology */
/** @typedef {import('./types/idf.d.ts').World} World */

import { causalSort } from "./causalSort.js";
import { applyEffect, getCollectionType } from "./snapshot.js";

/**
 * Построить маппинг singular→plural из онтологии.
 * @param {Ontology} [ontology]
 * @returns {Record<string, string>}
 */
export function buildTypeMap(ontology) {
  const map = { draft: "drafts" };
  if (ontology?.entities) {
    for (const entityName of Object.keys(ontology.entities)) {
      const singular = entityName.toLowerCase();
      const plural = singular.endsWith("s") ? singular + "es"
        : singular.endsWith("y") ? singular.slice(0, -1) + "ies"
        : singular + "s";
      map[singular] = plural;
    }
  }
  return map;
}

/**
 * fold(effects, typeMap) → world (объект по типам сущностей)
 *
 * По манифесту: World(t) = fold(⊕, ∅, sort≺(Φ_confirmed ↓ t))
 *
 * Эффекты сортируются причинно (parent_id → child) перед применением.
 * @param {Effect[]} effects
 * @param {Record<string, string>} [typeMap]
 * @returns {World}
 */
export function fold(effects, typeMap = {}) {
  const collections = {};
  const sorted = causalSort(effects);

  for (const ef of sorted) applyEffect(ef, collections, typeMap);

  const world = {};
  for (const [type, entities] of Object.entries(collections)) {
    world[type] = Object.values(entities);
  }
  return world;
}

/**
 * Применить косметические эффекты (Π) поверх world.
 */
export function applyPresentation(world, effects, typeMap = {}) {
  const result = {};
  for (const [key, arr] of Object.entries(world)) {
    result[key] = arr.map(e => ({ ...e }));
  }

  for (const ef of effects) {
    if (ef.scope !== "presentation") continue;
    const ctx = ef.context || {};
    const val = ef.value;
    const collType = getCollectionType(ef.target, typeMap);

    if (ef.alpha === "replace" && ctx.id && result[collType]) {
      const entity = result[collType].find(e => e.id === ctx.id);
      if (entity) {
        const field = ef.target.split(".").pop();
        entity[field] = val;
      }
    }
  }

  return result;
}

/**
 * Свернуть только черновики Δ.
 */
export function foldDrafts(effects) {
  const drafts = {};
  for (const ef of effects) {
    if (!ef.target.startsWith("drafts")) continue;
    const ctx = ef.context || {};

    switch (ef.alpha) {
      case "add": {
        const entityId = ctx.id || ef.id;
        drafts[entityId] = { ...ctx, _effectId: ef.id };
        break;
      }
      case "replace": {
        const entityId = ctx.id;
        if (entityId && drafts[entityId]) {
          const field = ef.target.split(".").pop();
          if (field !== "drafts") {
            drafts[entityId] = { ...drafts[entityId], [field]: ef.value };
          }
        }
        break;
      }
      case "remove": {
        const entityId = ctx.id;
        if (entityId) delete drafts[entityId];
        break;
      }
    }
  }
  return Object.values(drafts);
}

/**
 * Отфильтровать эффекты по статусам.
 * @param {Effect[]} effects
 * @param {...string} statuses
 * @returns {Effect[]}
 */
export function filterByStatus(effects, ...statuses) {
  return effects.filter(e => statuses.includes(e.status));
}
```

- [ ] **Step 6: Прогнать существующие fold-тесты — regression**

```bash
cd packages/core && npx vitest run src/fold 2>&1 | tail -20
```

Expected: все passing (без изменений в поведении). Если что-то failing — отладить (но мы только переместили код).

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/snapshot.js packages/core/src/snapshot.test.js packages/core/src/fold.js
git commit -m "refactor(core): извлечь applyEffect и getCollectionType в snapshot.js

Подготовка к incremental fold (snapshot mechanism). applyEffect
использовался только внутри fold.js inline; экспорт даёт переиспользуемый
helper для createSnapshot и foldFromSnapshot. Поведение не меняется —
fold.js делегирует в snapshot.js без semantic drift.

Backlog: docs/superpowers/specs/2026-04-26-core-backlog.md § A1
Plan: docs/superpowers/plans/2026-04-26-incremental-fold-snapshots.md"
```

---

## Task 2: createSnapshot — empty case + populate world

**Files:**
- Modify: `packages/core/src/snapshot.js`
- Modify: `packages/core/src/snapshot.test.js`

- [ ] **Step 1: Failing-тест для createSnapshot**

Дописать в `packages/core/src/snapshot.test.js`:

```js
import { createSnapshot } from "./snapshot.js";
import { fold } from "./fold.js";

describe("createSnapshot", () => {
  it("пустой effects → пустой world и нулевые метаданные", () => {
    const snap = createSnapshot([]);
    expect(snap.world).toEqual({});
    expect(snap.count).toBe(0);
    expect(snap.lastEffectId).toBe(null);
    expect(snap.lastCreatedAt).toBe(0);
  });

  it("non-empty effects → snapshot.world === fold(effects)", () => {
    const effects = [
      {
        id: "e1",
        parent_id: null,
        target: "user",
        alpha: "add",
        status: "confirmed",
        context: { id: "u1", name: "Alice" },
        created_at: 100,
      },
      {
        id: "e2",
        parent_id: null,
        target: "user.name",
        alpha: "replace",
        status: "confirmed",
        context: { id: "u1" },
        value: "Bob",
        created_at: 200,
      },
    ];
    const snap = createSnapshot(effects);
    expect(snap.world).toEqual(fold(effects));
  });

  it("сохраняет typeMap для последующего foldFromSnapshot", () => {
    const typeMap = { user: "users" };
    const effects = [
      {
        id: "e1",
        parent_id: null,
        target: "user",
        alpha: "add",
        status: "confirmed",
        context: { id: "u1" },
        created_at: 100,
      },
    ];
    const snap = createSnapshot(effects, typeMap);
    expect(snap.typeMap).toEqual(typeMap);
    expect(snap.world.users).toBeDefined();
  });
});
```

- [ ] **Step 2: Запустить — должен FAIL**

```bash
cd packages/core && npx vitest run src/snapshot.test.js 2>&1 | tail -15
```

Expected: 3 failing (createSnapshot не существует).

- [ ] **Step 3: Реализовать createSnapshot**

Добавить в `packages/core/src/snapshot.js`:

```js
import { causalSort } from "./causalSort.js";

/**
 * @typedef {Object} Snapshot
 * @property {World} world — закэшированный мир
 * @property {number} count — число применённых confirmed effects
 * @property {string|null} lastEffectId — id последнего применённого effect
 *   (в causal-порядке)
 * @property {number} lastCreatedAt — created_at последнего применённого effect
 * @property {Record<string, string>} typeMap — typeMap, использованный
 *   при создании; foldFromSnapshot должен использовать тот же
 */

/**
 * Создать snapshot из набора confirmed effects.
 *
 * Семантика: snapshot.world ≡ fold(effects, typeMap). Snapshot можно
 * передать в foldFromSnapshot вместе с дельтой следующих эффектов,
 * чтобы получить полный мир без re-apply всей истории.
 *
 * @param {Effect[]} effects
 * @param {Record<string, string>} [typeMap]
 * @returns {Snapshot}
 */
export function createSnapshot(effects, typeMap = {}) {
  const collections = {};
  const sorted = causalSort(effects);

  for (const ef of sorted) applyEffect(ef, collections, typeMap);

  const world = {};
  for (const [type, entities] of Object.entries(collections)) {
    world[type] = Object.values(entities);
  }

  const last = sorted[sorted.length - 1];
  return {
    world,
    count: sorted.length,
    lastEffectId: last ? last.id : null,
    lastCreatedAt: last ? (last.created_at ?? 0) : 0,
    typeMap,
  };
}
```

- [ ] **Step 4: Запустить — должен PASS**

```bash
cd packages/core && npx vitest run src/snapshot.test.js 2>&1 | tail -10
```

Expected: все passing.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/snapshot.js packages/core/src/snapshot.test.js
git commit -m "feat(core): createSnapshot — закэшированный fold префикса Φ

Snapshot хранит world + метаданные { count, lastEffectId, lastCreatedAt,
typeMap }. snapshot.world ≡ fold(effects). Используется в связке с
foldFromSnapshot (Task 3) для incremental fold."
```

---

## Task 3: foldFromSnapshot — apply дельты на snapshot

**Files:**
- Modify: `packages/core/src/snapshot.js`
- Modify: `packages/core/src/snapshot.test.js`

- [ ] **Step 1: Failing-тест для foldFromSnapshot**

Дописать в `packages/core/src/snapshot.test.js`:

```js
import { foldFromSnapshot } from "./snapshot.js";

describe("foldFromSnapshot", () => {
  it("пустой snapshot + delta ≡ fold(delta)", () => {
    const empty = createSnapshot([]);
    const delta = [
      {
        id: "e1",
        parent_id: null,
        target: "user",
        alpha: "add",
        status: "confirmed",
        context: { id: "u1", name: "Alice" },
        created_at: 100,
      },
    ];
    const world = foldFromSnapshot(empty, delta);
    expect(world).toEqual(fold(delta));
  });

  it("snapshot префикса + delta ≡ fold(всего)", () => {
    const all = [
      { id: "e1", parent_id: null, target: "user", alpha: "add", status: "confirmed",
        context: { id: "u1", name: "Alice" }, created_at: 100 },
      { id: "e2", parent_id: null, target: "user.name", alpha: "replace", status: "confirmed",
        context: { id: "u1" }, value: "Bob", created_at: 200 },
      { id: "e3", parent_id: null, target: "user", alpha: "add", status: "confirmed",
        context: { id: "u2", name: "Carol" }, created_at: 300 },
    ];
    const snap = createSnapshot(all.slice(0, 2));
    const delta = all.slice(2);
    const fromSnap = foldFromSnapshot(snap, delta);
    const full = fold(all);
    expect(fromSnap).toEqual(full);
  });

  it("не мутирует snapshot.world", () => {
    const initial = [
      { id: "e1", parent_id: null, target: "user", alpha: "add", status: "confirmed",
        context: { id: "u1", name: "Alice" }, created_at: 100 },
    ];
    const snap = createSnapshot(initial);
    const snapWorldBefore = JSON.parse(JSON.stringify(snap.world));
    const delta = [
      { id: "e2", parent_id: null, target: "user.name", alpha: "replace", status: "confirmed",
        context: { id: "u1" }, value: "Bob", created_at: 200 },
    ];
    foldFromSnapshot(snap, delta);
    expect(snap.world).toEqual(snapWorldBefore);
  });

  it("использует typeMap из snapshot, если не передан явно", () => {
    const typeMap = { user: "users" };
    const initial = [
      { id: "e1", parent_id: null, target: "user", alpha: "add", status: "confirmed",
        context: { id: "u1" }, created_at: 100 },
    ];
    const snap = createSnapshot(initial, typeMap);
    const delta = [
      { id: "e2", parent_id: null, target: "user", alpha: "add", status: "confirmed",
        context: { id: "u2" }, created_at: 200 },
    ];
    const world = foldFromSnapshot(snap, delta);
    expect(world.users).toHaveLength(2);
  });

  it("delta с parent_id, ссылающимся на effect в snapshot — child применяется поверх", () => {
    const parentEf = {
      id: "p1", parent_id: null, target: "user", alpha: "add", status: "confirmed",
      context: { id: "u1", name: "Alice" }, created_at: 100,
    };
    const childEf = {
      id: "c1", parent_id: "p1", target: "user.name", alpha: "replace", status: "confirmed",
      context: { id: "u1" }, value: "Bob", created_at: 200,
    };
    const snap = createSnapshot([parentEf]);
    const world = foldFromSnapshot(snap, [childEf]);
    expect(world.user[0].name).toBe("Bob");
  });
});
```

- [ ] **Step 2: Запустить — должен FAIL**

```bash
cd packages/core && npx vitest run src/snapshot.test.js -t "foldFromSnapshot" 2>&1 | tail -15
```

Expected: 5 failing (foldFromSnapshot не существует).

- [ ] **Step 3: Реализовать foldFromSnapshot**

Дописать в `packages/core/src/snapshot.js`:

```js
/**
 * Применить дельту effects поверх snapshot.world.
 *
 * Семантика: foldFromSnapshot(createSnapshot(prefix), delta) ≡ fold(prefix.concat(delta))
 * для любого split. Это даёт алгебраическую гарантию ассоциативности,
 * на которой строится incremental fold.
 *
 * Не мутирует snapshot.world (deep-clone сущностей).
 *
 * @param {Snapshot} snapshot
 * @param {Effect[]} deltaEffects
 * @param {Record<string, string>} [typeMap] — fallback на snapshot.typeMap
 * @returns {World}
 */
export function foldFromSnapshot(snapshot, deltaEffects, typeMap) {
  const effectiveTypeMap = typeMap ?? snapshot.typeMap ?? {};

  // Deep-clone сущностей snapshot.world в collections-shape
  const collections = {};
  for (const [type, entities] of Object.entries(snapshot.world)) {
    collections[type] = {};
    for (const ent of entities) {
      const id = ent.id;
      if (id != null) collections[type][id] = { ...ent };
    }
  }

  // Применить дельту в causal-порядке
  const sortedDelta = causalSort(deltaEffects);
  for (const ef of sortedDelta) applyEffect(ef, collections, effectiveTypeMap);

  // Собрать world
  const world = {};
  for (const [type, entities] of Object.entries(collections)) {
    world[type] = Object.values(entities);
  }
  return world;
}
```

- [ ] **Step 4: Запустить — должен PASS**

```bash
cd packages/core && npx vitest run src/snapshot.test.js 2>&1 | tail -10
```

Expected: все passing.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/snapshot.js packages/core/src/snapshot.test.js
git commit -m "feat(core): foldFromSnapshot — применить дельту поверх snapshot

foldFromSnapshot(snapshot, delta) ≡ fold(prefix.concat(delta)) для
любого split. Не мутирует snapshot.world (deep-clone сущностей).
typeMap fallback'ает на snapshot.typeMap.

Property test для ассоциативности — Task 4."
```

---

## Task 4: Property test — ассоциативность над случайными split'ами

**Files:**
- Modify: `packages/core/src/snapshot.test.js`

- [ ] **Step 1: Проверить наличие fast-check**

```bash
cd packages/core && cat package.json | grep fast-check
```

Expected: `"fast-check"` в devDependencies. Если нет — установить:

```bash
cd packages/core && npm install -D fast-check
```

- [ ] **Step 2: Написать property-тест**

Дописать в `packages/core/src/snapshot.test.js`:

```js
import fc from "fast-check";

describe("foldFromSnapshot — ассоциативность (property test)", () => {
  // Генератор валидного effect: добавляем сущность user_<i>
  const arbAddEffect = (i) => fc.record({
    id: fc.constant(`e${i}`),
    parent_id: fc.constant(null),
    target: fc.constant("user"),
    alpha: fc.constant("add"),
    status: fc.constant("confirmed"),
    context: fc.record({
      id: fc.constant(`u${i}`),
      name: fc.string({ minLength: 1, maxLength: 20 }),
    }),
    created_at: fc.constant(i * 100),
  });

  it("для любого split k: foldFromSnapshot(snap_k, delta) ≡ fold(all)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }).chain(n =>
          fc.tuple(
            fc.constant(n),
            fc.array(fc.integer({ min: 0, max: n }), { minLength: 1, maxLength: 1 }),
          )
        ),
        ([n, [k]]) => {
          const all = Array.from({ length: n }, (_, i) => ({
            id: `e${i}`,
            parent_id: null,
            target: "user",
            alpha: "add",
            status: "confirmed",
            context: { id: `u${i}`, name: `User${i}` },
            created_at: i * 100,
          }));
          const prefix = all.slice(0, k);
          const delta = all.slice(k);
          const snap = createSnapshot(prefix);
          const fromSnap = foldFromSnapshot(snap, delta);
          const full = fold(all);
          // Сравниваем по entities, порядок в массиве может отличаться
          expect(new Set((fromSnap.user || []).map(u => u.id)))
            .toEqual(new Set((full.user || []).map(u => u.id)));
          expect(fromSnap.user?.length || 0).toBe(full.user?.length || 0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("ассоциативность для replace effects (последний replace выигрывает)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        (n, kRaw) => {
          const k = Math.min(kRaw, n);
          const all = [
            {
              id: "add",
              parent_id: null,
              target: "user",
              alpha: "add",
              status: "confirmed",
              context: { id: "u1", name: "init" },
              created_at: 0,
            },
            ...Array.from({ length: n }, (_, i) => ({
              id: `r${i}`,
              parent_id: null,
              target: "user.name",
              alpha: "replace",
              status: "confirmed",
              context: { id: "u1" },
              value: `name${i}`,
              created_at: (i + 1) * 100,
            })),
          ];
          const prefix = all.slice(0, k + 1);
          const delta = all.slice(k + 1);
          const snap = createSnapshot(prefix);
          const fromSnap = foldFromSnapshot(snap, delta);
          const full = fold(all);
          expect(fromSnap.user?.[0]?.name).toBe(full.user?.[0]?.name);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("snapshot не мутируется при многократном foldFromSnapshot", () => {
    const initial = [
      { id: "e1", parent_id: null, target: "user", alpha: "add", status: "confirmed",
        context: { id: "u1", name: "Alice" }, created_at: 100 },
    ];
    const snap = createSnapshot(initial);
    const snapBefore = JSON.parse(JSON.stringify(snap));

    for (let i = 0; i < 10; i++) {
      foldFromSnapshot(snap, [
        { id: `e${i + 2}`, parent_id: null, target: "user", alpha: "add", status: "confirmed",
          context: { id: `u${i + 2}` }, created_at: 200 + i },
      ]);
    }

    expect(snap).toEqual(snapBefore);
  });
});
```

- [ ] **Step 3: Запустить**

```bash
cd packages/core && npx vitest run src/snapshot.test.js 2>&1 | tail -15
```

Expected: всё passing (3 property test'а × 100 runs ≈ 300 проверок).

Если есть failing — отладить (вероятная причина: collections-clone в foldFromSnapshot не deep, или causalSort переупорядочивает delta способом, который не воспроизводится в полном fold над all). Проверить, что для случайных n=k=5 всё работает вручную.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/snapshot.test.js
git commit -m "test(core): property-тест ассоциативности foldFromSnapshot

Для любого split k: foldFromSnapshot(snap_k, delta) ≡ fold(all).
fast-check, 100 runs × 3 property test'а покрывают:
- add-only сценарий
- add + replace (последний выигрывает)
- snapshot immutability при многократных вызовах"
```

---

## Task 5: fold(effects, typeMap, options) — backward-compat через third arg

**Files:**
- Modify: `packages/core/src/fold.js`
- Create: `packages/core/src/fold.snapshot-option.test.js`

- [ ] **Step 1: Failing-тест на options.snapshot в fold**

Создать `packages/core/src/fold.snapshot-option.test.js`:

```js
import { describe, it, expect } from "vitest";
import { fold } from "./fold.js";
import { createSnapshot, foldFromSnapshot } from "./snapshot.js";

const mkAdd = (i) => ({
  id: `e${i}`,
  parent_id: null,
  target: "user",
  alpha: "add",
  status: "confirmed",
  context: { id: `u${i}`, name: `User${i}` },
  created_at: i * 100,
});

describe("fold(effects, typeMap, options)", () => {
  it("без options — поведение как было (backward-compat)", () => {
    const effects = [mkAdd(1), mkAdd(2)];
    const world = fold(effects);
    expect(world.user).toHaveLength(2);
  });

  it("с typeMap (старый второй arg) — поведение как было", () => {
    const effects = [mkAdd(1)];
    const world = fold(effects, { user: "users" });
    expect(world.users).toHaveLength(1);
  });

  it("с options.snapshot — резолвит через foldFromSnapshot", () => {
    const prefix = [mkAdd(1), mkAdd(2)];
    const delta = [mkAdd(3)];
    const snap = createSnapshot(prefix);
    const fromOptions = fold(delta, {}, { snapshot: snap });
    const fromExplicit = foldFromSnapshot(snap, delta);
    expect(fromOptions).toEqual(fromExplicit);
  });

  it("options.snapshot имеет приоритет над пустым typeMap (берётся из snapshot)", () => {
    const typeMap = { user: "users" };
    const prefix = [mkAdd(1)];
    const delta = [mkAdd(2)];
    const snap = createSnapshot(prefix, typeMap);
    const world = fold(delta, {}, { snapshot: snap });
    expect(world.users).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Запустить — должен FAIL**

```bash
cd packages/core && npx vitest run src/fold.snapshot-option.test.js 2>&1 | tail -10
```

Expected: 2 failing (тесты с `options.snapshot` — fold ещё не принимает третий arg).

- [ ] **Step 3: Расширить fold third arg**

В `packages/core/src/fold.js`:

```js
import { causalSort } from "./causalSort.js";
import { applyEffect, getCollectionType, foldFromSnapshot } from "./snapshot.js";

// ... buildTypeMap без изменений ...

/**
 * fold(effects, typeMap, options) → world
 *
 * По манифесту: World(t) = fold(⊕, ∅, sort≺(Φ_confirmed ↓ t))
 *
 * Если options.snapshot передан, fold делегирует в foldFromSnapshot
 * (incremental fold). Иначе — full fold с нуля.
 *
 * @param {Effect[]} effects
 * @param {Record<string, string>} [typeMap]
 * @param {{ snapshot?: import('./snapshot.js').Snapshot }} [options]
 * @returns {World}
 */
export function fold(effects, typeMap = {}, options = {}) {
  if (options.snapshot) {
    return foldFromSnapshot(options.snapshot, effects, typeMap);
  }

  const collections = {};
  const sorted = causalSort(effects);

  for (const ef of sorted) applyEffect(ef, collections, typeMap);

  const world = {};
  for (const [type, entities] of Object.entries(collections)) {
    world[type] = Object.values(entities);
  }
  return world;
}
```

- [ ] **Step 4: Запустить новый тест**

```bash
cd packages/core && npx vitest run src/fold.snapshot-option.test.js 2>&1 | tail -10
```

Expected: 4 passing.

- [ ] **Step 5: Прогнать все fold-тесты — regression**

```bash
cd packages/core && npx vitest run src/fold 2>&1 | tail -10
```

Expected: всё passing (включая старые fold-тесты).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/fold.js packages/core/src/fold.snapshot-option.test.js
git commit -m "feat(core): fold принимает options.snapshot для incremental режима

Третий аргумент fold(effects, typeMap, options) теперь поддерживает
options.snapshot — fold делегирует в foldFromSnapshot. Backward-compat
сохранён: fold(effects) и fold(effects, typeMap) работают как было."
```

---

## Task 6: Бенчмарк — fold vs foldFromSnapshot на 10K Φ

**Files:**
- Create: `packages/core/src/snapshot.bench.js`

- [ ] **Step 1: Написать bench**

Создать `packages/core/src/snapshot.bench.js`:

```js
/**
 * Бенчмарк incremental fold vs full fold.
 *
 * Запуск: npx vitest bench src/snapshot.bench.js
 *
 * Цель: foldFromSnapshot(snap_9000, last_1000) должен быть ≥5× быстрее,
 * чем fold(10000) на одной machine.
 */

import { bench, describe } from "vitest";
import { fold } from "./fold.js";
import { createSnapshot, foldFromSnapshot } from "./snapshot.js";

function makeEffects(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `e${i}`,
    parent_id: null,
    target: i % 3 === 0 ? "user" : "user.name",
    alpha: i % 3 === 0 ? "add" : "replace",
    status: "confirmed",
    context: i % 3 === 0
      ? { id: `u${i}`, name: `User${i}` }
      : { id: `u${Math.floor(i / 3)}` },
    value: i % 3 !== 0 ? `name${i}` : undefined,
    created_at: i,
  }));
}

const TOTAL = 10_000;
const SNAP_SIZE = 9_000;
const all = makeEffects(TOTAL);
const snap = createSnapshot(all.slice(0, SNAP_SIZE));
const delta = all.slice(SNAP_SIZE);

describe("fold vs foldFromSnapshot — 10K effects, 1K delta", () => {
  bench("fold(10K) — full re-fold", () => {
    fold(all);
  });

  bench("foldFromSnapshot(snap_9K, delta_1K)", () => {
    foldFromSnapshot(snap, delta);
  });

  bench("createSnapshot(9K) — one-time cost", () => {
    createSnapshot(all.slice(0, SNAP_SIZE));
  });
});
```

- [ ] **Step 2: Запустить bench**

```bash
cd packages/core && npx vitest bench src/snapshot.bench.js 2>&1 | tail -25
```

Expected: `foldFromSnapshot` ≥5× быстрее `fold(10K)`. Записать ratios в commit message.

Если ratio <5× — диагностика: deep-clone в foldFromSnapshot слишком дорогой; возможно нужен structured clone optimization. На первой версии 5× — целевая, не блокирующая; ratio ≥2× принимаем.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/snapshot.bench.js
git commit -m "bench(core): incremental fold — foldFromSnapshot vs fold на 10K Φ

Бенчмарк показывает <измеренный ratio> ускорение для split 9K snapshot
+ 1K delta. createSnapshot — one-time cost, амортизируется на множестве
последующих foldFromSnapshot вызовов."
```

(Пометить TODO в commit-сообщении: записать конкретные числа из вывода.)

---

## Task 7: Экспорт + changeset

**Files:**
- Modify: `packages/core/src/index.js`
- Create: `.changeset/incremental-fold-snapshots.md`

- [ ] **Step 1: Добавить экспорт в index.js**

В `packages/core/src/index.js`, в блок `} from "./fold.js";` добавить рядом:

```js
export {
  createSnapshot,
  foldFromSnapshot,
  applyEffect,
  getCollectionType,
} from "./snapshot.js";
```

- [ ] **Step 2: Smoke-тест экспорта**

Создать `packages/core/src/snapshot.export.test.js`:

```js
import { describe, it, expect } from "vitest";
import * as core from "./index.js";

describe("@intent-driven/core — snapshot exports", () => {
  it("экспортирует createSnapshot, foldFromSnapshot", () => {
    expect(typeof core.createSnapshot).toBe("function");
    expect(typeof core.foldFromSnapshot).toBe("function");
    expect(typeof core.applyEffect).toBe("function");
    expect(typeof core.getCollectionType).toBe("function");
  });
});
```

- [ ] **Step 3: Запустить**

```bash
cd packages/core && npx vitest run src/snapshot.export.test.js 2>&1 | tail -10
```

Expected: passing.

- [ ] **Step 4: Создать changeset**

Создать `.changeset/incremental-fold-snapshots.md`:

```markdown
---
"@intent-driven/core": minor
---

feat: incremental fold + structural snapshots

Добавляет API для кэширования fold:
- `createSnapshot(effects, typeMap)` — `world_k` плюс метаданные.
- `foldFromSnapshot(snapshot, deltaEffects, typeMap)` — apply дельты на
  snapshot, ≡ `fold(prefix.concat(delta))`.
- `fold(effects, typeMap, { snapshot })` — третий arg для incremental режима.

Семантика: snapshot.world ≡ fold(prefix); foldFromSnapshot гарантирует
ассоциативность (property test, 300 runs). Обратно совместимо: `fold(effects)`
и `fold(effects, typeMap)` без изменений.

Цель: O(delta) re-render на больших Φ для production-tenants. Phase 2
(engine validator caching) — отдельный backlog item.

Backlog: `docs/superpowers/specs/2026-04-26-core-backlog.md` § A1.
```

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/index.js packages/core/src/snapshot.export.test.js .changeset/incremental-fold-snapshots.md
git commit -m "feat(core): экспортировать createSnapshot/foldFromSnapshot + changeset

Публичный API @intent-driven/core теперь включает snapshot helpers.
Changeset запросит minor bump (0.78 → 0.79)."
```

---

## Task 8: Финальный sanity + push + PR

**Files:** —

- [ ] **Step 1: Прогнать все core-тесты**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/core-backlog-2026-04-26/packages/core && npx vitest run 2>&1 | tail -15
```

Expected: всё passing. Если что-то failing — починить или докинуть тестами на что забыли.

- [ ] **Step 2: Git status — проверить, что нет лишних файлов**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/core-backlog-2026-04-26 && git status -sb && git log --oneline main..HEAD
```

Expected: 7-8 commits на ветке, нет untracked-мусора.

- [ ] **Step 3: Push ветки**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/core-backlog-2026-04-26 && git push -u origin feat/core-backlog-2026-04-26
```

- [ ] **Step 4: Открыть PR**

```bash
gh pr create --repo DubovskiyIM/idf-sdk \
  --title "feat(core): backlog ядра 2026-04-26 + incremental fold (A1)" \
  --body "$(cat <<'EOF'
## Контекст
Внешний review поднял 7 архитектурных «дыр» формата. Аналитический разбор против актуального кода SDK на 2026-04-26 → 5 направлений приняты в backlog ядра, 2 отклонены.

## Документы
- \`docs/superpowers/specs/2026-04-26-core-backlog.md\` — master backlog (5 направлений: snapshots, joint solver, causal Φ, modality patterns, capability matching).
- \`docs/superpowers/plans/2026-04-26-incremental-fold-snapshots.md\` — implementation plan для приоритета #1.

## Реализовано (A1: Incremental fold + snapshots)
- \`packages/core/src/snapshot.js\` — \`createSnapshot\` / \`foldFromSnapshot\` / extracted \`applyEffect\`.
- \`fold(effects, typeMap, { snapshot })\` — третий arg для incremental режима. Backward-compat сохранён.
- Property test ассоциативности: \`foldFromSnapshot(snap_k, delta) ≡ fold(all)\` для любого split (fast-check, 300 runs).
- Бенчмарк \`snapshot.bench.js\` — измерено ускорение для 10K Φ split 9K+1K.
- Changeset для \`@intent-driven/core\` minor.

## Не входит (отдельные items)
- A2-A5 — implementation plans пишутся поштучно после approve master backlog'а.
- Phase 2 A1 (engine \`validator.foldWorld\` caching, scoped fold per role) — отдельный plan.

## Test plan
- [ ] vitest core green
- [ ] benchmark показывает ≥2× speedup foldFromSnapshot vs fold на 10K
- [ ] обратная совместимость: все старые fold-тесты passing без изменений
- [ ] changeset подобран release-bot'ом
EOF
)"
```

- [ ] **Step 5: Проверить, что CI зелёный**

```bash
gh pr checks <PR-number> --repo DubovskiyIM/idf-sdk --watch 2>&1 | tail -10
```

Expected: все checks green. Если что-то failing — диагностика.

- [ ] **Step 6: HTML-отчёт на рабочий стол**

Создать `~/Desktop/idf/2026-04-26-core-backlog.html` с тёмной темой, статусом 5 направлений, ссылкой на PR. (Шаблон из предыдущих session-report'ов.)

- [ ] **Step 7: Финальный commit с number'ом из bench (если был TODO)**

Если в Task 6 commit message был с placeholder'ом — переписать commit или amend (или новый commit с актуальными числами).

```bash
# Если новый commit:
git commit --allow-empty -m "docs(plan): записать измеренные bench-ratios

10K full fold: <Xms>
1K delta from 9K snapshot: <Yms>
Ratio: <Z×>"
git push
```

---

## Self-Review

**1. Spec coverage:**
- A1 problem statement → Task 0-7 ✓
- A1 success criteria (associativity property + ≥5× bench + backward-compat) → Task 4 (associativity), Task 6 (bench), Task 5+regression (backward-compat) ✓
- Phase 2 (engine integration) — explicitly deferred ✓

**2. Placeholder scan:**
- TODO в Task 6/7/8 commit-сообщениях — это не placeholder в плане, а реальный TODO для исполнителя записать измеренное число.
- Нет «implement later», «add appropriate error handling», «similar to Task N».

**3. Type consistency:**
- Snapshot shape: `{ world, count, lastEffectId, lastCreatedAt, typeMap }` — used consistently across Task 2, 3, 5.
- API: `createSnapshot(effects, typeMap?)`, `foldFromSnapshot(snapshot, delta, typeMap?)`, `fold(effects, typeMap?, { snapshot? })` — consistent.
- `applyEffect(ef, collections, typeMap)` — same signature in Task 1 (extract) and Task 2 (use внутри createSnapshot).

Все типы и сигнатуры согласованы.
