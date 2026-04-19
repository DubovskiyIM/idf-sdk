/**
 * Matching-скор для выбора элемента адаптера (backlog + addendum).
 *
 * Мотивация. Runtime-рендерер резолвит компонент через `getAdaptedComponent(
 * kind, type)` — жёсткий lookup. Но один и тот же spec может попадать под
 * несколько адаптерных компонент: `{type:"text", fieldRole:"price"}` лучше
 * рендерится как `parameter.number`, чем как `parameter.text`; `fieldRole:
 * "coordinate"` — как `primitive.map`. Нужен declarative affinity + scoring,
 * чтобы адаптер мог объявить «я лучше подхожу под роль X», а рендерер
 * выбирал наиболее подходящий вариант.
 *
 * Минималистичный MVP:
 *   - Adapter-спеки для parameter/primitive могут объявить `affinity`:
 *       { roles: [...], types: [...], fields: [...], features: [...] }
 *   - `scoreCandidate(spec, adapterComp, type)` — числовой score (>= 0).
 *   - `rankCandidates(kind, spec, adapter)` — сортировка всех компонент
 *     в категории по убыванию score.
 *   - `pickBest(kind, spec, adapter)` — winner или null.
 *
 * Обратная совместимость. Компоненты без `affinity` получают base score = 1
 * при совпадении type (или 0 иначе) — то же поведение, что и `getAdapted
 * Component`. `pickBest` даёт прежний результат, если нет аффинити.
 */

const AFFINITY_WEIGHTS = {
  exactType: 10,
  roleMatch: 20,
  fieldMatch: 15,
  featureMatch: 5,
};

/**
 * Извлечь affinity-декларацию из adapter-компонента.
 * Поддерживает три формы:
 *   - functional component, без metadata → null
 *   - `Component.affinity = {...}` (static property)
 *   - `{ component, affinity }` wrapper-объект
 */
export function getAffinity(adapterEntry) {
  if (!adapterEntry) return null;
  if (typeof adapterEntry === "function") return adapterEntry.affinity || null;
  if (typeof adapterEntry === "object") return adapterEntry.affinity || null;
  return null;
}

export function getComponent(adapterEntry) {
  if (!adapterEntry) return null;
  if (typeof adapterEntry === "function") return adapterEntry;
  if (typeof adapterEntry === "object" && typeof adapterEntry.component === "function") {
    return adapterEntry.component;
  }
  return null;
}

function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Score одного кандидата против spec. Возвращает число ≥ 0; 0 означает
 * «никакой совместимости» (но кандидат всё ещё может быть выбран как
 * единственный в категории).
 */
export function scoreCandidate(spec, adapterEntry, registeredType) {
  if (!adapterEntry) return 0;
  const affinity = getAffinity(adapterEntry);
  let score = 0;

  // Base: совпадение registeredType (ключа в adapter-categoy) с spec.control / type.
  const wantedTypes = [spec?.control, spec?.type].filter(Boolean);
  if (wantedTypes.includes(registeredType)) score += AFFINITY_WEIGHTS.exactType;

  if (!affinity) return score;

  // Affinity: roles
  const specRole = spec?.fieldRole;
  const affRoles = asArray(affinity.roles);
  if (specRole && affRoles.includes(specRole)) {
    score += AFFINITY_WEIGHTS.roleMatch;
  }

  // Affinity: named fields
  const specName = spec?.name;
  const affFields = asArray(affinity.fields);
  if (specName && affFields.includes(specName)) {
    score += AFFINITY_WEIGHTS.fieldMatch;
  }

  // Affinity: additional types (beyond registered key)
  const affTypes = asArray(affinity.types);
  for (const t of wantedTypes) {
    if (affTypes.includes(t) && t !== registeredType) {
      score += AFFINITY_WEIGHTS.exactType;
      break;
    }
  }

  // Affinity: features (e.g. "withTime", "currency", "mask")
  const affFeatures = asArray(affinity.features);
  for (const f of affFeatures) {
    if (spec?.[f] === true) score += AFFINITY_WEIGHTS.featureMatch;
  }

  return score;
}

/**
 * Вернуть список `[{type, component, score}]` в порядке убывания score.
 * Кандидаты со score=0 исключаются, кроме случая, когда вся категория
 * такая — тогда отдаём exact-type match (если есть).
 */
export function rankCandidates(kind, spec, adapter) {
  if (!adapter) return [];
  const category = adapter[kind];
  if (!category || typeof category !== "object") return [];

  const ranked = [];
  for (const [regType, entry] of Object.entries(category)) {
    const score = scoreCandidate(spec, entry, regType);
    const component = getComponent(entry);
    if (!component) continue;
    if (score > 0) ranked.push({ type: regType, component, score });
  }

  ranked.sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    // Fallback: пытаемся найти по exact type (spec.control или spec.type),
    // как старое поведение getAdaptedComponent.
    const fallbackKey = spec?.control || spec?.type;
    const entry = fallbackKey ? category[fallbackKey] : null;
    const component = getComponent(entry);
    if (component) return [{ type: fallbackKey, component, score: 0 }];
  }

  return ranked;
}

/**
 * Выбрать winner из category. Возвращает React-компонент или null.
 */
export function pickBest(kind, spec, adapter) {
  const ranked = rankCandidates(kind, spec, adapter);
  return ranked[0]?.component || null;
}

/**
 * Экспорт constants — полезно для тестов и внешней конфигурации.
 */
export { AFFINITY_WEIGHTS };
