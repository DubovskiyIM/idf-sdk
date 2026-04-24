---
"@intent-driven/core": minor
---

Fix G-K-26 (Keycloak post-final): hierarchy-tree-nav был промоушен
слишком aggressively — match'ился на любой FK-chain ≥3 уровней
(e-commerce Category→Product→LineItem, Realm→Client→ClientScope,
Workflow→Node→NodeResult), и `structure.apply` ВСЕГДА инжектил
treeNav в `slots.sidebar` без author-signal.

**Тightening (b)** — trigger требует **realный hierarchy signal**:
- Self-reference: поле с `references === entity` (parentId, managerId,
  replyToId) — настоящие nested-records того же типа, ИЛИ
- Explicit `entity.hierarchy: true` declaration

Старое sub-entity-exists requires заменено на `self-reference-or-explicit`.
Новый schema-kind в `VALID_KINDS`.

**Opt-in apply (c)** — match emits witness, но `structure.apply`
инжектит treeNav в sidebar **только если**:
- `ontology.features.hierarchyTreeNav: true` (domain-wide), ИЛИ
- `projection.patterns.enabled.includes("hierarchy-tree-nav")` (per-projection)

Без author opt-in apply NO-op (witness still emitted в matchedPatterns).

**Falsification обновлён:**
- `shouldMatch`: filesystem (Folder.parentId), groups (Group.parentId),
  explicit hierarchy:true
- `shouldNotMatch`: workflow без self-ref, e-commerce category-product,
  Keycloak Realm→Client→Scope (was over-matched до G-K-26)

Discovered в Keycloak dogfood-спринте 2026-04-23 — treeNav-mess в
sidebar когда Realm не имеет realm.parentId (independent CRUD entities,
не recursive). Также гасит false-positive matches в любом домене с
deep FK-chain без настоящей иерархии.

9 unit-tests + falsification обновлён + core suite 1293/1293 green.
