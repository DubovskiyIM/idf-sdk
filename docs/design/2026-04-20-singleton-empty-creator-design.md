# Singleton Empty-State Creator-Toolbar — design

**Дата:** 2026-04-20
**Ветка:** `feat/singleton-empty-creator`
**Пакет:** `@intent-driven/renderer`
**Источник:** `idf/docs/sdk-improvements-backlog.md` §3.6 ⛔ P0 (добавлен 2026-04-20 при визуальной проверке freelance).

## Проблема

`packages/renderer/src/archetypes/ArchetypeDetail.jsx:75-105` делает early return с `<EmptyState>` при `!target && projection.singleton`. Никакой toolbar или creator-affordance не рендерится. Пользователь попадает в dead-end: видит «X ещё не создан / Создайте запись», но **кнопки создания нет**.

**Конкретный кейс.** freelance `my_wallet_detail` — R3b singleton (без idParam, owner-scoped). Customer без существующей Wallet-записи видит EmptyState, но `top_up_wallet_by_card` (α:"add", toolbar-intent) не доступен. Первый top-up — невозможен через UI без host-workaround'а.

Проблема усугубляется тем, что host не может фиксить декларативно: проекция derived (R3b), её toolbar тоже derived.

## Цель

Если `projection.singleton === true` и `!target`, SDK renderer находит **creator-intent** для `mainEntity` и рендерит его CTA ниже `<EmptyState>`. Получаем полный flow: пустой кошелёк → клик «Пополнить» → formModal → после submit запись существует, detail рендерится нормально.

## Дизайн

### Discovery creator-intent

В `ArchetypeDetail` doступен `ctx.intents` (через `useIntentContext` / prop chain). Для singleton-empty-state:

```js
function findCreatorIntent(intents, mainEntity, viewer) {
  return Object.entries(intents || {}).find(([id, intent]) => {
    if (intent.α !== "add") return false;
    const createsEntity = parseCreatesVariant(intent.creates)?.entity;
    if (createsEntity !== mainEntity) {
      // Fallback: intent реально мутирует mainEntity через particles.effects
      const targetsMain = (intent.particles?.effects || []).some(e => {
        const prefix = `${mainEntity.toLowerCase()}.`;
        return e.target === mainEntity.toLowerCase() + "s"  // collection add
            || e.target?.startsWith(prefix)                  // field replace
            || e.target === pluralize(mainEntity);
      });
      if (!targetsMain) return false;
    }
    // permittedFor filter
    if (intent.permittedFor && viewer?.role
        && !rolesPermitted(intent.permittedFor, viewer.role)) return false;
    return true;
  });
}
```

Particles.effects fallback покрывает случаи вроде `top_up_wallet_by_card` — intent `creates` опущен (backlog open item `creates !== mainEntity`), но effect replaces `wallet.balance` → targets main.

### Рендер

```jsx
if (!target) {
  if (projection?.singleton) {
    const creator = findCreatorIntent(ctx.intents, projection.mainEntity, ctx.viewer);
    return (
      <div className="idf-singleton-empty">
        <EmptyState
          icon="✨"
          title={`${entityName} ещё не создан`}
          hint="Создайте запись — она привяжется к вашему аккаунту."
        />
        {creator && (
          <div className="idf-singleton-empty__creator">
            <IntentButton
              intentId={creator[0]}
              spec={creator[1]}
              ctx={ctx}
              variant="primary"
            />
          </div>
        )}
      </div>
    );
  }
  // ... остальные empty-states (non-singleton) без изменений
}
```

### Conditions evaluation

`particles.conditions` обычно содержат guards вида `wallet.userId = me.id`. На empty-state `wallet` нет, eval упадёт. Политика:

- Conditions upon target'е (вроде `wallet.userId = me.id`) — пропускаются (не evaluated), т.к. target ещё не создан. Ownership после создания инжектится через OWNERSHIP_INJECT.
- Conditions без target-entity-reference (например `me.verified = true`) — evaluated нормально.

Heuristic: если condition ссылается на любую lowercase-главу entity из `particles.entities`, skip. Иначе eval.

### `permittedFor` / role-filter

Если intent имеет `permittedFor: "customerId"` / `"executorId"` — эти owner-keys не имеют смысла на empty-state (target'а нет). Политика: `permittedFor` на singleton-empty-state **игнорируется**, если value это owner-field name (как в freelance). Остаётся только `ctx.viewer.role` check через `rolesPermitted`, если `permittedFor` это role-label.

Уточнение — в тестах.

### Multiple creators

Для singleton обычно один creator-intent, но возможны случаи (например, «пополнить картой» / «пополнить криптой» — два intent'а). Rendering policy: **первый matching в declaration order** (консистентно с `salience` declaration-order tiebreak, core@0.27+). При capacity>1 — опционально `<CollapseToolbar>` (если их 2+).

**MVP:** первый matching. Collapse — follow-up.

## Файлы

- **Modify:** `packages/renderer/src/archetypes/ArchetypeDetail.jsx` — добавить `findCreatorIntent` helper + rendering block.
- **Modify:** `packages/renderer/src/archetypes/ArchetypeDetail.test.jsx` (новый или existing) — 3-4 теста.
- **Test fixtures:** `packages/renderer/src/archetypes/__fixtures__/singleton-empty.js` — миниатюрная ontology (Wallet + top_up intent).

## Тесты

1. **Wallet singleton, customer без Wallet, one creator-intent** → `EmptyState` + `IntentButton(top_up_wallet_by_card)` рендерятся.
2. **Singleton, no creator intent exists** → только `EmptyState` (no-regression existing behavior).
3. **Creator с `permittedFor:"customerId"` на empty-state** → кнопка видна customer-viewer'у (permittedFor не гейтит без target).
4. **Creator с `particles.conditions:["user.verified = true"]`, viewer unverified** → кнопка скрыта.
5. **Non-singleton detail без target** → без изменений (fallback к existing EmptyState «Выбери элемент из списка»).

## Changeset

`.changeset/*.md`:
```
---
"@intent-driven/renderer": patch
---

ArchetypeDetail: рендер creator-intent CTA под EmptyState для singleton-проекций
без существующей записи. Закрывает freelance-gap §3.6 (my_wallet_detail dead-end).
```

## Не в scope

- `α:"add"` creator-intent **не в toolbar основной проекции** (например если creator — это `composerEntry` для feed) — отдельный сценарий.
- `CollapseToolbar` для multiple creators — MVP рендерит первый.
- Host-feature empty-state customization (`projection.emptyState: { illustration, title }`) — отдельный sub-project C2 из декомпозиции.
- Unified EmptyState для всех non-singleton detail сценариев — оставляем existing behavior.
