/**
 * normalizeProjection — единая точка нормализации projection-объектов
 * перед их использованием crystallize_v2 / materializer'ами.
 *
 * Закрывает §12.1 (Notion field test, 2026-04-26): manifest использует
 * термин `archetype` (feed/catalog/detail/canvas/dashboard/wizard/form),
 * а runtime SDK читает `projection.kind`. Часть доменов писала `archetype:`,
 * что ломало materializeAsDocument/materializeAsVoice (switch не находил case).
 *
 * Семантика:
 *   - если есть `proj.kind` — оставляем как есть
 *   - иначе если есть `proj.archetype` — копируем в `proj.kind`
 *   - других mutation'ов не делаем
 *
 * Функция чистая, идемпотентная, возвращает новый объект (не мутирует input).
 */

/**
 * Нормализует одиночную projection.
 * @param {object|null|undefined} projection
 * @returns {object} новый объект (или тот же, если изменений не нужно)
 */
export function normalizeProjection(projection) {
  if (!projection || typeof projection !== "object") return projection;
  if (projection.kind) return projection;
  if (projection.archetype) {
    return { ...projection, kind: projection.archetype };
  }
  return projection;
}

/**
 * Нормализует map projections (id → projection).
 * @param {Record<string, object>} projections
 * @returns {Record<string, object>} новый map
 */
export function normalizeProjections(projections) {
  if (!projections || typeof projections !== "object") return projections;
  const out = {};
  for (const [id, proj] of Object.entries(projections)) {
    out[id] = normalizeProjection(proj);
  }
  return out;
}
