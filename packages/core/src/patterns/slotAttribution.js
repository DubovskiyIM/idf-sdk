// slotAttribution.js
//
// Карта { slotPath → { patternId, action } } для каждого slot'а, который
// был добавлен или модифицирован каким-либо matched pattern.structure.apply.
//
// Алгоритм: применяем паттерны последовательно (как applyStructuralPatterns),
// после каждого делаем deep-diff slots(prev) vs slots(next), фиксируем
// новые/изменённые ключи с patternId этого паттерна.

import { crystallizeV2 } from "../crystallize_v2/index.js";
import { getDefaultRegistry, loadStablePatterns } from "./registry.js";

export function computeSlotAttribution(intents, ontology, projection) {
  const registry = getDefaultRegistry();
  loadStablePatterns(registry);

  const intentsArr = Array.isArray(intents)
    ? intents
    : Object.entries(intents || {}).map(([id, intent]) => ({ id, ...intent }));
  const intentsMap = Array.isArray(intents)
    ? Object.fromEntries(intents.map(i => [i.id, i]))
    : (intents || {});

  const projId = projection?.id || "_attribution";
  const ontologyOff = {
    ...ontology,
    features: { ...(ontology?.features || {}), structureApply: false },
  };
  const baseline = crystallizeV2(
    intentsMap,
    { [projId]: projection },
    ontologyOff,
    "_attribution",
    {},
  );
  const artifactBaseline = baseline[projId] || null;
  if (!artifactBaseline) return {};

  const matchResult = registry.matchPatterns(intentsArr, ontology, projection, {
    includeNearMiss: false,
  });
  const matched = Array.isArray(matchResult) ? matchResult : matchResult.matched;

  const attribution = {};
  // Глубокий клон baseline, чтобы apply-функции, которые мутируют in-place,
  // не повредили нашу копию для diff'а.
  let prev = deepClone(artifactBaseline.slots || {});

  for (const entry of matched) {
    const pattern = Array.isArray(matchResult) ? entry : entry.pattern;
    if (typeof pattern.structure?.apply !== "function") continue;

    const applyContext = {
      ontology,
      mainEntity: projection?.mainEntity,
      intents: intentsArr,
      projection,
    };
    // Важно: передаём свежий клон в apply, потом diff'им против сохранённого.
    // Иначе in-place мутация даёт next === prev и diff пропускает изменения.
    const snapshot = deepClone(prev);
    const next = pattern.structure.apply(snapshot, applyContext);
    const changes = diffSlots(prev, next);
    for (const { path, action } of changes) {
      attribution[path] = { patternId: pattern.id, action };
    }
    prev = next;
  }

  return attribution;
}

function deepClone(v) {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(deepClone);
  const out = {};
  for (const k of Object.keys(v)) out[k] = deepClone(v[k]);
  return out;
}

function diffSlots(prev, next) {
  const changes = [];
  walk(prev, next, "", changes);
  return changes;
}

function walk(prev, next, path, changes) {
  if (Array.isArray(next)) {
    const prevArr = Array.isArray(prev) ? prev : [];
    for (let i = 0; i < next.length; i++) {
      const childPath = `${path}[${i}]`;
      if (i >= prevArr.length) {
        changes.push({ path: childPath, action: "added" });
        continue;
      }
      if (!deepEqual(prevArr[i], next[i])) {
        if (isObject(prevArr[i]) && isObject(next[i])) {
          walk(prevArr[i], next[i], childPath, changes);
        } else {
          changes.push({ path: childPath, action: "modified" });
        }
      }
    }
    return;
  }
  if (isObject(next)) {
    const prevObj = isObject(prev) ? prev : {};
    for (const key of Object.keys(next)) {
      const childPath = path ? `${path}.${key}` : key;
      if (!(key in prevObj)) {
        changes.push({ path: childPath, action: "added" });
        continue;
      }
      if (!deepEqual(prevObj[key], next[key])) {
        if (isObject(prevObj[key]) && isObject(next[key])) {
          walk(prevObj[key], next[key], childPath, changes);
        } else if (Array.isArray(prevObj[key]) && Array.isArray(next[key])) {
          walk(prevObj[key], next[key], childPath, changes);
        } else {
          changes.push({ path: childPath, action: "modified" });
        }
      }
    }
  }
}

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  if (isObject(a) && isObject(b)) {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (!deepEqual(a[k], b[k])) return false;
    return true;
  }
  return false;
}
