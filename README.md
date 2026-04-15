# IDF SDK

Reusable npm packages для парадигмы Intent-Driven Frontend.

## Пакеты

- **@intent-driven/core** — engine, fold, intentAlgebra, crystallize_v2, materializers (pixels/voice/agent-API/document), invariants, baseRoles, preapprovalGuard
- **@intent-driven/renderer** — ProjectionRendererV2, 7 архетипов, primitives (atoms/containers/chart/map/IrreversibleBadge), adapter registry с capability surface
- **@intent-driven/adapter-mantine** — corporate / data-dense
- **@intent-driven/adapter-shadcn** — handcrafted / doodle
- **@intent-driven/adapter-apple** — premium / visionOS-glass
- **@intent-driven/adapter-antd** — enterprise-fintech / dashboard
- **@intent-driven/canvas-kit** — SVG-утилиты для domain canvas

## Дальше (отдельные spec'и)

- `@intent-driven/server` — validator, ruleEngine, agent layer, timeEngine (Phase 3)

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

## CI

`.github/workflows/ci.yml` — на каждый PR и push в `main`:
- matrix по Node 20 и 22
- `pnpm install --frozen-lockfile`
- `pnpm -r build`
- `pnpm -r test`

Предпосылки: `pnpm-lock.yaml` всегда коммитится, `dist/` — нет (см. `.gitignore`).

## Версионирование и релиз (changesets)

Используется [`@changesets/cli`](https://github.com/changesets/changesets). Каждое публичное изменение сопровождается changeset-файлом.

### Workflow

```bash
# После изменения в пакете:
pnpm changeset
# Выбрать затронутые пакеты, тип бампа (patch/minor/major), написать summary.
# Создастся .changeset/<name>.md — закоммитить вместе с кодом.

git add .changeset/*.md
git commit -m "feat(core): ..."
git push
```

### Что делает release workflow

`.github/workflows/release.yml` на push в `main`:

1. Если в репо есть unreleased changesets → открывает/обновляет **Version PR** с бампом версий и сгенерированным CHANGELOG.md в каждом пакете.
2. Когда этот Version PR мержится → снова срабатывает; changesets уже применены → запускает `pnpm release` (`pnpm -r build && changeset publish`) и публикует затронутые пакеты в npm.

### Секреты GitHub

В `Settings → Secrets → Actions`:
- `NPM_TOKEN` — npm automation token с правом publish для scope `@intent-driven`

`GITHUB_TOKEN` выдаётся автоматически (permissions: contents/pull-requests в release.yml).

### Первая публикация в npm

Scope `@intent-driven` должен существовать в npm; организация — `intent-driven` либо `@intent-driven` как user-scope. Пакеты помечены `"publishConfig": { "access": "public" }`.

```bash
pnpm changeset                # создать changeset (minor для первого релиза)
# закоммитить, замержить в main
# GitHub Actions откроет Version PR → замержить
# после merge — автоматический publish
```

## Локальная публикация (опционально, через verdaccio)

```bash
bash scripts/verdaccio-up.sh    # запустить verdaccio
bash scripts/publish-local.sh   # опубликовать в локальный registry
```

См. `../idf/docs/superpowers/specs/2026-04-14-sdk-extraction-design.md`.
