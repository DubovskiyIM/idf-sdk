/**
 * Выводит R9 compositions из `entity.relations` (belongs-to FK).
 *
 * Contract: для каждого FK child.relations[fk] = { entity: Parent, kind: "belongs-to" }
 * эмитим двустороннюю связь:
 *   compositions.Child.push({ entity: Parent, as: <fk без Id>, via: fk, mode: "one" })
 *   compositions.Parent.push({ entity: Child, as: <child plural>, via: fk, mode: "many" })
 *
 * Workzilla-пример: Task.customerId → User
 *   compositions.Task:  [{ entity: "User", as: "customer", via: "customerId", mode: "one"  }]
 *   compositions.User:  [{ entity: "Task", as: "tasks",    via: "customerId", mode: "many" }]
 *
 * crystallize_v2 использует compositions для R9 auto-resolve в detail-views
 * (task_detail показывает task.customer.name / task.responses).
 */

function aliasFromFK(fk) {
  // customerId → customer; user_id → user; id → id (edge-case)
  if (fk.endsWith("Id") && fk.length > 2) return fk.slice(0, -2);
  if (fk.endsWith("_id") && fk.length > 3) return fk.slice(0, -3);
  return fk;
}

function pluralize(name) {
  const lower = name[0].toLowerCase() + name.slice(1);
  if (lower.endsWith("y")) return lower.slice(0, -1) + "ies";
  if (lower.endsWith("s")) return lower + "es";
  return lower + "s";
}

export function buildCompositions(entities) {
  const compositions = {};

  for (const [childName, child] of Object.entries(entities)) {
    const relations = child?.relations;
    if (!relations || typeof relations !== "object") continue;

    for (const [fk, rel] of Object.entries(relations)) {
      if (!rel || rel.kind !== "belongs-to") continue;
      const parentName = rel.entity;
      if (!entities[parentName]) continue;

      // child → parent (one)
      if (!compositions[childName]) compositions[childName] = [];
      compositions[childName].push({
        entity: parentName,
        as: aliasFromFK(fk),
        via: fk,
        mode: "one",
      });

      // parent → child (many)
      if (!compositions[parentName]) compositions[parentName] = [];
      compositions[parentName].push({
        entity: childName,
        as: pluralize(childName),
        via: fk,
        mode: "many",
      });
    }
  }

  return compositions;
}
