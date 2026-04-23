---
"@intent-driven/core": patch
---

R8 absorbHubChildren: best-parent heuristic для multi-parent child'ов (G-K-11).

Раньше child-catalog с FK на нескольких parent'ов absorbed в первого встреченного parent'а (зависит от порядка `Object.entries(detailByEntity)`). Для synthetic path-FK это даёт случайные hierarchy: `User.list` мог уйти в `role_detail` вместо `realm_detail` просто потому, что Role processed earlier.

Новый алгоритм — «hubbier wins»:
1. Собираем initial candidates per parent, parent'ы с <`HUB_MIN_CHILDREN` отбрасываются до competition
2. Для каждого child-catalog выбираем parent'а с maximum candidates.length. Tiebreak — alphabetical по parentEntity (stable)
3. Parent'ы, потерявшие child'ов ниже threshold после redistribution, skipped — их child'ы остаются root-catalog'ами (честнее, чем half-absorbed hub)

Эффект: для Keycloak `user_list.absorbedBy = realm_detail` (Realm — 10 children) вместо `role_detail` (Role — 1 child после redistribution). Nav hierarchy семантически корректна.

Author-override `projection.absorbed: false` и single-parent случаи работают как раньше (back-compat).
