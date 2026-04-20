# Singleton Empty-State Creator-Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** В SDK renderer `ArchetypeDetail` при singleton-detail без существующей записи показать creator-intent CTA под EmptyState, вместо dead-end (закрывает freelance backlog §3.6 — `my_wallet_detail` у customer без Wallet).

**Architecture:** В `packages/renderer/src/archetypes/ArchetypeDetail.jsx` расширить existing empty-state branch (lines 80-99). Helper `findCreatorIntent(ctx.intents, mainEntity, viewer)` ищет intent с `α:"add"` + `creates === mainEntity` (c fallback на `particles.effects` для случаев когда `creates` опущен). Рендер: `<EmptyState>` + `<IntentButton>` (existing control) в flex-колонке.

**Tech Stack:** React, vitest, @testing-library/react, pnpm workspace, tsup build, changesets release.

**Связанные документы:**
- Design-spec: `docs/design/2026-04-20-singleton-empty-creator-design.md`
- Backlog: `idf/docs/sdk-improvements-backlog.md` §3.6
- Current file: `packages/renderer/src/archetypes/ArchetypeDetail.jsx:80-99`

**Worktree:** `~/WebstormProjects/idf-sdk/.worktrees/singleton-empty-creator/`, branch `feat/singleton-empty-creator`.

---

## File Structure

| Файл | Назначение | Изменения |
|---|---|---|
| `packages/renderer/src/archetypes/ArchetypeDetail.jsx` | Detail archetype renderer | Добавить helper `findCreatorIntent` + render CTA в singleton-empty-branch (lines 80-99) |
| `packages/renderer/src/archetypes/__fixtures__/singletonEmpty.js` | Test fixture | Новый: minimal Wallet ontology + top_up intent + customer viewer |
| `packages/renderer/src/archetypes/ArchetypeDetail.singletonEmpty.test.jsx` | Unit tests | Новый: 5 тестов (см. Task 3-6) |
| `.changeset/singleton-empty-creator.md` | Release changeset | Новый: patch bump `@intent-driven/renderer` |

---

## Task 1: Baseline — setup worktree + deps + tests

**Files:** (read-only)
- `package.json`
- `packages/renderer/package.json`

- [ ] **Step 1: Verify cwd is worktree + branch**

Run:
```bash
pwd
git rev-parse --abbrev-ref HEAD
```
Expected:
```
/Users/ignatdubovskiy/WebstormProjects/idf-sdk/.worktrees/singleton-empty-creator
feat/singleton-empty-creator
```

- [ ] **Step 2: Install dependencies**

Run: `pnpm install`
Expected: install completes without errors.

- [ ] **Step 3: Baseline test run**

Run: `pnpm -w test 2>&1 | tail -15`
Expected: все пакеты зелёные. Записать total tests count (например 850) как baseline.

- [ ] **Step 4: Baseline renderer-specific tests**

Run: `pnpm --filter @intent-driven/renderer test 2>&1 | tail -10`
Expected: зелёные. Записать renderer tests count.

---

## Task 2: Создать test fixture — minimal singleton ontology

**Files:**
- Create: `packages/renderer/src/archetypes/__fixtures__/singletonEmpty.js`

- [ ] **Step 1: Создать fixture file**

Create `packages/renderer/src/archetypes/__fixtures__/singletonEmpty.js`:

```js
/**
 * Fixture для singleton empty-state тестов.
 * Minimal Wallet ontology + top_up intent + customer viewer.
 */
export const WALLET_ONTOLOGY = {
  entities: {
    Wallet: {
      kind: "internal",
      fields: {
        id: { type: "id" },
        userId: { type: "entityRef", entity: "User" },
        balance: { type: "number" },
      },
      ownerField: "userId",
    },
    User: {
      kind: "internal",
      fields: {
        id: { type: "id" },
        name: { type: "text" },
        role: { type: "text" },
      },
    },
  },
};

export const TOP_UP_INTENT = {
  id: "top_up_wallet_by_card",
  name: "Пополнить баланс",
  α: "add",
  irreversibility: "medium",
  control: "formModal",
  parameters: [
    { name: "amount", type: "number", required: true, label: "Сумма" },
  ],
  particles: {
    entities: ["wallet: Wallet"],
    effects: [
      { α: "replace", target: "wallet.balance" },
      { α: "add", target: "transactions", σ: "account" },
    ],
  },
};

export const UNVERIFIED_INTENT = {
  id: "activate_profile",
  α: "add",
  particles: {
    conditions: ["user.verified = true"],
    effects: [
      { α: "add", target: "profiles", σ: "account" },
    ],
  },
};

export const WALLET_SINGLETON_PROJECTION = {
  name: "Мой кошелёк",
  kind: "detail",
  mainEntity: "Wallet",
  singleton: true,
};

export const CUSTOMER = { id: "user-1", name: "Customer", role: "customer" };
export const EMPTY_WORLD = { wallets: [], users: [CUSTOMER] };
```

