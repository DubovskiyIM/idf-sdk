/**
 * Утилиты работы с полями онтологии.
 *
 * Поле может быть в двух форматах:
 *  1. Строка — legacy: `fields: ["id", "name", "avatar"]`
 *  2. Объект — новый: `fields: { name: { type: "text", read: [...], write: [...] } }`
 *
 * normalizeField делает формат единообразным. getEntityFields возвращает
 * массив нормализованных полей — кристаллизатор и detail-body работают
 * только с массивом.
 *
 * canWrite / canRead проверяют доступ поля для роли зрителя (§5 манифеста:
 * зависимость от зрителя).
 */

/**
 * Нормализует поле в объектный формат `{ name, type, read?, write?, required? }`.
 * Если поле — строка, тип выводится из имени эвристически.
 */
export function normalizeField(fieldDef, fieldName) {
  if (typeof fieldDef === "string") {
    return { name: fieldDef, type: inferTypeFromName(fieldDef) };
  }
  return { name: fieldName || fieldDef.name, ...fieldDef };
}

/**
 * Вернуть массив нормализованных полей сущности.
 * Поддерживает оба формата fields (массив строк или объект).
 */
export function getEntityFields(entity) {
  if (!entity?.fields) return [];
  if (Array.isArray(entity.fields)) {
    return entity.fields.map(f => normalizeField(f));
  }
  // Объектный формат: fields: { name: {...}, email: {...} }
  return Object.entries(entity.fields).map(([name, def]) => normalizeField(def, name));
}

/**
 * Может ли роль записывать в поле.
 * Нет field.write → нет права записи по умолчанию.
 * field.write === ["*"] → все роли могут писать.
 * field.write включает роль → может.
 */
export function canWrite(field, role) {
  if (!field?.write || field.write.length === 0) return false;
  if (field.write.includes("*")) return true;
  return field.write.includes(role);
}

/**
 * Может ли роль читать поле.
 * Нет field.read → поле публично по умолчанию.
 * field.read === ["*"] → все.
 * field.read включает роль → может.
 */
export function canRead(field, role) {
  if (!field?.read || field.read.length === 0) return true;
  if (field.read.includes("*")) return true;
  return field.read.includes(role);
}

/**
 * Эвристика типа из имени поля (для обратной совместимости со старым
 * форматом onтологии, где поля были массивом строк).
 */
function inferTypeFromName(name) {
  // id: "id", "userId", "user_id", "senderId", ...
  if (/^id$|_id$|Id$/.test(name)) return "id";
  // datetime: exact "date"/"time", *At, *Date, *Time, _at/_date/_time
  // Без последнего условия "startTime"/"endTime" нормализуются в text,
  // а не в datetime — и DateInput адаптера не срабатывает.
  if (/^(date|time)$|_at$|_time$|_date$|At$|Date$|Time$/.test(name)) return "datetime";
  if (/_url$|_link$|^url$|Url$/.test(name)) return "url";
  if (/_email$|^email$|Email$/.test(name)) return "email";
  if (/_phone$|^phone$|Phone$/.test(name)) return "tel";
  if (/avatar|image|photo|wallpaper/i.test(name)) return "image";
  if (/^(content|description|bio|statusMessage|rules|welcomeMessage)$/.test(name)) return "textarea";
  return "text";
}

/**
 * Семантическая роль поля. Выводится из имени + типа из онтологии.
 * Используется карточкой (GridCard cardSpec), формой (секции),
 * и detail body (priceBlock, infoSection, timer).
 *
 * Правила применяются сверху вниз — первое совпадение побеждает.
 */
