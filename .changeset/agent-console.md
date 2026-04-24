---
"@intent-driven/renderer": minor
---

Добавлен archetype `AgentConsole` + `useSSE` hook для LLM-агентов через tool-use loop в runtime. TimelineItem поддерживает 6 variants (thinking/effect/observation/pause/error/done) с русскоязычными REASON_LABELS для rejected-preapproval кейсов. Используется в invest-tenant'е Fold SaaS.
