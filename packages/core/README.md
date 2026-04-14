# @idf/core

**Intent-Driven Frontend — core engine, fold, intent algebra, crystallizer.**

Парадигма IDF: UI выводится из формального описания пользовательских намерений. Этот пакет содержит core-логику без UI-зависимостей.

См. [манифест IDF v1.5](https://github.com/ignatdubovskiy/idf/blob/main/docs/manifesto-v1.5.md).

## Установка

```bash
npm install @idf/core
```

Peer dependency: `react@>=18`.

## Quick start

```js
import { useEngine, crystallizeV2 } from "@idf/core";

const domain = {
  INTENTS: { /* ... */ },
  PROJECTIONS: { /* ... */ },
  ONTOLOGY: { /* ... */ },
  DOMAIN_ID: "my-domain",
  buildEffects: (intentId, ctx, world, drafts) => { /* ... */ },
};

function App() {
  const { world, exec } = useEngine(domain);
  return <button onClick={() => exec("create_thing", { name: "Foo" })}>+</button>;
}

const artifact = crystallizeV2(
  domain.INTENTS, domain.PROJECTIONS, domain.ONTOLOGY, domain.DOMAIN_ID,
);
```

## Public API

| Категория | Exports |
|-----------|---------|
| **Engine** | `useEngine` |
| **Fold** | `fold`, `foldDrafts`, `applyPresentation`, `buildTypeMap`, `filterByStatus`, `causalSort` |
| **Intent algebra** | `computeAlgebra`, `computeAlgebraWithEvidence`, `normalizeEntityFromTarget` |
| **Composition** | `checkComposition` |
| **Integrity** | `checkIntegrity` |
| **Conditions** | `parseCondition`, `parseConditions` |
| **Crystallize** | `crystallizeV2`, `validateArtifact` |
| **Forms** | `generateEditProjections`, `findReplaceIntents`, `buildFormSpec` |
| **Archetypes registry** | `registerArchetype`, `prependArchetype`, `selectArchetype`, `getArchetypes` |
| **Constants** | `PARTICLE_COLORS`, `ALPHA_LABELS`, `LINK_COLORS`, `SLOT_STATUS_COLORS`, `BOOKING_STATUS_COLORS` |

## Связанные пакеты (TBD)

- `@idf/server` — validator, ruleEngine, agent layer
- `@idf/renderer` — V2Shell, archetypes, primitives, controls
- `@idf/adapter-mantine` / `@idf/adapter-shadcn` / `@idf/adapter-apple`
- `@idf/canvas-kit` — Charts, GlassCard, Heatmap, MoodMeter

## Build & test

```bash
pnpm install
pnpm build      # ESM + CJS + .d.ts
pnpm test       # 238 unit-тестов
```

## Версионирование

`0.x` — unstable API, breaking changes возможны без bump major. После 2-3 successful integrations → `1.0.0`.

## Лицензия

[MIT](../../LICENSE)