export function inferFieldRole(fieldName, fieldDef) {
  const name = fieldName || "";
  const type = fieldDef?.type || "";

  // 0. Explicit fieldRole declaration — structural (§15 v1.9)
  if (fieldDef?.fieldRole) {
    return { role: fieldDef.fieldRole, reliability: "structural", basis: "explicit ontology declaration" };
  }

  // 1. Type-based: coordinate / zone / heroImage / enum → rule-based (type-declared semantic)
  if (type === "coordinate") {
    return { role: "coordinate", reliability: "rule-based", basis: "type 'coordinate'" };
  }
  if (type === "polygon") {
    return { role: "zone", reliability: "rule-based", basis: "type 'polygon'" };
  }
  if (type === "image" || type === "multiImage") {
    return { role: "heroImage", reliability: "rule-based", basis: `type '${type}'` };
  }
  if (type === "enum") {
    return { role: "badge", reliability: "rule-based", basis: "type 'enum'" };
  }
  if (type === "entityRef") {
    return { role: "ref", reliability: "rule-based", basis: "type 'entityRef'" };
  }

  // 2. Name-based heuristics (applied top-down, first match wins)
  // title
  if (name === "title" || name === "name" || name === "label") {
    return { role: "title", reliability: "heuristic", basis: `name match: '${name}'`, pattern: "name:title-synonym" };
  }

  // description
  if (type === "textarea" && /^(description|bio|content)$/.test(name)) {
    return { role: "description", reliability: "heuristic", basis: `textarea + name: '${name}'`, pattern: "name:description-synonym" };
  }

  // price — number + имя содержит price/cost/amount
  if (type === "number" && /price|cost|amount/i.test(name)) {
    return { role: "price", reliability: "heuristic", basis: `number + name substring: '${name}'`, pattern: "name:price-substring" };
  }

  // timer — datetime + имя содержит end/deadline/expir
  if ((type === "datetime" || type === "date") && /end|deadline|expir/i.test(name)) {
    return { role: "timer", reliability: "heuristic", basis: `datetime + name suffix: '${name}'`, pattern: "name:timer-suffix" };
  }

  // coordinate по имени
  if (/^(lat|lng|coords?|position)$/i.test(name) && type !== "text") {
    return { role: "coordinate", reliability: "heuristic", basis: `name in coordinate-set: '${name}'`, pattern: "name:coordinate-set" };
  }

  // address (v1.7)
  if (/address$/i.test(name) && type !== "number") {
    return { role: "address", reliability: "heuristic", basis: `name suffix 'address': '${name}'`, pattern: "name:address-suffix" };
  }

  // zone (v1.7) — имя zone/area
  if (/^(zone|polygon|area)$/i.test(name) && type !== "number") {
    return { role: "zone", reliability: "heuristic", basis: `name in zone-set: '${name}'`, pattern: "name:zone-set" };
  }

  // location
  if (/^(location|city)$|from$/i.test(name) && type !== "number") {
    return { role: "location", reliability: "heuristic", basis: `name in location-set: '${name}'`, pattern: "name:location-set" };
  }

  // badge — status/condition
  if (/^(status|condition)$/.test(name)) {
    return { role: "badge", reliability: "heuristic", basis: `name match: '${name}'`, pattern: "name:badge-status" };
  }

  // metric — number fallback
  if (type === "number") {
    return { role: "metric", reliability: "heuristic", basis: "number type fallback", pattern: "type:number-metric-fallback" };
  }

  // info — всё остальное (fallback)
  return { role: "info", reliability: "heuristic", basis: "fallback: no specific pattern matched", pattern: "fallback:info" };
}

/**
 * Маппинг ontology-типа на тип контрола параметр-формы.
 * Используется в inferControlType для приоритетного вывода типа.
 */
export function mapOntologyTypeToControl(ontologyType) {
  const map = {
    text: "text",
    textarea: "textarea",
    email: "email",
    tel: "tel",
    url: "url",
    number: "number",
    datetime: "datetime",
    date: "datetime",
    image: "file",
    multiImage: "multiImage",
    file: "file",
    enum: "select",
    entityRef: "select", // ссылка на другую сущность — select
    id: "text", // id обычно не редактируется через форму
    boolean: "select",
  };
  return map[ontologyType] || "text";
}
