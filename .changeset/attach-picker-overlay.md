---
"@intent-driven/renderer": minor
---

`RowAssociationChips` теперь overlay-aware для attach-picker flow.

При клике на «+» в chip-блоке проверяется `ctx.artifact.slots.overlay` на наличие `overlay_<attachIntentId>`. Если кристаллизатор создал overlay (CAPTURE_RULES matches `entityPicker` — т.е. intent.creates=Junction + non-creates entity вне route scope), открывается picker через `ctx.openOverlay`. Пользователь выбирает other-entity, `EntityPicker` сам exec'ит intent с полным payload.

Если overlay для intent'а не создан — fallback на прямой `ctx.exec(attachIntent, {foreignKey: item.id})` (back-compat с существующими поведением). Поведение `detach` (×) — без изменений, всегда direct exec.

Практика: для m2m junction'а с `attachIntent.particles.entities: [parent, other]` runtime автоматически поднимет picker — пользователь выбирает `other` из существующей коллекции, вместо того чтобы создавать новый через form modal.
