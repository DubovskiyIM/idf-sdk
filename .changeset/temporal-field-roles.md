---
"@intent-driven/core": minor
---

4 новые temporal field roles + consumers (closes «белое пятно для дат»).

**Новые роли в `inferFieldRole`** (priority: timestamp > deadline > scheduled > occurred):

- `timestamp` — audit/meta: `createdAt`, `updatedAt`, `deletedAt`, `modifiedAt`, `lastSeenAt`, `archivedAt`. Renderer: мелкий серый текст.
- `deadline` — target date, может быть overdue: `due*`, `deadline*`. Renderer: badge в monitoring/triage.
- `scheduled` — планируемое будущее: `scheduled*`, `appointment*`, `meeting*`, `visitDate`, `eventDate`, `sessionAt`. Renderer: secondary (countdown-ready).
- `occurred` — прошедшее событие: past-tense verbs (`started*`, `completed*`, `finished*`, `closed*`, `posted*`, `ended*`, `administered*`, `recorded*`, `shipped*`, `opened*`, `logged*`, `received*`), `record*`, `birthDate`. Renderer: secondary (timeline-anchor).

**Breaking (minor):** `timer` regex сужен с `/end|deadline|expir/` до `/^(expir|countdown)/` + `/Until$/`. Поля `deadline*` переезжают с `timer` на `deadline`. Affected fields:

- `auctionEnd`, `endAt`, `endDate` (без past-tense `ed`) → раньше `timer`, теперь `info` fallback. Workaround: explicit `fieldRole: "timer"`.
- `deadline` → раньше `timer`, теперь `deadline` (badge вместо Timer-countdown).
- `expiresAt`, `expiryDate`, `validUntil` → остаются `timer`.

Domains в idf/ с `deadline`-полями (invest.Goal, lifequest.Goal, planning.Poll) получают новое поведение: вместо Timer-countdown — badge.

**Consumers:**

- `strategy.js` — monitoring: `deadline` → badge, `scheduled`/`timestamp` → secondary. triage: `deadline` → badge.
- `deriveShape.isDateField` — делегирует в `inferFieldRole` (удалён локальный `DATE_FIELD_HINTS`).

Witness-labeling (§15 v1.10) — каждое temporal-правило эмитит `reliability: "heuristic"` + `pattern: "temporal:*"`. Стабильные grouping keys, готовые к промоции в `ontology.fieldPatterns` (§26 zazor #3 phase 2).

**Philosophy alignment:** §4 (темпоральные предикаты — deadline/scheduled готовы к `now`-relative conditions), §15 (pattern promotion), §21 (Timer primitive breaking change задокументирован).

**Out of scope v0.12:** `checkpoint` role, `duration` (start+end pair), `RelativeTime`/`DeadlineBadge` primitives, выделение Events/Deadlines секций в detail. См. `docs/superpowers/specs/2026-04-18-temporal-field-roles-design.md`.
