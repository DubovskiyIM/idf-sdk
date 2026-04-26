---
"@intent-driven/core": minor
---

feat(core): Information Bottleneck фильтр на uiSchema

Поле сущности появляется в uiSchema проекции ⟺ хотя бы один
accessible intent читает или пишет это поле. Заменяет «всё по
умолчанию + manual exclude». Author override через projection.
uiSchema.{include,exclude}Fields. Witness 'information-bottleneck'
для CrystallizeInspector.

Новые экспорты из @intent-driven/core:
- accessibleIntents(projection, role, INTENTS, ONTOLOGY)
- intentTouchesEntity(intent, entityName)
- (internal) intentReadFields, intentWriteFields, applyInformationBottleneck
