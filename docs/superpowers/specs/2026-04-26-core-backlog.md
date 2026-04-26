# Backlog ядра IDF — 2026-04-26

> **Контекст:** разбор внешних архитектурных предложений (7 «дыр») против реального состояния SDK на 2026-04-26 (`@intent-driven/core@0.78.0`, `@intent-driven/renderer@0.57.0`, `@intent-driven/engine@0.3.0`). 5 направлений приняты в backlog; 2 отклонены как преждевременные/устаревшие.

## Сводка приоритезации

| # | Направление | Приоритет | Тип | Effort | Зависимости |
|---|---|---|---|---|---|
| A1 | Incremental fold + structural snapshots | P0 | semver-safe perf | ~5 PR | — |
| A2 | Joint salience + slot assignment | P0 | алгоритмика R3 | ~4 PR | — |
| A3 | Causal Φ: vector clocks + commute-rules | P1 | формат + schema | ~6 PR | §2.8 (Φ schema-versioning) |
| A4 | Modality-specific pattern banks | P1 | accumulative | ~8-10 PR | A1 (опц.) |
| A5 | Adapter capability constraint matching | P2 | diagnostics | ~3-4 PR | — |

**Отклонено:**
- ~~ManualUI как named pattern с boundary contracts~~ — на 2026-04-26 ManualUI остался только в `idf/src/domains/workflow/ManualUI.jsx` (1/14 доменов, canvas archetype, legitimate host-extension). Формализация overkill.
- ~~Pattern bank как category с partial order~~ — N=37 stable не насыщает namespace; bites при N≥100. Возврат после A4 если bank вырастет до 70+.

---

## A1. Incremental fold + structural snapshots

**Приоритет:** P0 · semver-safe оптимизация представления.

### Проблема
`fold(Φ)` пересчитывает мир с нуля каждый раз: `causalSort(effects)` → линейный `applyEffect`. На больших Φ (≥10K confirmed effects) — линейная деградация latency для каждого re-render. Production-tenants Fold с многомесячной историей упрутся в это до того, как остальные дыры начнут bites.

### Текущее состояние (audit 2026-04-26)
- `packages/core/src/fold.js:41` — `fold(effects, typeMap)`: `causalSort(effects)` + linear `for (ef of sorted) applyEffect(ef)`.
- `packages/core/src/causalSort.js:16` — топосорт по `parent_id` + tie-break по `created_at`.
- `applyPresentation` отдельно (Π-эффекты) — но это не snapshot mechanism.
- `@intent-driven/engine@0.3.0` уже extracted Φ-lifecycle (`fold` + `proposed/confirmed/rejected`); правильное место для snapshot API.

### Подход
Snapshot = закэшированный `world_k = fold(Φ[0..k])` плюс метаданные `{ lastEffectId, lastCreatedAt, count, hash }`. Семантика: `fold(Φ[0..n]) === foldFromSnapshot(snapshot_k, Φ[k+1..n])` для любого `0 ≤ k ≤ n`.

API в `@intent-driven/engine`:
```js
createSnapshot(effects, typeMap?) → Snapshot
foldFromSnapshot(snapshot, deltaEffects, typeMap?) → World
fold(effects, { snapshot? }) → World  // back-compat: без snapshot — как раньше
```

Эффекты — это morphism'ы над world, и они формируют моноид (identity = `{}`, composition = sequential apply). Это даёт алгебраическую гарантию: snapshot_k ⊕ delta = full_fold над тем же префиксом.

### Stretch (Phase 2, не входит в первый PR)
- **Scoped fold per role:** `foldForViewer(snapshot, delta, viewer)` — применяет только эффекты, затрагивающие view роли (intersection с `filterWorldForRole`).
- **Auto-checkpoint:** runtime сам решает, когда взять snapshot (e.g. каждые 1000 confirmed effects).

