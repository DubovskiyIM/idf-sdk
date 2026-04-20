---
"@intent-driven/renderer": minor
---

SubCollectionSection: применение author-level `sort`, `where`, `terminalStatus` +
`hideTerminal` с toggle-кнопкой (backlog §4.7 / §4.8 / §6.7).

**Core** уже emitil эти поля в `section` shape (через `assignToSlotsDetail::buildSection`),
но renderer их игнорировал. Теперь:

- `section.where`: строка (eval `item.status !== 'withdrawn'`) или object (простые equalities).
- `section.sort`: `"-createdAt"` / `"+price"` / `"field"` — сортировка после filter.
- `section.terminalStatus` + `hideTerminal:true`: терминальные items (enum value из
  `withdrawn`/`cancelled`/`rejected`/`expired`/…) скрываются по default; toggle-кнопка
  «Показать все (+N)» раскрывает, «Скрыть завершённые» — снова прячет.

Freelance applicability: `task_detail.responses` получит hide-withdrawn по default,
`deal_detail.transactions` sorted по `-createdAt`, etc.
