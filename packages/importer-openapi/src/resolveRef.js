/**
 * Резолвит $ref в OpenAPI spec через JSON-pointer.
 * Поддерживает chains ($ref → $ref), защита от циклов.
 */
export function resolveRef(schema, spec, seen = new Set()) {
  if (!schema || typeof schema !== "object") return schema;
  if (!schema.$ref) return schema;

  const ref = schema.$ref;
  if (seen.has(ref)) {
    throw new Error(`Circular $ref cycle detected at ${ref}`);
  }
  seen.add(ref);

  if (!ref.startsWith("#/")) return undefined; // external refs не поддерживаются

  const path = ref.slice(2).split("/");
  let target = spec;
  for (const segment of path) {
    if (target == null) return undefined;
    target = target[decodeJsonPointer(segment)];
  }

  if (target && typeof target === "object" && target.$ref) {
    return resolveRef(target, spec, seen);
  }
  return target;
}

function decodeJsonPointer(segment) {
  return segment.replace(/~1/g, "/").replace(/~0/g, "~");
}
