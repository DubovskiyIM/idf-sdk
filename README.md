# IDF SDK

Reusable npm packages для парадигмы Intent-Driven Frontend.

## Пакеты

- **@idf/core** — engine, fold, intentAlgebra, crystallize_v2

## Дальше (отдельные spec'и)

- `@idf/server` — validator, ruleEngine, agent layer
- `@idf/renderer` — V2Shell, archetypes, primitives
- `@idf/adapter-mantine` / `@idf/adapter-shadcn` / `@idf/adapter-apple`
- `@idf/canvas-kit` — Charts, GlassCard, Heatmap, MoodMeter

## Разработка

```bash
pnpm install
pnpm -r build
pnpm -r test
```

## Использование в эталонном приложении

В `idf/package.json`:
```json
{
  "dependencies": {
    "@idf/core": "file:../idf-sdk/packages/core"
  }
}
```

Тогда `npm install` в idf/ берёт пакет напрямую из dist/. После изменений в SDK:
```bash
cd ../idf-sdk/packages/core && pnpm build
cd ../../../idf && npm install --force
```

## Локальная публикация (опционально, через verdaccio)

```bash
# Запустить verdaccio
bash scripts/verdaccio-up.sh

# В другом терминале опубликовать
bash scripts/publish-local.sh
```

См. `../idf/docs/superpowers/specs/2026-04-14-sdk-extraction-design.md`.
