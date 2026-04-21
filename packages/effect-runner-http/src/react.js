import { useState, useCallback, useEffect, useMemo } from "react";
import { runIntent } from "./runIntent.js";
import { inferEndpoint, tableNameFor } from "./inferEndpoint.js";

/**
 * React-hook — минимальный state-container для IDF-ontology + HTTP-runner.
 *
 * Возвращает:
 *   - world: { [collectionName]: Entity[] } — авто-загруженные list'ы
 *   - run(intentName, params): async — выполняет intent + обновляет world
 *   - drafts: Object — placeholder для optimistic-state (minimal: loading flags)
 *   - error: last error message
 *   - reload(intentName?): — форсирует перезагрузку одной (или всех) list-коллекций
 */
export function useHttpEngine({
  ontology,
  apiUrl,
  getAuthToken,
  autoLoad = true,
}) {
  const [world, setWorld] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);

  const listIntentsByEntity = useMemo(
    () => indexListIntents(ontology),
    [ontology]
  );

  const reload = useCallback(
    async (entityName) => {
      const listEntry = Array.from(listIntentsByEntity.entries()).find(
        ([e]) => !entityName || e === entityName
      );
      if (!listEntry) return;
      const [targetEntity, { intentName, intent }] = listEntry;
      const entity = ontology.entities[targetEntity];
      if (!entity) return;

      setLoading((s) => ({ ...s, [targetEntity]: true }));
      const result = await runIntent({
        name: intentName,
        intent,
        entity,
        params: {},
        apiUrl,
        getAuthToken,
      });
      setLoading((s) => ({ ...s, [targetEntity]: false }));

      if (result.ok) {
        setWorld((w) => ({ ...w, [tableNameFor(targetEntity)]: toArray(result.data) }));
      } else {
        setError(result.error);
      }
    },
    [ontology, listIntentsByEntity, apiUrl, getAuthToken]
  );

  const reloadAll = useCallback(async () => {
    for (const [entityName] of listIntentsByEntity) {
      await reload(entityName);
    }
  }, [listIntentsByEntity, reload]);

  useEffect(() => {
    if (autoLoad) reloadAll();
  }, [autoLoad, reloadAll]);

  const run = useCallback(
    async (intentName, params) => {
      const intent = ontology.intents[intentName];
      if (!intent) throw new Error(`Unknown intent: ${intentName}`);
      const entity = ontology.entities[intent.target];
      if (!entity) throw new Error(`Unknown target entity: ${intent.target}`);

      const result = await runIntent({
        name: intentName,
        intent,
        entity,
        params,
        apiUrl,
        getAuthToken,
      });

      if (!result.ok) {
        setError(result.error);
        return result;
      }

      // После успеха — перезагружаем соответствующий list (mutation side-effect)
      if (["insert", "replace", "remove"].includes(intent.alpha)) {
        await reload(intent.target);
      }
      setError(null);
      return result;
    },
    [ontology, apiUrl, getAuthToken, reload]
  );

  return { world, run, drafts: loading, error, reload };
}

function indexListIntents(ontology) {
  const map = new Map();
  for (const [name, intent] of Object.entries(ontology.intents ?? {})) {
    if (intent.alpha) continue;
    if (intent.parameters?.id?.required) continue;
    if (!intent.target) continue;
    if (map.has(intent.target)) continue;
    map.set(intent.target, { intentName: name, intent });
  }
  return map;
}

function toArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

// Inference helpers reexport
export { inferEndpoint, tableNameFor };
