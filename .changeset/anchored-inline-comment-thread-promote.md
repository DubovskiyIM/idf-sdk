---
"@intent-driven/core": minor
---

patterns: promote `anchored-inline-comment-thread` candidate → stable (idf §13.17 first real promote).

Comment sub-entity с FK на mainEntity, имеющий `anchorRange` field и `resolved` boolean — рендерится в **двух band'ах**: anchored thread (highlight + side-rail bubble) и unanchored aggregate (footer-секция «Page comments»).

**Apply** (semantic, не marker-only): detect Comment-like entity через `findCommentLikeEntity(ontology, mainEntity)`, эмиттит 2 overlay entries с stable keys (`inline-comment-anchored__<entity>` и `inline-comment-unanchored__<entity>`), source markers, idempotent.

**Trigger**: matches Page-like entity с Comment FK + `anchorRange` (или `anchor`/`anchorPath`/`rangeRef`/`selectionRef`) + `resolved: boolean`.

**Source**: 4 product evidence (Confluence inline-comments, Google Docs side-rail, Notion inline thread, Figma comment-pins). Counterexample: Messenger flat threads.

**Falsification**: shouldMatch confluence/page_detail; shouldNotMatch messenger/sales/delivery (нет anchor).

**Stable pattern count: 44 → 45.**

Это первый real candidate→stable promote сделанный через **idf-on-idf мета-домен** workflow:
1. researcher эмиттит candidate JSON
2. triage scoring + apply-synthesizer (marker-only) — host §13.17 opt-c
3. semantic apply вручную написан (этот PR — opt-a manual demo)
4. promotion intent в meta-домене → /api/document/meta/promotion_queue
5. ship_pattern_promotion с этим SDK PR URL → меняет status в Φ → meta-compile patches `pattern-bank/PROMOTIONS.md`

Closes idf §13.17 на одном паттерне (proof-of-concept).

12 новых tests, 1930/1930 passed.
