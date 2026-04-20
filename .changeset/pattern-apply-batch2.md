---
"@intent-driven/core": minor
---

feat(patterns): `structure.apply` для `lifecycle-locked-parameters` + `bulk-action-toolbar`.

## lifecycle-locked-parameters.apply

Если entity имеет status-field с active-state (active/running/confirmed/captured/accepted), добавляет секцию `lockedParameters` в `slots.sections`:

```js
{
  id: "lockedParameters",
  title: "Параметры после активации",
  kind: "lockedParameters",
  entity: "Subscription",
  lockedWhen: "item.status === 'active'",
  fields: ["maxAmount", "scope", "endDate"],
  explainer: "Эти параметры фиксируются при активации и не могут быть изменены.",
  source: "derived:lifecycle-locked-parameters",
}
```

Locked-fields = targets всех replace-intents на `mainEntity.*` (кроме `status`). Renderer читает `lockedWhen`-выражение в runtime и переключает read-only view при match.

## bulk-action-toolbar.apply

Если в intents ≥2 `bulk_*`-prefix id, добавляет `slots._bulkMode` metadata:

```js
{
  enabled: true,
  actions: ["bulk_archive", "bulk_mark_read"],
  source: "derived:bulk-action-toolbar",
}
```

Renderer при `selection.length ≥ 1` активирует multi-select mode и показывает toolbar-bar с кнопками из `actions`.

Idempotent (existing `_bulkMode` не перезаписывается). Pure function.

## Тесты

- lifecycle-locked-parameters: 6 тестов (active-status detection + locked fields + idempotency + section preservation).
- bulk-action-toolbar: 5 тестов (≥2 bulk intents + id-prefix filter + idempotency).
- **1008 core passing** (+11 от 997).

## Прогресс roadmap

Было 14 оставшихся stable patterns без apply (после PR #134); стало **12**.

Следующие кандидаты: `vote-group`, `inline-search`, `antagonist-toggle`, `hero-create`, `phase-aware-primary-cta`, `composer-entry` (formalizaция), `discriminator-wizard`, `hierarchy-tree-nav`, `optimistic-replace-with-undo`, `keyboard-property-popover`, `global-command-palette`, `kanban-phase-column-board`.
