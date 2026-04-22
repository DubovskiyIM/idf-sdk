---
"@intent-driven/enricher-claude": patch
---

Поддержать новый wire-format Claude CLI 2.1.x: `wrapper.structured_output` имеет приоритет над `wrapper.result`.

До этого fix'а `subprocess.js` читал только `wrapper.result ?? wrapper.content ?? stdout`. В Claude CLI 2.1.117 при `--json-schema` structured-ответ перемещён в `wrapper.structured_output` как уже-parsed object, а `result` становится пустой строкой. Enricher падал с `Structured response не JSON: ` на любом нетривиальном spec'е.

Fix: сначала проверяем `structured_output` (возвращаем как есть — это object), fallback на legacy `result`-строку. Backward-compat сохранён: старый CLI-формат продолжает работать.

Обнаружено в Gravitino dogfood-спринте 2026-04-22 (см. `idf/docs/backlog.md` §1.12).

Tests: +3 unit — structured_output happy-path, legacy-format fallback, non-object structured_output edge-case.