### Ключевые вопросы
1. **Где хранятся snapshot'ы?** В первом подходе — in-memory кэш в host runtime; persistent storage — отдельный backlog item (после M1.x runtime bridge).
2. **Invalidation при retroactive Φ:** что делать, если `effect.id < snapshot.lastEffectId` поступает позже (rejected → confirmed transition без изменения id)? Решение: snapshot.hash включает sorted ids префикса; любая mutation invalidate'ит.
3. **Совместимость с `causalSort`:** snapshot берётся над линеаризованным префиксом, не над DAG. Если parent-child пересекают snapshot boundary, child эффект пере-сортируется в delta. Конкретно: snapshot хранит `lastEffectId`, delta = эффекты с created_at ≥ snapshot.lastCreatedAt; causalSort применяется к delta → re-applied на snapshot world.

### Success criteria
- `foldFromSnapshot(s, delta)` ≡ `fold(allEffects)` для любого split (vitest property test, ≥100 random splits).
- Бенчмарк: `fold(10000 effects)` vs `foldFromSnapshot(snapshot_9000, last_1000)` — ≥5× speedup на host machine (vitest `bench`).
- Backward-compat: `fold(effects)` без options даёт тот же world что core@0.78.0 (regression suite).

### Implementation plan
См. `docs/superpowers/plans/2026-04-26-incremental-fold-snapshots.md` (write-out первого pull request'а).

---

## A2. Joint salience + slot assignment solver

**Приоритет:** P0 · алгоритмика R3.

### Проблема
Salience считает важность intents независимо. Slot assignment (внутри архетипа) размещает их по слотам. Эти задачи решаются последовательно — и результат: 31 tied intent в одном toolbar (sales/listing_detail), потому что salience всем дала одинаковый score, а layout не имел средства это знать заранее. 21 ручное решение в `salience-suggestions.md` — это уже labelled data, но используется как fallback, не как обучающий сигнал.

### Текущее состояние
- `packages/core/src/crystallize_v2/salience.js` — cost computation, изолирован.
- `packages/core/src/crystallize_v2/assignToSlotsCatalog.js`, `assignToSlotsDetail.js` — placement, изолированы.
- `packages/core/src/crystallize_v2/informationBottleneck.js` — Phase 2 weighted salience уже активна (sprint 2026-04-26, см. memory `project_salience_formalization_sprint.md`).
- Salience ladder: `salience desc → declarationOrder asc → alphabetical (last resort)`. Alphabetical-fallback baseline 19 → 0 во всех 10 доменах (sprint 2026-04-20). Ladder работает, но **не joint** — просто детерминированный tie-breaker.

### Подход
Билинейная задача назначения. `cost[intent_i][slot_s]` минимизировать суммарно:
```
cost(i, s) = -salience(i)               // выгода от high-salience
           + capacity_penalty(s, i)     // штраф за переполнение
           + conflict_penalty(i, s, S)  // штраф за конфликт с уже назначенными в s
           + ergonomic_penalty(i, s)    // CTA в footer плохо
```
Венгерский алгоритм O(n³) — для real domains (≤100 intents × ≤10 slots) <50ms. Constraint set из архетипа: `slot.maxItems`, `slot.requires`, `pattern.exclusivity`.

Calibration data:
- `salience-suggestions.md` (21 ручное решение) — pairwise preferences `intent_i ≻ intent_j в slot_s`.
- 17 ручных `salience: "primary"` аннотаций — anchored examples.

### Ключевые вопросы
1. **Где живёт cost function?** Новый модуль `packages/core/src/crystallize_v2/jointSolver.js` или расширение `salience.js`?
2. **Взаимодействие с `applyStructuralPatterns` (фаза 3d):** patterns могут override slot assignment. Решение: solver работает ДО patterns; patterns post-process.
3. **Backward-compat:** для старых tied intents joint solver должен давать тот же результат, что declaration-order. Регрессия — 4 open items из salience sprint.
4. **Warning-сигнал:** если задача ill-conditioned (no feasible assignment), выдавать witness `basis: "ill-conditioned"` с предложением «split projection».

### Success criteria
- 0 alphabetical-fallback witness'ов во всех 11 доменах (после ladder уже 0; не ухудшаем).
- На sales/listing_detail toolbar: 31 tied intent → детерминированное распределение по slot'ам без ties.
- Бенчмарк: solver на real-domain max (sales 225 intents, 10 slots) <100ms.
- Calibration unit test: solver воспроизводит 21 ручное решение из salience-suggestions.md.

### Implementation plan
TBD — отдельный document после approve master backlog.

---

## A3. Causal Φ: vector clocks + commute-rules в ontology

**Приоритет:** P1 · формат + schema. Гейтит multi-writer collaborative editing.

### Проблема
`causalSort` реализует топосорт по `parent_id` (parent → child). Это даёт partial-order **только** для связанных эффектов. Concurrent эффекты двух акторов без общего parent сортируются по `created_at` (wall-clock) — что есть произвольное упорядочение конфликтующих событий, без формальной семантики commute / conflict.

Multi-writer сценарии (collaborative editing freelance Deal двумя пользователями; offline-first messenger; agent + owner одновременно) сейчас без формального ответа: «что должно произойти». Manifesto v2 §10 декларирует World через fold/sort_≺, но `≺` де-факто дегенерирует в wall-clock.

Migration cost растёт с production Φ: до первого pilot'а с 10K+ Φ — расширение схемы дешёвое; после — миграция истории.

### Текущее состояние
- `Effect` shape: `{ id, parent_id, target, alpha, value, context, created_at, status }`. Нет vector clock / Lamport.
- Ontology: `intent.particles.effects[]` декларирует τ/α/target/value, но **не commute**.
- `idf-spec` (cross-stack repo) — фиксирует L1+L2 conformance; vector clocks как L3 направление.
- §2.8 Φ schema-versioning (memory `project_phi_versioning_open_gap.md`) — открытая P0-arch задача из external review 2026-04-26.

### Подход
1. **Vector clock на эффекте:** `effect.vc: Record<actorId, number>` (или Lamport `effect.lamport: number` как entry-level — обсудить).
2. **Ontology API:**
   ```js
   intent.particles.effects[i].commutes_with: "all" | "none" | intentId[]
   ```
   — декларация: «этот эффект коммутирует со всеми / ни с одним / с явным списком». Default: `"none"` (conservative).
3. **causalSort расширяется:**
   - Если concurrent эффекты A, B с `commutes_with` includes друг друга → любой порядок (assert idempotency через property test).
   - Если concurrent и не commute → conflict; вызывается `resolveConflict(A, B)` → новый эффект.
4. **Системный intent `resolve_conflict(effectIdA, effectIdB, resolution)`:** explicit разрешение через формат, как любое другое intent.
5. **Φ schema bump:** v1 (текущая) → v2 (с vc и commute_with). Через §2.8 Φ schema-versioning.

### Ключевые вопросы
1. **Vector clocks vs Hybrid Logical Clocks vs Lamport:** vector clocks даёт точный partial order, но размер растёт линейно с числом акторов; HLC — компромисс (Lamport + wall-clock); Lamport — минимально, но даёт total order, не partial. Решение: HLC для production (Cassandra/CockroachDB precedent).
2. **Storage:** где живут vc для существующего Φ? Migration: `lamport = i` для старых эффектов (порядок == created_at).
3. **UI exposure:** как показать conflict пользователю? Толстое предложение — overlay `<ConflictResolver>` поверх projection с двумя версиями + ResolveButton.
4. **Cross-stack consistency (§23 axiom 5):** все 4 reader'а должны видеть одинаковый conflict state.

### Зависимости
- §2.8 Φ schema-versioning — должна быть закрыта первой (это рамка для любых Φ-shape changes).
- A1 snapshots — желательно после, потому что snapshot нужно invalidate'ить при conflict resolution.

### Success criteria
- Property test: для любого pair `(A, B)` где `commutes_with` включает оба, `fold([A, B]) === fold([B, A])`.
- Conflict scenario test: два concurrent edits на одной сущности без commute → `resolve_conflict` intent появляется в proposed Φ.
- Cross-stack: idf-go/rust/swift проходят тот же conformance suite.

### Implementation plan
TBD — отдельный document после §2.8 closeout.

---

## A4. Modality-specific pattern banks

**Приоритет:** P1 · accumulative.

### Проблема
Manifesto v2 §1 декларирует четыре равноправные материализации (pixels / voice / agent-API / document). По факту:
- `crystallize_v2` artifact уже modality-agnostic (projection + archetype + slots) — это R3.
- НО pattern bank один общий, оптимизирован под pixel.
- `voiceMaterializer` инлайнит voice-specific behavior (top-3 brevity, money pronunciation) внутри материализатора, не как декларативные patterns.
- `documentMaterializer` инлайнит document-layout (sections, tables, signature) внутри материализатора.
- Agent API не имеет patterns вообще — JSON schema собирается ad-hoc.

Результат: voice/document quality ограничен hardcoded поведением материализатора; cross-modality consistency не проверяется на pattern level.

### Текущее состояние
- `packages/core/src/patterns/stable/{detail,catalog,cross,feed}` — 37 patterns, все pixel-targeted (slot.itemLayout, slot.emphasisFields).
- `packages/core/src/materializers/voiceMaterializer.js` — 30K+ LOC материализатор с встроенным top-3, brevity, SSML генерацией.
- `packages/core/src/materializers/documentMaterializer.js` — 20K+ LOC, встроенный pluralize, section grouping, table cellRenderer.
- Backlog §12.6 (notion field test, 2026-04-26) — «voice primary-field discovery» — частный случай этого направления.

### Подход
1. **Структура:**
   ```
   packages/core/src/patterns/{stable,candidate}/{shared,pixel,voice,document,agent}/
   ```
   — `shared/` для архетип-уровневых patterns (применимы во всех modality), modality-folder'ы — для specific.
2. **Voice patterns (initial 5-7):**
   - `turn-grouping` — сгруппировать intents в logical conversational turns.
   - `brevity-top-n` — top-3 для catalog, остальное «и ещё N» (сейчас инлайн).
   - `confirmation-prompt` — для `__irr.high` intents добавлять явный confirmation turn.
   - `ssml-emphasis` — primary witness читается с `<prosody>`, money с `<say-as interpret-as="currency">`.
   - `locale-aware-pluralize` — RU plurals (1 рубль, 2 рубля, 5 рублей).
3. **Document patterns (initial 5-7):**
   - `section-with-toc` — для длинных документов (>5 sections) генерировать TOC.
   - `footnote-on-witness` — `audit_trail` witness → footnote.
   - `signature-block` — для approval intents (compliance) формализовать signature section.
   - `multi-page-pagination` — table breaking.
4. **Agent patterns (initial 3-5):**
   - `schema-shape` — JSON schema из intent + ontology fields.
   - `batch-action` — group similar intents в bulk endpoint.
   - `dry-run-preview` — preflight check без commit.
5. **Materializer rewrite:** `voiceMaterializer` теперь applies voice-patterns (фаза analogous to pixel `applyStructuralPatterns`); `documentMaterializer` — document-patterns; agent endpoint generation — agent-patterns.

### Ключевые вопросы
1. **Pattern apply phase для voice/document/agent — где/когда?** В материализаторе, после `crystallize_v2` artifact, перед output rendering.
2. **Falsification fixtures для voice — как тестируются?** На структуре turns array, не на audio. `shouldMatch` — projection где паттерн ожидается; `shouldNotMatch` — где не ожидается.
3. **Cross-modality consistency check (§23 axiom 5):** один artifact → 4 modality output. Property test: information content одинаков (same primary witness in all 4).
4. **Воспроизводимость старого поведения:** voiceMaterializer/documentMaterializer старого образца должны быть accessible как `legacyVoice` / `legacyDocument` для regression baseline.

### Зависимости
- A1 snapshots — опционально (быстрее materialize при больших world).
- A4 само по себе independent от A2/A3.

### Success criteria
- 5+ voice patterns в `stable/voice/`, 5+ document patterns в `stable/document/`, 3+ agent patterns в `stable/agent/`.
- voiceMaterializer.js LOC сокращается на ≥40% (логика мигрирует в patterns).
- Cross-modality property test: для projection P и viewer V, primary witness `w_P_V` присутствует во всех 4 output'ах.
- Backlog §12.6 (notion voice primary-field discovery) — закрывается через `voice/primary-field-from-archetype` pattern.

### Implementation plan
TBD — отдельный document.

---

## A5. Adapter capability constraint matching

**Приоритет:** P2 · diagnostics.

### Проблема
Capability surface уже declarative (все 4 адаптера имеют `capabilities: { primitive: {...}, shell: {...}, interaction: {...} }`). Но fallback тихий: если projection требует capability X, а адаптер не поддерживает — renderer тихо использует degraded primitive без warning'а / witness'а.

Author не имеет средства узнать заранее, какой adapter подходит для projection; runtime degradation не сопровождается provenance.

### Текущее состояние
- 4 адаптера декларируют `capabilities`. Пример AntD: `primitive.chart.chartTypes: ["line","pie","column","bar","area"]`, `dataGrid.{sort,filter,pagination}: true`, `interaction.externalSelection: false`.
- `getCapability(adapter, path)` / `supportsVariant(adapter, kind, variant)` в renderer registry.
- Нет API для projection: «я требую chart.line, dataGrid.pagination, interaction.externalSelection».
- Нет matching: «projection P × adapter A → fit score / gaps».

### Подход
1. **Projection requires:**
   ```js
   projection.requires: {
     primitive: { chart: ["line"], dataGrid: ["sort"] },
     shell: { tabs: true },
     interaction: { externalSelection: true }
   }
   ```
2. **Static check:**
   ```js
   validateProjectionAgainstAdapter(projection, adapter) → {
     ok: boolean,
     gaps: [{ capability: "interaction.externalSelection", required: true, supported: false }]
   }
   ```
3. **Runtime warning:** `<ProjectionRendererV2>` при render проверяет, выводит `console.warn` + emits witness `basis: "capability-fallback"` с указанием fallback primitive.
4. **Adapter selection:** `selectAdapterForProjection(projection, adapters) → ranked` — для случая когда tenant выбирает adapter dynamically.

### Ключевые вопросы
1. **Auto-derivation `requires`:** можно ли вывести `projection.requires` из patterns + ontology? (Например, pattern `chart-line` → `requires.primitive.chart: ["line"]`.) Это превращает gap matching в полностью автоматическое.
2. **Capability versioning:** если adapter@1.4.0 добавил `chartTypes: ["scatter"]`, projection с `requires: chart: ["scatter"]` failed на adapter@1.3.0 — нужен min-version check.

### Зависимости
- Накатывается после A4 (modality patterns), потому что pattern → requires auto-derivation естественно ложится туда.

### Success criteria
- Projection с pattern `chart-line` автоматически декларирует `requires.primitive.chart: ["line"]`.
- При выборе adapter без поддержки — ProjectionRendererV2 эмитит witness + console.warn.
- `selectAdapterForProjection` возвращает ranked list для 4 bundled adapters на 14 доменах.

### Implementation plan
TBD — отдельный document.

---

## Не входит в backlog (отклонено)

### N1. ManualUI как named pattern с boundary contracts
**Причина:** на 2026-04-26 ManualUI остался только в `idf/src/domains/workflow/ManualUI.jsx` (1 из 14 доменов, canvas archetype для React Flow editor). Это legitimate host-extension через canvas archetype, не «escape hatch из формата». Формализация через witness'ы добавит overhead без выгоды.

**Когда вернуться:** если ManualUI появляется в 3+ доменах одновременно (signal: формату не хватает archetype'а / primitive'а).

### N2. Pattern bank как category с partial order
**Причина:** N=37 stable patterns не насыщает namespace. Конфликтов имён нет; неявная иерархия (archetype-индекс) пока достаточна.

**Когда вернуться:** при росте до ≥70 patterns или при первом конфликте имён в одном archetype.

---

## Меta

**Author:** ignatdubovskiy / Claude Opus 4.7
**Date:** 2026-04-26
**SDK baseline:** core@0.78.0, renderer@0.57.0, engine@0.3.0
**Source:** внешний review (7 «дыр») + аналитический разбор против актуального кода
**Tracking:** один `feat/core-backlog-2026-04-26` PR в idf-sdk (этот документ + plan для A1).
