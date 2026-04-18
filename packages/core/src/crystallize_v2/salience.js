/**
 * Intent salience — формальный tiebreaker для slot-contention (§16 PoC).
 *
 * Проблема: когда M > N intent'ов валидно конкурируют за слот capacity N,
 * алгоритм вынужден использовать implicit tiebreaker. До функториального
 * фикса им был `Object.entries` порядок (порядок авторства). После —
 * алфавитный порядок id. Оба критерия детерминированы, но семантически
 * неадекватны: `apply_template` не primary для Listing лишь потому, что
 * его id алфавитно раньше `edit_listing`.
 *
 * Salience делает приоритизацию первоклассным понятием. Два уровня:
 *
 *   1. Explicit — автор объявляет `intent.salience`
 *      - число: любая величина, больше = primary
 *      - строка: "primary" | "secondary" | "tertiary" | "utility"
 *
 *   2. Computed — вывод из particles по набору правил:
 *      - creator mainEntity                → 80
 *      - phase-transition (status change)  → 70
 *      - replace на main entity            → 60
 *      - effect без явной привязки         → 40 (default)
 *      - remove на main entity             → 30 (destructive ниже edit)
 *      - read-only / utility               → 10
 *
 * Tied (равный salience) — alphabetical по id (стабильно и видимо).
 *
 * Применение в PoC: только в assignToSlotsDetail для сортировки standalone
 * кнопок toolbar перед срезом capacity=3. Остальные слоты пока не затронуты.
 */

import { normalizeCreates } from "./assignToSlotsShared.js";

const LABEL_MAP = {
  primary: 100,
  secondary: 50,
  tertiary: 20,
  utility: 5,
};

/**
 * Вычислить salience для intent в контексте mainEntity.
 *
 * @param {Object} intent
 * @param {string|null} mainEntity — главная сущность проекции (для которой detail/catalog)
 * @returns {{ value: number, source: "explicit" | "computed", reason: string }}
 */
export function computeSalience(intent, mainEntity) {
  // Explicit override
  if (typeof intent?.salience === "number") {
    return { value: intent.salience, source: "explicit", reason: "intent.salience:number" };
  }
  if (typeof intent?.salience === "string" && intent.salience in LABEL_MAP) {
    return {
      value: LABEL_MAP[intent.salience],
      source: "explicit",
      reason: `intent.salience:${intent.salience}`,
    };
  }

  // Computed defaults
  const creates = normalizeCreates(intent?.creates);
  if (creates && creates === mainEntity) {
    return { value: 80, source: "computed", reason: "creator-of-main" };
  }

  const effects = intent?.particles?.effects || [];
  const mainLower = (mainEntity || "").toLowerCase();

  const touchesMain = (e) => {
    if (typeof e?.target !== "string") return false;
    const t = e.target.toLowerCase();
    return t === mainLower || t.startsWith(mainLower + ".");
  };

  const replacesMainStatus = effects.some(
    (e) => e.α === "replace" && typeof e.target === "string" && e.target.endsWith(".status") && touchesMain(e)
  );
  if (replacesMainStatus) {
    return { value: 70, source: "computed", reason: "phase-transition" };
  }

  const replacesMain = effects.some((e) => e.α === "replace" && touchesMain(e));
  if (replacesMain) {
    return { value: 60, source: "computed", reason: "edit-main" };
  }

  const removesMain = effects.some((e) => e.α === "remove" && touchesMain(e));
  if (removesMain) {
    return { value: 30, source: "computed", reason: "destructive-main" };
  }

  if (effects.length === 0) {
    return { value: 10, source: "computed", reason: "read-only" };
  }

  return { value: 40, source: "computed", reason: "default" };
}

/**
 * Comparator для сортировки standalone toolbar-кнопок.
 * Button: { intentId, salience: number } — salience пробрасывается из assignToSlots.
 */
export function bySalienceDesc(a, b) {
  const sA = a.salience ?? 40;
  const sB = b.salience ?? 40;
  if (sA !== sB) return sB - sA;
  return a.intentId.localeCompare(b.intentId);
}
