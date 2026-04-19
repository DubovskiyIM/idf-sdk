# IDF SDK

Reusable npm packages для парадигмы Intent-Driven Frontend.

![IDF Studio — авторская среда](docs/screenshots/idf-studio.png)

## Пакеты

- **@intent-driven/core** — engine, fold, intentAlgebra, crystallize_v2, materializers (pixels/voice/agent-API/document), invariants, baseRoles, preapprovalGuard, **Pattern Bank** (28 stable + 127 candidate), matching-score adapter resolution
- **@intent-driven/renderer** — ProjectionRendererV2, 7 архетипов, primitives (atoms/containers/chart/map/IrreversibleBadge/Countdown/UndoToast/AuthForm), AdapterProvider (Context + hooks), `pickAdaptedComponent` со scoring
- **@intent-driven/adapter-mantine** — corporate / data-dense
- **@intent-driven/adapter-shadcn** — handcrafted / doodle
- **@intent-driven/adapter-apple** — premium / visionOS-glass
- **@intent-driven/adapter-antd** — enterprise-fintech / dashboard
- **@intent-driven/canvas-kit** — SVG-утилиты для domain canvas

## IDF Studio

Авторская среда (§27 манифеста) для проектирования онтологии, намерений и проекций. Показывает один артефакт с шести сторон.

### Граф онтологии
Entities / roles / references визуально, с подсветкой ownership и ranges.

![Граф онтологии](docs/screenshots/idf-studio-graph.png)

### Живой прототип
Проекции рендерятся прямо в среде — кристаллизатор выполняется на каждое изменение intents/ontology.

![Прототип](docs/screenshots/idf-studio-prototype.png)

### Pattern Inspector
Preview/Commit режим для stable Pattern Bank. Подсвечивает derived-слоты через `PatternPreviewOverlay` и показывает explanation каждого match/near-miss.

![Pattern Bank Inspector](docs/screenshots/idf-studio-patterns.png)

### Chat-пилот с Claude
Claude haiku/sonnet/opus через subprocess; system prompt со спецификацией кешируется (>90% скидка). Генерирует и уточняет intents через разговор.

![Chat-пилот](docs/screenshots/idf-studio-chat.png)

### Алгебра намерений
Визуализация связей ▷ ⇌ ⊕ ∥ (causal / antagonistic / merge / parallel). Помогает видеть lifecycle-phases и причинные цепочки.

![Алгебра](docs/screenshots/idf-studio-algebra.png)

### Checks & invariants
Real-time статус 6-kind global invariants (role-capability / referential / transition / cardinality / aggregate / expression) + integrity-правил.

![Инварианты](docs/screenshots/idf-studio-integrity.png)

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
