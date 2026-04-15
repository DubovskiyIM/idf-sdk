# IDF SDK

Reusable npm packages для парадигмы Intent-Driven Frontend.

## Пакеты

- **@intent-driven/core** — engine, fold, intentAlgebra, crystallize_v2

## Дальше (отдельные spec'и)

- `@intent-driven/server` — validator, ruleEngine, agent layer
- `@intent-driven/renderer` — V2Shell, archetypes, primitives
- `@intent-driven/adapter-mantine` / `@intent-driven/adapter-shadcn` / `@intent-driven/adapter-apple`
- `@intent-driven/canvas-kit` — Charts, GlassCard, Heatmap, MoodMeter

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
    "@intent-driven/core": "file:../idf-sdk/packages/core"
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
