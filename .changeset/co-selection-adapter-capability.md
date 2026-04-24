---
"@intent-driven/renderer": minor
"@intent-driven/adapter-antd": patch
"@intent-driven/adapter-mantine": patch
"@intent-driven/adapter-apple": patch
"@intent-driven/adapter-shadcn": patch
---

feat(adapters): `capabilities.interaction.externalSelection` + `useCoSelectionEnabled`

Третий из трёх promotion-gate'ов для `bidirectional-canvas-tree-selection`
(candidate → stable). Adapter opt-in capability флаг + canonical gate hook
для canvas/map-primitives.

**Adapter declaration (все 4 bundled):**

```js
capabilities: {
  interaction: { externalSelection: false },  // opt-in когда появится canvas
  // ...
}
```

Все 4 bundled-адаптера (antd/mantine/apple/shadcn) декларируют `false` —
нет native canvas с selection-прокидыванием. Custom адаптеры с canvas-
primitive поднимают флаг в `true` для включения bidirectional-binding.

**Renderer gate hook:**

```jsx
import { useCoSelectionEnabled } from "@intent-driven/renderer";

function CanvasPeer() {
  const enabled = useCoSelectionEnabled();
  // true iff: CoSelectionProvider смонтирован +
  //           adapter.capabilities.interaction.externalSelection === true
  if (!enabled) return <CanvasReadonly />;  // fallback
  return <CanvasBidirectional />;           // full co-selection
}
```

Unknown capability (provider есть, но adapter не декларирует) → `false`:
co-selection — opt-in, не opt-out (безопасно по умолчанию).

9 новых тестов в `coSelection.test.jsx`: capability gate (provider-only,
capability-only, both, unknown, missing-capabilities), bundled-adapter
opt-out (×4). Full renderer: 560/560, adapter-suites: 60/60 зелёные.
