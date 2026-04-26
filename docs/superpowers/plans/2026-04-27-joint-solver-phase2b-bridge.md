# Joint solver Phase 2b — bridge module

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task.

**Goal:** Bridge module `computeAlternateAssignment(INTENTS, projection, ONTOLOGY, opts?)` который извлекает intents+slots из existing assignToSlots* input format и прогоняет через `hungarianAssign`. Same signature как assignToSlots* — для diagnostic side-by-side. Infrastructure для Phase 2c (diagnostic comparison + future integration).

**Architecture:** Новый модуль `crystallize_v2/jointSolverBridge.js`. Использует existing `accessibleIntents` + `computeSalience` для извлечения. Default slot models per archetype (catalog/detail). Не модифицирует assignToSlots*.

**Tech Stack:** core@0.82.0+, ES modules, vitest.

**Backlog ref:** `docs/superpowers/specs/2026-04-26-core-backlog.md` § A2.

---

## File Structure

**Create:**
- `packages/core/src/crystallize_v2/jointSolverBridge.js`
- `packages/core/src/crystallize_v2/jointSolverBridge.test.js`
- `.changeset/joint-solver-phase2b-bridge.md`

**Modify:**
- `packages/core/src/index.js` — export `computeAlternateAssignment`, `getDefaultSlotsForArchetype`.

---

## Default slot models per archetype

```js
// catalog
{
  hero:    { capacity: 1,  allowedRoles: ["primary"] },
  toolbar: { capacity: 5,  allowedRoles: ["primary", "secondary", "navigation"] },
  context: { capacity: 10, allowedRoles: ["secondary", "utility", "navigation"] },
  fab:     { capacity: 1,  allowedRoles: ["destructive"] },
}

// detail
{
  primaryCTA: { capacity: 3,  allowedRoles: ["primary", "destructive"] },
  secondary:  { capacity: 5,  allowedRoles: ["secondary", "navigation"] },
  toolbar:    { capacity: 10, allowedRoles: ["secondary", "utility", "navigation"] },
  footer:     { capacity: 3,  allowedRoles: ["utility", "destructive"] },
}
```

Эти defaults — Phase 2b/c starting point. Phase 2d может извлекать из `archetype-rules` или `projection.slots` overrides.

---

## Task 0: Worktree sanity

- [ ] **Step 1: Подтвердить branch + version**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/joint-solver-phase2b
git status -sb
node -p "require('./packages/core/package.json').version"
cd packages/core && npx vitest run 2>&1 | grep -E "Tests" | head -1
```

Expected: branch `feat/joint-solver-phase2b-bridge`, version ≥0.82.0, ≥1700 tests passing.

---

## Task 1: getDefaultSlotsForArchetype

**Files:**
- Create: `packages/core/src/crystallize_v2/jointSolverBridge.js`
- Create: `packages/core/src/crystallize_v2/jointSolverBridge.test.js`

- [ ] **Step 1: Failing-тесты**

```js
import { describe, it, expect } from "vitest";
import { getDefaultSlotsForArchetype } from "./jointSolverBridge.js";

describe("getDefaultSlotsForArchetype", () => {
  it("catalog → hero/toolbar/context/fab", () => {
    const slots = getDefaultSlotsForArchetype("catalog");
    expect(Object.keys(slots)).toEqual(["hero", "toolbar", "context", "fab"]);
    expect(slots.hero.capacity).toBe(1);
    expect(slots.hero.allowedRoles).toContain("primary");
  });

  it("detail → primaryCTA/secondary/toolbar/footer", () => {
    const slots = getDefaultSlotsForArchetype("detail");
    expect(Object.keys(slots)).toEqual(["primaryCTA", "secondary", "toolbar", "footer"]);
    expect(slots.primaryCTA.capacity).toBe(3);
    expect(slots.primaryCTA.allowedRoles).toContain("destructive");
  });

  it("feed → toolbar/context/fab (без hero)", () => {
    const slots = getDefaultSlotsForArchetype("feed");
    expect("toolbar" in slots).toBe(true);
    expect("hero" in slots).toBe(false);
  });

  it("неизвестный archetype → fallback на catalog", () => {
    const slots = getDefaultSlotsForArchetype("unknown");
    expect("toolbar" in slots).toBe(true);
  });
});
```

- [ ] **Step 2: FAIL (module not found)**

```bash
cd packages/core && npx vitest run src/crystallize_v2/jointSolverBridge.test.js 2>&1 | tail -5
```

- [ ] **Step 3: Реализовать**

```js
const SLOTS_CATALOG = {
  hero:    { capacity: 1,  allowedRoles: ["primary"] },
  toolbar: { capacity: 5,  allowedRoles: ["primary", "secondary", "navigation"] },
  context: { capacity: 10, allowedRoles: ["secondary", "utility", "navigation"] },
  fab:     { capacity: 1,  allowedRoles: ["destructive"] },
};

