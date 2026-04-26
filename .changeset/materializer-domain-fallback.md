---
"@intent-driven/core": patch
---

fix(materializers): §12.4 — domain fallback в voice/document

Закрывает SDK backlog §12.4 (Notion field-test). Без `opts.domain`:

**Раньше**:
- voice: `meta.domain: ""`, system prompt `для домена «»`, subtitle `домен `
- document: `meta.domain: ""`, subtitle `Домен: `

**Теперь**:
- voice / document: `resolvedDomain = opts.domain || opts.ontology?.name || opts.ontology?.domain || ""`
- При empty fallback — domain нигде не упоминается (subtitle empty, system prompt без `для домена «...»`).

Backwards-compatible: `opts.domain` имеет приоритет над `opts.ontology`. Существующее поведение при non-empty `opts.domain` не изменилось.

Tests: 7 новых (`packages/core/src/materializers/domainFallback.test.js`) — все 4 кейса для voice + 3 для document. Полный core-suite 1763/1763.