- [ ] **Step 2: Commit**

```bash
git add packages/renderer/src/archetypes/__fixtures__/singletonEmpty.js
git commit -m "test(renderer): fixture для singleton empty-state тестов"
```

---

## Task 3: Test 1 — creator-intent виден в empty singleton

**Files:**
- Create: `packages/renderer/src/archetypes/ArchetypeDetail.singletonEmpty.test.jsx`

- [ ] **Step 1: Написать failing test**

Create `packages/renderer/src/archetypes/ArchetypeDetail.singletonEmpty.test.jsx`:

```jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ArchetypeDetail from "./ArchetypeDetail.jsx";
import {
  WALLET_ONTOLOGY, TOP_UP_INTENT, WALLET_SINGLETON_PROJECTION,
  CUSTOMER, EMPTY_WORLD,
} from "./__fixtures__/singletonEmpty.js";

function renderDetail({ intents, viewer = CUSTOMER, world = EMPTY_WORLD } = {}) {
  const ctx = {
    world,
    routeParams: {},
    viewer,
    ontology: WALLET_ONTOLOGY,
    intents: intents || { top_up_wallet_by_card: TOP_UP_INTENT },
    exec: () => {},
    navigate: () => {},
  };
  return render(
    <ArchetypeDetail
      slots={{}}
      nav={{ outgoing: [] }}
      ctx={ctx}
      projection={WALLET_SINGLETON_PROJECTION}
    />
  );
}

describe("ArchetypeDetail — singleton empty-state creator", () => {
  it("рендерит CTA creator-intent под EmptyState когда target отсутствует", () => {
    renderDetail();
    expect(screen.getByText(/ещё не создан/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /пополнить баланс/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Запустить — должен упасть**

Run:
```bash
pnpm --filter @intent-driven/renderer test -- ArchetypeDetail.singletonEmpty 2>&1 | tail -15
```
Expected: FAIL с `Unable to find an accessible element with the role "button" and name /пополнить баланс/i`.

---

## Task 4: Реализовать findCreatorIntent + рендер CTA

**Files:**
- Modify: `packages/renderer/src/archetypes/ArchetypeDetail.jsx`

- [ ] **Step 1: Проверить существующий IntentButton export**

Run:
```bash
grep -n "export" packages/renderer/src/controls/IntentButton.jsx | head -3
```
Expected: `export default function IntentButton` или аналог. Записать interface — какие props ожидает (intentId, spec, ctx, variant).

- [ ] **Step 2: Добавить helper `findCreatorIntent`**

В `packages/renderer/src/archetypes/ArchetypeDetail.jsx` добавить ПОСЛЕ строки 12 (после импортов, перед `export default function ArchetypeDetail`):

```jsx
import IntentButton from "../controls/IntentButton.jsx";

/**
 * Для singleton empty-state: найти первый intent, который создаёт mainEntity.
 * Учитывает:
 *  - creates: "Entity" / "Entity(variant)" — прямая декларация
 *  - particles.effects[].target — fallback когда creates опущен (targets главу
 *    pluralized или <entity>.<field>)
 *  - permittedFor / particles.conditions — filtering (см. shouldShowCreator).
 */
function findCreatorIntent(intents, mainEntity, viewer) {
  if (!intents || !mainEntity) return null;
  const entityLower = mainEntity.toLowerCase();
  const entityPlural = entityLower.endsWith("s") ? entityLower : entityLower + "s";
  for (const [id, intent] of Object.entries(intents)) {
    if (intent?.α !== "add") continue;
    // Прямая creates-декларация
    const createsMatch = typeof intent.creates === "string"
      && intent.creates.split("(")[0].trim() === mainEntity;
    let targetsMain = createsMatch;
    if (!targetsMain) {
      // Fallback: particles.effects.target mutates mainEntity
      const effects = intent.particles?.effects || [];
      targetsMain = effects.some(e => {
        const t = e.target;
        if (!t) return false;
        if (t === entityPlural) return true;              // add to collection
        if (t.startsWith(`${entityLower}.`)) return true; // replace field
        return false;
      });
    }
    if (!targetsMain) continue;
    if (!shouldShowCreator(intent, viewer)) continue;
    return { id, spec: intent };
  }
  return null;
}

