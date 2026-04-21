const TYPE_MAP = {
  "integer": "number",
  "bigint": "number",
  "smallint": "number",
  "numeric": "number",
  "real": "number",
  "double precision": "number",
  "boolean": "boolean",
  "uuid": "string",
  "text": "string",
  "character varying": "string",
  "character": "string",
  "timestamp without time zone": "datetime",
  "timestamp with time zone": "datetime",
  "date": "datetime",
  "json": "json",
  "jsonb": "json",
};

const PRIMARY_TITLE_NAMES = new Set(["title", "name", "label"]);
const DATE_WITNESS_SUFFIXES = ["_at", "_on"];
const CONTACT_NAMES = new Set(["email", "phone"]);
const MONEY_NAMES = new Set(["price", "amount", "total", "cost", "fee"]);
const STATUS_PREFIXES = ["is_", "has_"];
const STATUS_NAMES = new Set(["active", "enabled", "deleted"]);

function inferRole(name, type) {
  const lower = name.toLowerCase();
  if (PRIMARY_TITLE_NAMES.has(lower)) return "primary-title";
  if (DATE_WITNESS_SUFFIXES.some((s) => lower.endsWith(s))) return "date-witness";
  if (CONTACT_NAMES.has(lower)) return "contact";
  if (MONEY_NAMES.has(lower) && type === "number") return "money";
  if (STATUS_PREFIXES.some((p) => lower.startsWith(p)) && type === "boolean") return "status-flag";
  if (STATUS_NAMES.has(lower) && type === "boolean") return "status-flag";
  return undefined;
}

function parseDefault(raw) {
  if (!raw) return undefined;
  const m = raw.match(/^'(.*)'::[a-z][\w\s]*$/);
  if (m) return m[1];
  if (raw === "true" || raw === "false") return raw === "true";
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return undefined;
}

export function mapColumn(col, opts = {}) {
  const type = TYPE_MAP[col.data_type] ?? "string";
  const name = col.column_name;
  const role = inferRole(name, type);
  const isDateWitness = role === "date-witness";
  const isId = name === "id";
  const readOnly = opts.isPrimaryKey || isDateWitness || isId;

  const field = { type };
  if (role) field.role = role;
  if (readOnly) field.readOnly = true;

  const defaultVal = parseDefault(col.column_default);
  if (defaultVal !== undefined) field.default = defaultVal;

  return field;
}
