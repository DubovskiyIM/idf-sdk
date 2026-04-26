---
"@intent-driven/core": patch
---

patterns: stable `key` для undoToast overlay entries (closes idf backlog §13.11).

`undo-toast-window.apply` и `optimistic-replace-with-undo.apply` генерили overlay entries без поля `key` — `validateArtifact` отвергал артефакт с `overlay entry missing "key"`. На host-V2Shell ошибка молча игнорировалась, но любая внешняя crystallize-pipeline (Studio, agent-API, meta-domain runtime-evaluate) ломалась.

Теперь обе apply-функции эмиттят `key: "undoToast__<intentId>"` — стабильный, deterministic, уникальный per intent. Идемпотентен.

Найдено через meta-домен (idf-on-idf): `crystallizeV2(salesIntents, ...)` логировал 8+ warnings на user_list / order_list / seller_profile / order_detail / my_order_list.