const SLOTS_DETAIL = {
  primaryCTA: { capacity: 3,  allowedRoles: ["primary", "destructive"] },
  secondary:  { capacity: 5,  allowedRoles: ["secondary", "navigation"] },
  toolbar:    { capacity: 10, allowedRoles: ["secondary", "utility", "navigation"] },
  footer:     { capacity: 3,  allowedRoles: ["utility", "destructive"] },
};

const SLOTS_FEED = {
  toolbar: { capacity: 5,  allowedRoles: ["primary", "secondary", "navigation"] },
  context: { capacity: 10, allowedRoles: ["secondary", "utility", "navigation"] },
  fab:     { capacity: 1,  allowedRoles: ["destructive"] },
};

export function getDefaultSlotsForArchetype(archetype) {
  switch (archetype) {
    case "detail": return SLOTS_DETAIL;
    case "feed": return SLOTS_FEED;
    case "catalog":
    default: return SLOTS_CATALOG;
  }
}
```

- [ ] **Step 4: PASS**

```bash
cd packages/core && npx vitest run src/crystallize_v2/jointSolverBridge.test.js 2>&1 | tail -5
```

Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/crystallize_v2/jointSolverBridge.{js,test.js}
git commit -m "feat(core): getDefaultSlotsForArchetype — Phase 2b foundation"
```

---

## Task 2: computeAlternateAssignment — main bridge

**Files:**
- Modify: `packages/core/src/crystallize_v2/jointSolverBridge.js`
- Modify: `packages/core/src/crystallize_v2/jointSolverBridge.test.js`

- [ ] **Step 1: Failing-тесты**

```js
import { computeAlternateAssignment } from "./jointSolverBridge.js";

const SYNTH_INTENTS = {
  create_listing: {
    id: "create_listing",
    creates: "Listing",
    salience: 80,
    particles: { effects: [] },
  },
  edit_listing: {
    id: "edit_listing",
    salience: 70,
    particles: { effects: [{ α: "replace", target: "Listing.title" }] },
  },
  delete_listing: {
    id: "delete_listing",
    salience: 30,
    particles: { effects: [{ α: "remove", target: "Listing" }] },
  },
  view_history: {
    id: "view_history",
    salience: 10,
    particles: { effects: [] },
  },
};

const SYNTH_ONTOLOGY = {
  entities: { Listing: { fields: { id: { type: "string" } } } },
  roles: {
    seller: { canExecute: ["create_listing", "edit_listing", "delete_listing", "view_history"] },
  },
};

const SYNTH_PROJECTION = {
  id: "listing_detail",
  mainEntity: "Listing",
  archetype: "detail",
};

describe("computeAlternateAssignment", () => {
  it("извлекает intents через accessibleIntents и распределяет по default slots", () => {
    const result = computeAlternateAssignment(SYNTH_INTENTS, SYNTH_PROJECTION, SYNTH_ONTOLOGY, {
      role: "seller",
    });
    expect(result.assignment.size).toBeGreaterThan(0);
    // create_listing (primary, salience 80) → primaryCTA
    expect(result.assignment.get("create_listing")).toBe("primaryCTA");
    // edit_listing (secondary, salience 70) → secondary или toolbar
    expect(["secondary", "toolbar"]).toContain(result.assignment.get("edit_listing"));
    // delete_listing (navigation+destructive, salience 30) → primaryCTA или footer
    expect(["primaryCTA", "footer"]).toContain(result.assignment.get("delete_listing"));
    // view_history (utility, salience 10) → toolbar или footer
    expect(["toolbar", "footer"]).toContain(result.assignment.get("view_history"));
  });

  it("возвращает witnesses с basis: 'joint-solver-alternative'", () => {
    const result = computeAlternateAssignment(SYNTH_INTENTS, SYNTH_PROJECTION, SYNTH_ONTOLOGY, {
      role: "seller",
    });
    // Если есть unassigned — должен быть witness ill-conditioned (от hungarianAssign).
    // Bridge отдельно может пометить metadata witness'ом 'joint-solver-alternative'
    // — для diagnostic clarity.
    expect(result.metadata).toBeDefined();
    expect(result.metadata.basis).toBe("joint-solver-alternative");
    expect(result.metadata.archetype).toBe("detail");
    expect(result.metadata.role).toBe("seller");
  });

  it("opts.slots override — использует переданный slot model", () => {
    const customSlots = {
      onlyOne: { capacity: 1, allowedRoles: ["primary"] },
    };
    const result = computeAlternateAssignment(SYNTH_INTENTS, SYNTH_PROJECTION, SYNTH_ONTOLOGY, {
      role: "seller",
      slots: customSlots,
    });
    expect(result.assignment.size).toBeLessThanOrEqual(1);
    if (result.assignment.size === 1) {
      expect([...result.assignment.values()]).toEqual(["onlyOne"]);
    }
  });

  it("без role — fallback на projection.forRoles[0] или 'observer'", () => {
    const projWithRole = { ...SYNTH_PROJECTION, forRoles: ["seller"] };
    const result = computeAlternateAssignment(SYNTH_INTENTS, projWithRole, SYNTH_ONTOLOGY);
    expect(result.assignment.size).toBeGreaterThan(0);
  });

  it("использует Hungarian (не greedy) по дефолту", () => {
    // Можно verify через 4 primary intents → 3 в primaryCTA, 1 в secondary
    const fourPrimary = {
      a: { id: "a", salience: 90, particles: { effects: [] } },
      b: { id: "b", salience: 88, particles: { effects: [] } },
      c: { id: "c", salience: 86, particles: { effects: [] } },
      d: { id: "d", salience: 84, particles: { effects: [] } },
    };
    const ont = {
      entities: { Listing: { fields: {} } },
      roles: { seller: { canExecute: ["a", "b", "c", "d"] } },
    };
    const result = computeAlternateAssignment(fourPrimary, SYNTH_PROJECTION, ont, { role: "seller" });
    const inPrimary = [...result.assignment.entries()].filter(([_, s]) => s === "primaryCTA");
    expect(inPrimary).toHaveLength(3);
  });

  it("opts.solver: 'greedy' — fall back на greedyAssign", () => {
    const result = computeAlternateAssignment(SYNTH_INTENTS, SYNTH_PROJECTION, SYNTH_ONTOLOGY, {
      role: "seller",
      solver: "greedy",
    });
    expect(result.metadata.solver).toBe("greedy");
    expect(result.assignment.size).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Реализовать**

```js
import { accessibleIntents } from "./accessibleIntents.js";
import { computeSalience } from "./salience.js";
import { buildCostMatrix, greedyAssign } from "./jointSolver.js";
import { hungarianAssign } from "./hungarianAssign.js";

