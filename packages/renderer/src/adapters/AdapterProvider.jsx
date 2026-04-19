/**
 * React Context для UI-адаптера (backlog 3.4).
 *
 * Проблема глобального реестра: `registerUIAdapter(x)` — side-effect, и
 * вызов прямо в render (DomainRuntime / standalone.jsx) ломает React 19
 * HMR с «Internal React error: Expected static flag».
 *
 * Решение: `<AdapterProvider adapter={x}>…</AdapterProvider>` — адаптер
 * передаётся через Context, компоненты читают через useAdapter() /
 * useAdapterComponent(kind, type). Глобальный registry сохраняется как
 * back-compat fallback — если Provider не выставлен, компоненты по-прежнему
 * читают currentAdapter через getAdaptedComponent.
 */
import { createContext, createElement, useContext, useMemo } from "react";
import {
  getAdaptedComponent as getGlobal,
  getUIAdapter,
  registerUIAdapter as registerGlobal,
} from "./registry.js";
import { pickBest } from "./matching.js";

const AdapterContext = createContext(null);

export function AdapterProvider({ adapter, children }) {
  // Memoize чтобы не перерендеривать всё дерево при каждом render parent'а.
  const value = useMemo(() => adapter || null, [adapter]);
  return createElement(AdapterContext.Provider, { value }, children);
}

/**
 * Вернуть активный адаптер: сперва из Context, иначе из глобального
 * currentAdapter (для кода, ещё не обёрнутого Provider'ом).
 */
export function useAdapter() {
  const ctx = useContext(AdapterContext);
  return ctx || getUIAdapter();
}

/**
 * Резолвить компонент. Приоритет: Context → global registry. Возвращает
 * React-компонент или null.
 */
export function useAdapterComponent(kind, type) {
  const adapter = useAdapter();
  if (!adapter) return null;
  const category = adapter[kind];
  if (!category || typeof category !== "object") return null;
  const entry = category[type];
  if (!entry) return null;
  if (typeof entry === "function") return entry;
  if (typeof entry === "object" && typeof entry.component === "function") {
    return entry.component;
  }
  return null;
}

/**
 * Вариант с matching-score: учитывает affinity.
 */
export function useAdapterPick(kind, spec) {
  const adapter = useAdapter();
  if (!adapter) return null;
  return pickBest(kind, spec, adapter);
}

/**
 * Back-compat helper — читается из Context, иначе из global.
 * Используется для мест, где hook недоступен (не React-контекст).
 */
export function resolveAdapterComponent(kind, type, adapter) {
  if (adapter) {
    const category = adapter[kind];
    if (category && typeof category === "object") {
      const entry = category[type];
      if (typeof entry === "function") return entry;
      if (entry && typeof entry === "object" && typeof entry.component === "function") {
        return entry.component;
      }
    }
  }
  return getGlobal(kind, type);
}

export { AdapterContext, registerGlobal as registerUIAdapter };
