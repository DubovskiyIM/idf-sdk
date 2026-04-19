/**
 * composeProjections — layered authoring для PROJECTIONS.
 *
 * Layer 0: deriveProjections(INTENTS, ONTOLOGY) — структура.
 * Layer 1: OVERRIDES — косметика (имя, URL-роутинг, curation витнес-полей, filter, onItemClick).
 *          Поддерживает `as: "<renamed-id>"` для переименования derived проекции.
 * Layer 2: EXTRA — hand-authored исключения для архетипов без R-правил
 *          (dashboard, form, canvas — деривация их не производит).
 *
 * Результат — карта проекций, эквивалентная ручному PROJECTIONS, но
 * с прозрачным derivation origin: все witness'ы R1–R8 в `proj.derivedBy`
 * сохраняются, косметика видна отдельно в OVERRIDES, exceptions — в EXTRA.
 *
 * Спецификация: idf-manifest-v2.1/docs/design/debugging-derived-ui-spec.md
 */

import { deriveProjections } from "./deriveProjections.js";

/**
 * @param {Record<string, object>} intents
 * @param {object} ontology
 * @param {Record<string, object>} overrides — ключ: derived id; поле `as` опционально переименовывает
 * @param {Record<string, object>} [extra] — hand-authored проекции (слияние после overrides)
 * @returns {Record<string, object>}
 */
export function composeProjections(intents, ontology, overrides = {}, extra = {}) {
  const derived = deriveProjections(intents, ontology);
  const composed = {};
  const renamedFrom = {};  // new id → old id, для detection коллизий

  for (const [derivedId, proj] of Object.entries(derived)) {
    const ov = overrides[derivedId];
    if (!ov) {
      composed[derivedId] = proj;
      continue;
    }
    const { as, ...restOv } = ov;
    const targetId = as || derivedId;
    if (renamedFrom[targetId]) {
      throw new Error(
        `composeProjections: collision — both "${renamedFrom[targetId]}" and "${derivedId}" map to "${targetId}"`
      );
    }
    renamedFrom[targetId] = derivedId;
    composed[targetId] = { ...proj, ...restOv };
  }

  for (const [extraId, proj] of Object.entries(extra)) {
    if (composed[extraId]) {
      throw new Error(
        `composeProjections: extra id "${extraId}" collides with derived/overridden projection`
      );
    }
    composed[extraId] = proj;
  }

  return composed;
}
