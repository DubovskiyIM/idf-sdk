# @intent-driven/host-contracts

Контракт `shell ↔ module` для IDF-хостов и адаптеров micro-frontend.

## Зачем

Три независимых production-проекта (Cognive Consaltica `@cognive/shell-contracts`, FlowEditor `@floweditor/shared/router`, IDF host) пришли к одной и той же абстракции: **«модуль = id + basePath + nav + routes + (commands/headerSlots/docs)»** + **«shell даёт контекст: auth, i18n, theme, navigate, events, toast»**. Convergent evolution — сильный сигнал, что контракт стоит формализовать.

Этот пакет — **type-only + минимум runtime-helpers** для этой формализации. Никаких React/MF runtime — чистый shape.

## Что внутри

- `AppModuleManifest` — то, что модуль выставляет наружу (id, basePath, navSections, routes, commands?, headerSlots?, settingsPanel?, loadingTips?, docs?, version?).
- `ShellContext` — то, что host даёт модулю при `init(ctx)` (auth, i18n, theme, navigate, events, toast, setHeaderSlot, registerCommands, env, permissions).
- `NavSection`, `NavItem`, `RouteConfig`, `CommandConfig`, `LoadingTipConfig`, `DocLink`, `HeaderSlotName`, `EventBus`, `ToastAPI`.
- `validateModuleManifest(manifest)` — runtime-валидатор shape'а с понятными ошибками.
- `mergeNavSections(sections, ...)` — merge nav-секций нескольких модулей с детектом коллизий по id.
- `HEADER_SLOTS` — канонический enum названий слотов в shell-header.

## Использование

```js
import { validateModuleManifest, mergeNavSections, HEADER_SLOTS } from "@intent-driven/host-contracts";

const manifest = {
  id: "pipeline",
  basePath: "/pipeline",
  navSections: [{ id: "main", label: "Main", items: [{ id: "home", path: "/", label: "Home" }] }],
  routes: [{ path: "/", component: HomePage }],
};

const result = validateModuleManifest(manifest);
if (!result.ok) console.error(result.errors);
```

```ts
import type { AppModuleManifest, ShellContext } from "@intent-driven/host-contracts";

export function initModule(ctx: ShellContext): AppModuleManifest {
  ctx.toast.show({ kind: "info", text: "module loaded" });
  return { id: "billing", basePath: "/billing", navSections: [], routes: [] };
}
```

## Conformance

Любой host (Vite-MF runtime, static-imports + DCE, plain SPA, IDF host) и любой module-package, обменивающиеся `AppModuleManifest` + `ShellContext`, считаются conformant. Богатые поля (`headerSlots`, `commands`, `loadingTips`, `docs`, `settingsPanel`) — optional, host имеет право игнорировать неподдерживаемые.

## Связь с §27 Studio

`AppModuleManifest` — сериализованная projection-tree остатка домена в IDF-смысле: `navSections ≈ ROOT_PROJECTIONS`, `routes ≈ projection paths`, `commands ≈ palette/intents`, `headerSlots ≈ shell-extension points`. Этот пакет — формальный фундамент, на котором adapter'ы (`@intent-driven/adapter-multiverse`, `@intent-driven/adapter-primeng` и др.) будут декларировать совместимость.