/**
 * Policy для показа creator-intent на singleton empty-state:
 * - permittedFor: owner-field (customerId/userId) — пропускаем (target ещё нет).
 *   role-label — проверяем viewer.role.
 * - particles.conditions: conditions ссылающиеся на entity из particles.entities
 *   (например `wallet.userId = me.id`) — пропускаем (target отсутствует).
 *   Остальные — eval через evalIntentCondition с target=null.
 */
function shouldShowCreator(intent, viewer) {
  const { permittedFor } = intent;
  if (permittedFor && !/Id$/.test(permittedFor)) {
    // role-label, а не owner-field
    if (viewer?.role && viewer.role !== permittedFor) return false;
  }
  const conditions = intent.particles?.conditions || [];
  const entityAliases = (intent.particles?.entities || [])
    .map(e => e.split(":")[0].trim().toLowerCase());
  for (const cond of conditions) {
    const refsEntity = entityAliases.some(alias => cond.includes(`${alias}.`));
    if (refsEntity) continue; // skip — target-dependent
    if (!evalIntentCondition(cond, null, viewer)) return false;
  }
  return true;
}
```

- [ ] **Step 3: Заменить singleton empty-state branch**

Найти в `ArchetypeDetail.jsx` блок (около строки 80):

```jsx
  if (!target) {
    const id = parentCtx.routeParams?.[projection?.idParam];
    const entityName = projection?.name || "Запись";
    if (!id) {
      return (
        <EmptyState
          icon="👈"
          title="Выбери элемент из списка"
          hint={`Открой конкретный ${entityName.toLowerCase()} из соответствующего раздела.`}
        />
      );
    }
    return (
      <EmptyState
        icon="🔍"
        title="Ничего не найдено"
        hint={`${entityName} с этим идентификатором отсутствует — возможно, был удалён.`}
      />
    );
  }
```

Заменить на:

```jsx
  if (!target) {
    const entityName = projection?.name || "Запись";
    if (projection?.singleton) {
      const creator = findCreatorIntent(parentCtx.intents, projection.mainEntity, parentCtx.viewer);
      return (
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 16, padding: 24,
        }}>
          <EmptyState
            icon="✨"
            title={`${entityName} ещё не создан`}
            hint="Создайте запись — она привяжется к вашему аккаунту."
          />
          {creator && (
            <IntentButton
              intentId={creator.id}
              spec={creator.spec}
              ctx={ctx}
              variant="primary"
            />
          )}
        </div>
      );
    }
    const id = parentCtx.routeParams?.[projection?.idParam];
    if (!id) {
      return (
        <EmptyState
          icon="👈"
          title="Выбери элемент из списка"
          hint={`Открой конкретный ${entityName.toLowerCase()} из соответствующего раздела.`}
        />
      );
    }
    return (
      <EmptyState
        icon="🔍"
        title="Ничего не найдено"
        hint={`${entityName} с этим идентификатором отсутствует — возможно, был удалён.`}
      />
    );
  }
```

- [ ] **Step 4: Запустить Test 1 — должен пройти**

Run:
```bash
pnpm --filter @intent-driven/renderer test -- ArchetypeDetail.singletonEmpty 2>&1 | tail -10
```
Expected: PASS.

Если падает по `IntentButton`-контракту — посмотреть `packages/renderer/src/controls/IntentButton.jsx` и скорректировать props (например `spec` может называться `intent`).

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/archetypes/ArchetypeDetail.jsx \
        packages/renderer/src/archetypes/ArchetypeDetail.singletonEmpty.test.jsx
git commit -m "feat(renderer): singleton empty-state рендерит creator-intent CTA

ArchetypeDetail при !target && projection.singleton ищет intent с
α:add + creates===mainEntity (c fallback на particles.effects) и
рендерит его CTA под EmptyState. Закрывает freelance backlog §3.6:
my_wallet_detail у customer без Wallet больше не dead-end —
top_up_wallet_by_card становится accessible через IntentButton."
```

---

## Task 5: Test 2 — no creator-intent → EmptyState only (no-regression)

**Files:**
- Modify: `packages/renderer/src/archetypes/ArchetypeDetail.singletonEmpty.test.jsx`

- [ ] **Step 1: Добавить test**

Добавить в describe-блок:

