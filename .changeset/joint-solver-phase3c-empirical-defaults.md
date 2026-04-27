---
"@intent-driven/core": minor
---

feat: joint solver Phase 3c' — empirical default slot models

Replace упрощённой Phase 2b модели в `getDefaultSlotsForArchetype` на
**empirical** model, извлечённую из existing `assignToSlots*` output на
16 доменах (idf/scripts/jointsolver-empirical-slots.mjs, дата 2026-04-27).

KEY CHANGES в `SLOTS_CATALOG/DETAIL/FEED`:

  catalog: hero+toolbar+context+fab → hero+toolbar+overlay
    Capacities: hero 1→2, toolbar 5, overlay 9 (NEW slot)
    context, fab — 0 observations → удалены

  detail: primaryCTA+secondary+toolbar+footer → primaryCTA+toolbar+overlay+footer
    Capacities: primaryCTA 3→10, toolbar 10→3, footer 3→35, overlay 9 (NEW)
    secondary — 0 observations → удалён

  feed: toolbar+context+fab → toolbar+overlay
    Capacities: toolbar 5, overlay 14 (NEW)
    context, fab — 0 observations → удалены

KEY INSIGHT (Phase 3a measurements): `overlay → toolbar` был top
divergence pattern (268/470 = 57% всех divergences). Добавление overlay
slot закрывает это structurally.

Slot order — declaration order служит stable tie-break для Hungarian
solver (Object.keys order). Order semantic: primary-candidate slots
first (hero/primaryCTA), затем toolbar, затем overflow (overlay/footer).

allowedRoles — inclusive defaults (все salience tiers + destructive
где empirically observed). Empirical observed roles были restrictive
(99% intents без explicit salience → all = navigation tier);
inclusive set accommodates explicit-salience annotations.

Tests updated:
  jointSolverBridge.test.js — 11/11 (slot keys + capacities)
  Все остальные tests — passing без изменений (1861/1861 core green)

Phase 3 validation pipeline:
  3a (idf #151): divergence dataset на 16 доменах — 5.9% agreement,
                470 divergent (28.1%), top pattern overlay → toolbar
  3b (idf #153): empirical model proposal
  3c' (этот PR): apply empirical в SDK
  3c'' (next): re-run divergence в host с empirical defaults — measure
               improvement (target: agreement 5.9% → 80%+)

Backlog: `docs/superpowers/specs/2026-04-26-core-backlog.md` § A2.
