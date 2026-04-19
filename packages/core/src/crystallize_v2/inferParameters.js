/**
 * §1.1 дизайна: извлечение параметров намерения из witnesses/parameters/creates.
 * Возвращает Parameter[] — список того, что нужно собрать у пользователя.
 *
 * Polymorphic (v0.15): intent.creates "Entity(variant)" → используем
 * merged shared + variant fields, добавляем hidden discriminator param
 * с default=variant.
 */

import { parseCreatesVariant } from "./parseCreatesVariant.js";
import { getVariantFields } from "./getVariantFields.js";

// Системные поля, которые не должны собираться у пользователя при creates:X
const SYSTEM_FIELDS = new Set([
  "id", "createdAt", "created_at", "updatedAt", "updated_at",
  "createdBy", "senderId", "authorId", "ownerId", "userId",
  "status", "deletedAt", "deletedFor",
]);

// Foreign key поля: заканчиваются на "Id" (не сам "id"). Это ссылки
// на родительские сущности (pollId, conversationId, specialistId) — их
// проставляет рантайм из routeParams/target, пользователь их не вводит.
function isForeignKey(fieldName) {
  return /Id$/.test(fieldName) && fieldName !== "id";
}

// Witnesses, которые являются результатами выполнения, не входом
const RESULT_WITNESSES = new Set([
  "results", "translated_text", "selected_count", "available_reactions",
  "read_by", "delivered_to", "invite_url",
]);

export function inferParameters(intent, ONTOLOGY) {
  // 1. Явный parameters → победитель (даже пустой массив — автор
  // сознательно подавляет inference для click-action intents вроде
  // create_direct_chat, где params auto-filled buildEffects'ом).
  // Backlog 4.1: читаем оба варианта — top-level И particles.parameters,
  // т.к. IDF-convention (planning/sales/freelance) часто декларативно
  // группирует параметры в particles.
  if (Array.isArray(intent.parameters)) {
    return intent.parameters;
  }
  if (Array.isArray(intent.particles?.parameters)) {
    return intent.particles.parameters;
  }

  const witnesses = intent.particles?.witnesses || [];
  const effects = intent.particles?.effects || [];
  const phase = intent.phase;
  const creates = intent.creates;

  // Собрать множество полей, покрытых эффектами intent'а.
  // Только они являются настоящими входными параметрами (то, что меняется).
  const effectFields = new Set();
  for (const ef of effects) {
    if (ef.α === "replace" && typeof ef.target === "string" && ef.target.includes(".")) {
      effectFields.add(ef.target.split(".").pop());
    }
  }

  const params = [];

  // 2. Витнессы
  for (const w of witnesses) {
    if (RESULT_WITNESSES.has(w)) continue;

    // Computed witness — объект {field, compute}, не параметр ввода
    if (typeof w === "object" && w !== null && w.compute) continue;

    if (w.includes(".")) {
      // Точечный: editable если investigation ИЛИ confirmation="form" (edit-формы)
      const isForm = intent.particles?.confirmation === "form";
      if (phase === "investigation" || isForm) {
        const field = w.split(".").pop();
        // Достаём label из ontology
        const entityAlias = w.split(".")[0];
        const entityName = (intent.particles?.entities || [])
          .map(e => { const parts = e.split(":"); return { alias: parts[0].trim(), entity: (parts[1] || parts[0]).trim() }; })
          .find(e => e.alias.toLowerCase() === entityAlias.toLowerCase())?.entity;
        const ontField = entityName && ONTOLOGY?.entities?.[entityName]?.fields?.[field];
        const label = ontField?.label || field;
        const param = { name: field, label, bind: w, editable: true, inferredFrom: isForm ? "form-witness" : "phase-investigation" };
        if (ontField?.visibleWhen) param.visibleWhen = ontField.visibleWhen;
        if (ontField?.control) param.type = ontField.control;
        if (ontField?.min != null) param.min = ontField.min;
        if (ontField?.max != null) param.max = ontField.max;
        params.push(param);
      }
      // Иначе — preview, не параметр
      continue;
    }

    // Без точки — либо current_X, либо прямой параметр.
    // Но только если поле покрыто эффектом intent'а (иначе это
    // информационный witness, не входной параметр).
    if (w.startsWith("current_")) {
      params.push({ name: w.replace(/^current_/, ""), inferredFrom: "current-selector" });
    } else if (effectFields.has(w) || effects.length === 0 || creates) {
      // Поле покрыто эффектом → входной параметр.
      // Или intent без эффектов (search) / creator → все witnesses = параметры.
      params.push({ name: w, inferredFrom: "direct-witness" });
    }
    // Иначе — informational witness, пропускаем
  }

  // 3. creates:X — поля сущности (если не уже собраны из witnesses).
  // Polymorphic (v0.15): "Task(bug)" резолвится через parseCreatesVariant.
  const { entity: createsNorm, variant: createsVariant } = parseCreatesVariant(creates);
  if (createsNorm && ONTOLOGY?.entities?.[createsNorm]) {
    const entity = ONTOLOGY.entities[createsNorm];
    const isPoly = entity.discriminator && entity.variants;

    // Для polymorphic + variant — merged shared + variant fields
    let fieldsRaw;
    if (isPoly && createsVariant) {
      const { fields: merged } = getVariantFields(entity, createsVariant);
      fieldsRaw = Object.entries(merged).map(([n, def]) => ({ name: n, ...def }));
    } else {
      fieldsRaw = Array.isArray(entity.fields)
        ? entity.fields.map(f => ({ name: f }))
        : Object.entries(entity.fields || {}).map(([n, def]) => ({ name: n, ...def }));
    }

    const existingNames = new Set(params.map(p => p.name));
    const ownerField = entity.ownerField;
    for (const field of fieldsRaw) {
      if (SYSTEM_FIELDS.has(field.name)) continue;
      // Polymorphic: discriminator поле при creates с variant — hidden с default
      if (isPoly && createsVariant && field.name === entity.discriminator) {
        if (!existingNames.has(field.name)) {
          params.push({
            name: field.name,
            default: createsVariant,
            hidden: true,
            inferredFrom: "polymorphic-discriminator",
          });
          existingNames.add(field.name);
        }
        continue;
      }
      // FK'и пропускаем, кроме entityRef-полей с write-доступом (sphereId, goalId).
      // ownerField (userId) всегда пропускаем — устанавливается из viewer.
      if (field.name === ownerField) continue;
      if (isForeignKey(field.name) && field.type !== "entityRef") continue;
      if (existingNames.has(field.name)) continue;
      // Поля без write-доступа — computed/read-only, не собираются при создании.
      if (field.write && !field.write.includes("*") && !field.write.includes("self")) continue;
      if (field.read && !field.write) continue;
      const param = { name: field.name, label: field.label || field.name, inferredFrom: "creates-entity", entity: createsNorm };
      if (field.visibleWhen) param.visibleWhen = field.visibleWhen;
      if (field.control) param.type = field.control;
      if (field.min != null) param.min = field.min;
      if (field.max != null) param.max = field.max;
      params.push(param);
    }
  }

  return params;
}
