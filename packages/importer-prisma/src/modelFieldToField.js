const TYPE_MAP = {
  String: "string",
  Int: "number",
  BigInt: "number",
  Float: "number",
  Decimal: "number",
  Boolean: "boolean",
  DateTime: "datetime",
  Json: "json",
  Bytes: "string",
};

const PRIMARY_TITLE_NAMES = new Set(["title", "name", "label"]);
const DATE_WITNESS_SUFFIXES = ["At", "On", "_at", "_on"];
const CONTACT_NAMES = new Set(["email", "phone"]);
const MONEY_NAMES = new Set(["price", "amount", "total", "cost", "fee"]);
const STATUS_PREFIXES = ["is", "has", "is_", "has_"];

function inferRole(name, type) {
  const lower = name.toLowerCase();
  if (PRIMARY_TITLE_NAMES.has(lower)) return "primary-title";
  if (DATE_WITNESS_SUFFIXES.some((s) => name.endsWith(s))) return "date-witness";
  if (CONTACT_NAMES.has(lower)) return "contact";
  if (MONEY_NAMES.has(lower) && type === "number") return "money";
  if (type === "boolean") {
    for (const p of STATUS_PREFIXES) {
      if (name.startsWith(p)) return "status-flag";
    }
  }
  return undefined;
}

function parseDefaultArg(arg) {
  if (!arg) return undefined;
  const v = arg.value;
  // Function (cuid, uuid, now, autoincrement) — игнорируем
  if (v && typeof v === "object" && v.type === "function") return undefined;
  if (typeof v === "string") {
    const m = v.match(/^"(.*)"$/);
    if (m) return m[1];
    if (v === "true" || v === "false") return v === "true";
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  }
  return undefined;
}

/**
 * Prisma field → IDF field.
 * Если fieldType указывает на другую модель — возвращает null (это relation, не scalar).
 */
export function modelFieldToField(pfield, modelNames = new Set()) {
  if (modelNames.has(pfield.fieldType)) return null;
  if (pfield.array) return null; // list-relations

  const type = TYPE_MAP[pfield.fieldType] ?? "string";
  const role = inferRole(pfield.name, type);

  const hasIdAttr = pfield.attributes?.some((a) => a.name === "id");
  const hasUpdatedAt = pfield.attributes?.some((a) => a.name === "updatedAt");
  const hasCreatedAt = pfield.attributes?.some((a) =>
    a.name === "default" && a.args?.some((arg) =>
      arg.value && typeof arg.value === "object" && arg.value.name === "now"
    )
  );

  const isDateWitness = role === "date-witness" || hasUpdatedAt;
  const finalRole = hasUpdatedAt && type === "datetime" ? "date-witness" : role;
  const readOnly = hasIdAttr || hasUpdatedAt || hasCreatedAt || isDateWitness || pfield.name === "id";

  const field = { type };
  if (finalRole) field.role = finalRole;
  if (readOnly) field.readOnly = true;

  const defaultAttr = pfield.attributes?.find((a) => a.name === "default");
  if (defaultAttr) {
    const defaultVal = parseDefaultArg(defaultAttr.args?.[0]);
    if (defaultVal !== undefined) field.default = defaultVal;
  }

  return field;
}
