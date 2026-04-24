/**
 * Shared selection state для cross-projection co-selection паттернов.
 *
 * Контракт для `bidirectional-canvas-tree-selection` и других cross-projection
 * state-sharing паттернов: две (и более) projections одного домена читают/пишут
 * один и тот же selection slice через React context. Tree-side выставляет
 * selection клику по group-entity → canvas-side подсвечивает matching members
 * + zoom-to-fit. Manual selection на canvas → tree auto-scrolls к owning group.
 *
 * Shape:
 *   selection: null | { entityType: string, ids: string[] }
 *
 * API:
 *   <CoSelectionProvider>                           — должен оборачивать оба peer'а
 *   useCoSelection() → {
 *     selection,
 *     setSelection(next | fn),                      — replace или functional update
 *     toggleSelection(entityType, id),              — добавить/убрать single id
 *     clearSelection(),
 *     isSelected(entityType, id),
 *   }
 *
 * Если провайдер не смонтирован — useCoSelection возвращает no-op версию
 * (graceful fallback; peer'ы рендерятся без shared state, каждый работает
 * изолированно). Это позволяет adapter'ам без `supportsExternalSelection`
 * деградировать без runtime-ошибок.
 *
 * Co-selection vs form-selection: это НЕ про form-field selection
 * (multi-select combobox) — это про runtime UI-state между projections.
 * Form selection живёт в contol primitives и устойчив к unmount'у своей
 * projection; co-selection — ephemeral, очищается при смене view.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { getCapability } from "./adapters/registry.js";

const NOOP_CONTEXT = {
  selection: null,
  setSelection: () => {},
  toggleSelection: () => {},
  clearSelection: () => {},
  isSelected: () => false,
  __isProvider: false,
};

export const CoSelectionContext = createContext(NOOP_CONTEXT);

/**
 * Провайдер shared selection state. Оборачивает peer-projections.
 *
 * Props:
 *   initial: { entityType, ids } | null — начальное значение
 *   onChange: (selection) => void       — side-effect hook (напр. URL sync)
 *   children
 */
export function CoSelectionProvider({ initial = null, onChange, children }) {
  const [selection, setSelectionState] = useState(() => normalize(initial));

  const setSelection = useCallback((next) => {
    setSelectionState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      const normalized = normalize(value);
      if (onChange) onChange(normalized);
      return normalized;
    });
  }, [onChange]);

  const toggleSelection = useCallback((entityType, id) => {
    if (!entityType || id == null) return;
    setSelection((prev) => {
      // Смена entityType — reset + single.
      if (!prev || prev.entityType !== entityType) {
        return { entityType, ids: [String(id)] };
      }
      const sid = String(id);
      const exists = prev.ids.includes(sid);
      const ids = exists ? prev.ids.filter((x) => x !== sid) : [...prev.ids, sid];
      return ids.length ? { entityType, ids } : null;
    });
  }, [setSelection]);

  const clearSelection = useCallback(() => {
    setSelection(null);
  }, [setSelection]);

  const isSelected = useCallback((entityType, id) => {
    if (!selection) return false;
    if (selection.entityType !== entityType) return false;
    return selection.ids.includes(String(id));
  }, [selection]);

  const value = useMemo(() => ({
    selection,
    setSelection,
    toggleSelection,
    clearSelection,
    isSelected,
    __isProvider: true,
  }), [selection, setSelection, toggleSelection, clearSelection, isSelected]);

  return (
    <CoSelectionContext.Provider value={value}>
      {children}
    </CoSelectionContext.Provider>
  );
}

/**
 * Hook для доступа к shared selection. Вне провайдера возвращает no-op версию
 * (isActive === false) — позволяет peer-компонентам безопасно вызывать без
 * обязательного оборачивания.
 */
export function useCoSelection() {
  return useContext(CoSelectionContext);
}

/**
 * Определяет, смонтирован ли провайдер. Полезно для adapter'ов, чтобы решить
 * — включать ли bidirectional-binding (supportsExternalSelection) или
 * fallback'нуться на readonly highlight.
 */
export function useCoSelectionActive() {
  const ctx = useContext(CoSelectionContext);
  return ctx.__isProvider === true;
}

/**
 * Canonical gate для canvas/map-primitives: включать ли bidirectional
 * binding с shared selection state. True iff:
 *   (а) CoSelectionProvider смонтирован (иначе некого уведомлять), И
 *   (б) current adapter declares `capabilities.interaction.externalSelection: true`
 *
 * Когда false:
 *   - Provider смонтирован, но adapter не поддерживает → tree→canvas readonly
 *     highlight, без back-propagation от canvas-selection к tree-state.
 *   - Provider не смонтирован → обе projections работают изолированно.
 *
 * Adapter opt-in: пока ни один из 4 bundled-адаптеров (antd/mantine/apple/shadcn)
 * не декларирует `externalSelection: true` — ждут native canvas-primitive
 * с selection-прокидыванием. Custom adapter'ы могут включить самостоятельно.
 */
export function useCoSelectionEnabled() {
  const active = useCoSelectionActive();
  if (!active) return false;
  const cap = getCapability("interaction", "externalSelection");
  // Unknown capability (null) — для backward-compat считаем false: co-selection
  // opt-in, а не opt-out (безопаснее не включать ненадёжное binding).
  return cap === true;
}

function normalize(value) {
  if (!value || typeof value !== "object") return null;
  const { entityType, ids } = value;
  if (!entityType || typeof entityType !== "string") return null;
  if (!Array.isArray(ids) || ids.length === 0) return null;
  const unique = [];
  const seen = new Set();
  for (const id of ids) {
    if (id == null) continue;
    const sid = String(id);
    if (seen.has(sid)) continue;
    seen.add(sid);
    unique.push(sid);
  }
  return unique.length ? { entityType, ids: unique } : null;
}