export function computeAlternateAssignment(INTENTS, projection, ONTOLOGY, opts = {}) {
  const role = opts.role
    ?? (Array.isArray(projection?.forRoles) ? projection.forRoles[0] : null)
    ?? "observer";

  const archetype = projection?.archetype || projection?.kind || "catalog";
  const slots = opts.slots || getDefaultSlotsForArchetype(archetype);

  const rawIntents = accessibleIntents(projection, role, INTENTS, ONTOLOGY);
  const mainEntity = projection?.mainEntity;

  // Enrich intents с computed salience (если ещё нет)
  const enriched = rawIntents.map((intent) => {
    if (typeof intent.salience === "number") return intent;
    const computed = computeSalience(intent, mainEntity);
    return { ...intent, salience: computed.value };
  });

  const matrix = buildCostMatrix({ intents: enriched, slots, mainEntity });

  const solverName = opts.solver === "greedy" ? "greedy" : "hungarian";
  const solverFn = solverName === "greedy" ? greedyAssign : hungarianAssign;
  const result = solverFn(matrix, slots);

  return {
    ...result,
    metadata: {
      basis: "joint-solver-alternative",
      reliability: "rule-based",
      archetype,
      role,
      mainEntity,
      solver: solverName,
      intentCount: enriched.length,
      slotNames: Object.keys(slots),
    },
  };
}
```

- [ ] **Step 4: PASS**

```bash
cd packages/core && npx vitest run src/crystallize_v2/jointSolverBridge.test.js 2>&1 | tail -5
```

Expected: 10 passing (4 default slots + 6 bridge).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/crystallize_v2/jointSolverBridge.{js,test.js}
git commit -m "feat(core): computeAlternateAssignment — bridge для diagnostic comparison

Same signature как assignToSlots* (INTENTS, projection, ONTOLOGY, opts?).
Извлекает intents через accessibleIntents, enrich computed salience,
default slots по archetype, прогоняет hungarianAssign.

opts.solver: 'greedy' → greedyAssign fallback (для A/B сравнения).
opts.slots — override default model.

metadata.basis = 'joint-solver-alternative' — witness-style маркер."
```

---

## Task 3: Export + changeset + final

