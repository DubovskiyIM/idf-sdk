/**
 * Помечает orphan entities (без intents, targeted'ящих их) как
 * `kind: "embedded"` — это nested types / envelope-helpers, которые
 * нужны как references, но не как top-level UI tab.
 *
 * Типичный случай — OpenAPI schemas вида `AbstractPolicyRepresentation`,
 * `AccessToken`, `AuthDetailsRepresentation`, `RoleMapping`, ... Они
 * появляются в `components.schemas` как $ref-target'ы, но не покрыты
 * HTTP endpoint'ами. Без `kind:"embedded"` они попадают в
 * `ROOT_PROJECTIONS` (катало'гиfiltered через R1 rule даже будучи
 * «нулевыми»), создают nav-noise.
 *
 * Closes G-K-3 (Keycloak): 75 orphan'ов → embedded, убирает noise
 * из nav.
 *
 * Consrvative: трогает только `kind: undefined | "internal"`. Author
 * уже mark'нутые как "reference" / "assignment" / "mirror" / "embedded"
 * не переопределяются.
 */

/**
 * @param {Record<string, object>} entities
 * @param {Record<string, object>} intents
 * @returns {Record<string, object>} новый map (вход не мутируется)
 */
export function markEmbeddedTypes(entities, intents) {
  const targetSet = new Set();
  for (const intent of Object.values(intents || {})) {
    if (typeof intent?.target === "string") targetSet.add(intent.target);
    // creates — тоже считаем за «used in intent»
    if (typeof intent?.creates === "string") targetSet.add(intent.creates);
  }

  const result = {};
  for (const [name, entity] of Object.entries(entities)) {
    const isOrphan = !targetSet.has(name);
    const isUnclassified = !entity?.kind || entity.kind === "internal";
    if (isOrphan && isUnclassified) {
      result[name] = { ...entity, kind: "embedded" };
    } else {
      result[name] = entity;
    }
  }
  return result;
}
