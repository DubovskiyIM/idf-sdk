---
"@intent-driven/host-contracts": minor
---

Новый пакет `@intent-driven/host-contracts@0.1.0` — формализация контракта `shell ↔ module` для IDF-хостов и адаптеров micro-frontend.

Convergent evolution в трёх независимых production-проектах (Cognive Consaltica `@cognive/shell-contracts`, FlowEditor `@floweditor/shared/router`, IDF host) подтвердил, что абстракция «модуль = id + basePath + nav + routes + commands/headerSlots/docs» + «shell даёт контекст: auth/i18n/theme/navigate/events/toast» — стабильна и стоит выделения.

Содержит:
- TypeScript-типы: `AppModuleManifest`, `ShellContext`, `NavSection`, `NavItem`, `RouteConfig`, `CommandConfig`, `LoadingTipConfig`, `DocLink`, `HeaderSlotName`, `EventBus`, `ToastAPI`, `AuthAPI`, `I18nInstance`, `ThemeAPI`.
- Runtime-helpers: `validateModuleManifest(manifest)` (shape-валидатор с понятными ошибками), `mergeNavSections(...lists)` (merge nav-секций нескольких модулей с детектом item-id коллизий).
- Канонический enum `HEADER_SLOTS`.

Type-only по сути: ноль React/MF runtime, только peer-`react` для типов компонентов. MIT.
