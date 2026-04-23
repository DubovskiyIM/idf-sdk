---
"@intent-driven/core": patch
---

Follow-up к G-K-20 (#257): `mergeEntityFieldsForReplace` использовал
`control: "checkbox"` для boolean полей, но `KNOWN_PARAMETER_TYPES` в
`validateArtifact` его не содержит — генерилось 200+ validation
warnings на Keycloak baseline.

Fix: использовать `control: "boolean"` (KNOWN). Семантически
эквивалентно — renderer ParameterControl интерпретирует одинаково.