```jsx
  it("без creator-intent показывает только EmptyState (no-regression)", () => {
    renderDetail({ intents: {} });  // пустой intents map
    expect(screen.getByText(/ещё не создан/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Запустить — должен пройти**

Run:
```bash
pnpm --filter @intent-driven/renderer test -- ArchetypeDetail.singletonEmpty 2>&1 | tail -10
```
Expected: 2 passed.

- [ ] **Step 3: Commit**

```bash
git add packages/renderer/src/archetypes/ArchetypeDetail.singletonEmpty.test.jsx
git commit -m "test(renderer): singleton empty-state без creator — только EmptyState"
```

---

## Task 6: Test 3 — non-singleton detail без target (existing behavior сохранён)

**Files:**
- Modify: `packages/renderer/src/archetypes/ArchetypeDetail.singletonEmpty.test.jsx`

- [ ] **Step 1: Добавить test**

```jsx
  it("non-singleton detail без id — показывает 'Выбери элемент из списка' (no-regression)", () => {
    const projection = { ...WALLET_SINGLETON_PROJECTION, singleton: false, idParam: "walletId" };
    render(
      <ArchetypeDetail
        slots={{}}
        nav={{ outgoing: [] }}
        ctx={{
          world: EMPTY_WORLD, routeParams: {}, viewer: CUSTOMER,
          ontology: WALLET_ONTOLOGY,
          intents: { top_up_wallet_by_card: TOP_UP_INTENT },
          exec: () => {}, navigate: () => {},
        }}
        projection={projection}
      />
    );
    expect(screen.getByText(/выбери элемент/i)).toBeInTheDocument();
    // creator-CTA не должен появиться вне singleton
    expect(screen.queryByRole("button", { name: /пополнить/i })).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Запустить**

Run:
```bash
pnpm --filter @intent-driven/renderer test -- ArchetypeDetail.singletonEmpty 2>&1 | tail -10
```
Expected: 3 passed.

- [ ] **Step 3: Commit**

```bash
git add packages/renderer/src/archetypes/ArchetypeDetail.singletonEmpty.test.jsx
git commit -m "test(renderer): non-singleton detail без id сохраняет existing EmptyState"
```

---

## Task 7: Test 4 — conditions на target skip'аются на empty-state

**Files:**
- Modify: `packages/renderer/src/archetypes/ArchetypeDetail.singletonEmpty.test.jsx`

- [ ] **Step 1: Добавить test**

```jsx
  it("creator с particles.conditions на entity-alias — viewer видит CTA на empty-state", () => {
    // top_up_wallet_by_card имеет conditions вида `wallet.userId = me.id` в реальном
    // freelance; fixture без них. Добавляем condition в рантайме:
    const intentWithCond = {
      ...TOP_UP_INTENT,
      particles: {
        ...TOP_UP_INTENT.particles,
        conditions: ["wallet.userId = me.id"],
      },
    };
    renderDetail({ intents: { top_up_wallet_by_card: intentWithCond } });
    // Condition ссылается на `wallet.` (alias из entities) — пропущена, target ещё нет.
    expect(screen.getByRole("button", { name: /пополнить/i })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Запустить**

Run: `pnpm --filter @intent-driven/renderer test -- ArchetypeDetail.singletonEmpty 2>&1 | tail -10`
Expected: 4 passed.

- [ ] **Step 3: Commit**

```bash
git add packages/renderer/src/archetypes/ArchetypeDetail.singletonEmpty.test.jsx
git commit -m "test(renderer): conditions на entity-alias пропускаются на empty-state"
```

---

## Task 8: Test 5 — role-label permittedFor фильтрует

**Files:**
- Modify: `packages/renderer/src/archetypes/ArchetypeDetail.singletonEmpty.test.jsx`

- [ ] **Step 1: Добавить test**

```jsx
  it("permittedFor role-label скрывает CTA от другой роли", () => {
    const intentForExecutor = {
      ...TOP_UP_INTENT,
      permittedFor: "executor",  // role-label (не owner-field, нет суффикса Id)
    };
    renderDetail({
      intents: { top_up_wallet_by_card: intentForExecutor },
      viewer: { ...CUSTOMER, role: "customer" },
    });
    expect(screen.getByText(/ещё не создан/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /пополнить/i })).not.toBeInTheDocument();
  });

  it("permittedFor owner-field (executorId) НЕ фильтрует на empty-state (target нет)", () => {
    const intentWithOwnerField = {
      ...TOP_UP_INTENT,
      permittedFor: "executorId",
    };
    renderDetail({ intents: { top_up_wallet_by_card: intentWithOwnerField } });
    expect(screen.getByRole("button", { name: /пополнить/i })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Запустить full suite**

Run: `pnpm --filter @intent-driven/renderer test -- ArchetypeDetail.singletonEmpty 2>&1 | tail -10`
Expected: 6 passed (2+2+1+1).

- [ ] **Step 3: Запустить весь renderer-suite для regression-проверки**

Run: `pnpm --filter @intent-driven/renderer test 2>&1 | tail -10`
Expected: baseline (из Task 1 Step 4) + 6 новых = total count.

- [ ] **Step 4: Запустить весь monorepo test**

Run: `pnpm -w test 2>&1 | tail -15`
Expected: total baseline + 6 green.

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/archetypes/ArchetypeDetail.singletonEmpty.test.jsx
git commit -m "test(renderer): permittedFor policy — role-label фильтрует, owner-field нет"
```

---

## Task 9: Changeset + финальная проверка

**Files:**
- Create: `.changeset/singleton-empty-creator.md`

- [ ] **Step 1: Создать changeset**

```bash
mkdir -p .changeset
cat > .changeset/singleton-empty-creator.md <<'EOF'
---
"@intent-driven/renderer": patch
---

ArchetypeDetail: при singleton-detail без target рендер creator-intent CTA под
EmptyState. Закрывает freelance backlog §3.6 — my_wallet_detail у customer без
Wallet больше не dead-end, top_up_wallet_by_card доступен через IntentButton.
EOF
```

- [ ] **Step 2: Build sanity check**

Run: `pnpm --filter @intent-driven/renderer build 2>&1 | tail -10`
Expected: build succeeds, `dist/` обновлён.

- [ ] **Step 3: Commit changeset**

```bash
git add .changeset/singleton-empty-creator.md
git commit -m "changeset: renderer patch — singleton empty-state creator"
```

- [ ] **Step 4: Push + PR**

```bash
git push -u origin feat/singleton-empty-creator
gh pr create --title "feat(renderer): singleton empty-state рендерит creator-intent CTA" --body "$(cat <<'EOF'
## Summary

В \`ArchetypeDetail\` при \`!target && projection.singleton\` рендер creator-intent CTA под \`<EmptyState>\`. Закрывает freelance \`idf/docs/sdk-improvements-backlog.md\` §3.6 ⛔ P0 — \`my_wallet_detail\` у customer без Wallet больше не dead-end.

## Changes

- \`packages/renderer/src/archetypes/ArchetypeDetail.jsx\` — helper \`findCreatorIntent\` + render CTA через \`IntentButton\` в singleton-empty-branch.
- \`packages/renderer/src/archetypes/__fixtures__/singletonEmpty.js\` — test fixture.
- \`packages/renderer/src/archetypes/ArchetypeDetail.singletonEmpty.test.jsx\` — 6 unit-тестов.

## Policy

- creator = intent с \`α:"add"\` + \`creates===mainEntity\` (fallback на \`particles.effects\` для случаев где \`creates\` опущен).
- \`particles.conditions\` ссылающиеся на \`entities\` alias — пропускаются (target отсутствует).
- \`permittedFor\` с owner-field суффиксом (\`customerId\`/\`executorId\`) — пропускается; role-label фильтрует по \`viewer.role\`.
- Multiple creators: рендерится первый matching в declaration-order.

## Test plan

- [x] 6 new unit tests green
- [x] Renderer suite no-regression
- [x] Monorepo \`pnpm test\` green
- [x] Build passes

## Related

- Design: \`docs/design/2026-04-20-singleton-empty-creator-design.md\`
- Freelance backlog: \`idf/docs/sdk-improvements-backlog.md\` §3.6
EOF
)"
```

- [ ] **Step 5: Записать PR URL для итога**

---

## Self-Review

**1. Spec coverage:**
- Design §«Discovery creator-intent»: `findCreatorIntent` → Task 4 Step 2 ✅
- Design §«Рендер»: EmptyState + IntentButton → Task 4 Step 3 ✅
- Design §«Conditions evaluation»: entity-alias skip policy → Task 4 Step 2 + Task 7 ✅
- Design §«permittedFor»: owner-field vs role-label → Task 4 Step 2 + Task 8 ✅
- Design §«Multiple creators (MVP: первый)»: declaration-order iteration → Task 4 Step 2 (`for...of Object.entries`) ✅
- Design §«Тесты» 1-5 → Tasks 3, 5, 6, 7, 8 ✅
- Design §«Changeset»: Task 9 ✅

**2. Placeholder scan:** нет TBD/TODO, все steps содержат конкретный код.

**3. Type consistency:** `findCreatorIntent` возвращает `{ id, spec }` или `null` во всех use-sites. `IntentButton` props `intentId/spec/ctx/variant` — при несоответствии Task 4 Step 4 fail-mode указан.

**4. Ambiguity:** `IntentButton` props могут отличаться — Task 4 Step 1 предписывает проверить сигнатуру до использования, fail-mode в Step 4.