**Files:**
- Modify: `packages/core/src/index.js`
- Create: `packages/core/src/crystallize_v2/jointSolverBridge.export.test.js`
- Create: `.changeset/joint-solver-phase2b-bridge.md`

- [ ] **Step 1: Export**

В `packages/core/src/index.js`, после Phase 2a Hungarian экспорта:

```js
// Joint solver — Phase 2b: bridge для diagnostic side-by-side
export {
  computeAlternateAssignment,
  getDefaultSlotsForArchetype,
} from "./crystallize_v2/jointSolverBridge.js";
```

- [ ] **Step 2: Smoke**

```js
import { describe, it, expect } from "vitest";
import * as core from "../index.js";

describe("@intent-driven/core — bridge exports (A2 Phase 2b)", () => {
  it("экспортирует computeAlternateAssignment, getDefaultSlotsForArchetype", () => {
    expect(typeof core.computeAlternateAssignment).toBe("function");
    expect(typeof core.getDefaultSlotsForArchetype).toBe("function");
  });

  it("end-to-end через публичный API", () => {
    const INTENTS = {
      a: { id: "a", salience: 80, particles: { effects: [] } },
    };
    const ONTOLOGY = {
      entities: { Item: { fields: {} } },
      roles: { user: { canExecute: ["a"] } },
    };
    const projection = { id: "p", mainEntity: "Item", archetype: "detail" };
    const result = core.computeAlternateAssignment(INTENTS, projection, ONTOLOGY, { role: "user" });
    expect(result.metadata.basis).toBe("joint-solver-alternative");
    expect(result.assignment.get("a")).toBe("primaryCTA");
  });
});
```

- [ ] **Step 3: Changeset**

```markdown
---
"@intent-driven/core": minor
---

feat: joint solver Phase 2b — bridge module

Добавляет `computeAlternateAssignment(INTENTS, projection, ONTOLOGY, opts?)` —
bridge между existing `assignToSlots*` input format и jointSolver
pipeline. Same signature; диагностический side-by-side для будущей
Phase 2c integration.

API:
- `getDefaultSlotsForArchetype(archetype)` — default slot models для
  catalog/detail/feed.
- `computeAlternateAssignment(INTENTS, projection, ONTOLOGY, opts?)`
  → `{ assignment, unassigned, witnesses, metadata }`
  - extracts intents через `accessibleIntents`
  - enriches с computed salience (если intent не имеет explicit)
  - applies default slots по `projection.archetype`
  - default solver: `hungarianAssign`; `opts.solver: "greedy"` → fallback
  - `metadata.basis: "joint-solver-alternative"` — diagnostic marker

opts:
- `role` — viewer role (default: `projection.forRoles[0]` или `"observer"`)
- `slots` — override default slot model
- `solver` — `"hungarian"` (default) | `"greedy"`

Phase 2c (интеграция в `assignToSlotsCatalog/Detail` через diagnostic
witness emit) и Phase 3 (calibration) — отдельные backlog items.

Backlog: `docs/superpowers/specs/2026-04-26-core-backlog.md` § A2.
Plan: `docs/superpowers/plans/2026-04-27-joint-solver-phase2b-bridge.md`.
```

- [ ] **Step 4: Final regression**

```bash
cd packages/core && npx vitest run 2>&1 | grep -E "Tests" | head -1
```

Expected: ≥1786 passing.

- [ ] **Step 5: Commit + push + PR**

```bash
git add packages/core/src/index.js packages/core/src/crystallize_v2/jointSolverBridge.export.test.js .changeset/joint-solver-phase2b-bridge.md
git commit -m "feat(core): экспорт bridge API + changeset (A2 Phase 2b)"

git push -u origin feat/joint-solver-phase2b-bridge
gh pr create --repo DubovskiyIM/idf-sdk --title "feat(core): joint solver Phase 2b — bridge module (A2)" --body "..."
```

- [ ] **Step 6: HTML-отчёт `~/Desktop/idf/2026-04-27-joint-solver-phase2b-bridge.html`**

---

## Self-Review

**1. Spec coverage:**
- Bridge module → Tasks 1-2 ✓
- Default slots per archetype → Task 1 ✓
- Solver fallback (greedy/hungarian) → Task 2 ✓
- Phase 2c (integration через witness emit) — explicitly deferred ✓

**2. Placeholder scan:** PR body — TBD в момент создания (justified).

**3. Type consistency:**
- `getDefaultSlotsForArchetype(archetype) → SlotsModel` — used in Task 1, 2.
- `computeAlternateAssignment(INTENTS, projection, ONTOLOGY, opts) → { assignment, unassigned, witnesses, metadata }` — Task 2, 3.
- Metadata shape consistent.
