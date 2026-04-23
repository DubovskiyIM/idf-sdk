import ChipList from "./ChipList.jsx";

/**
 * Pluralization как collection-key (lowercase first): "Dispatcher" → "dispatchers".
 */
function pluralizeEn(entity) {
  if (!entity) return "";
  const first = entity.charAt(0).toLowerCase();
  const rest = entity.slice(1);
  const base = first + rest;
  if (/[sxz]$/.test(base) || /(ch|sh)$/.test(base)) return base + "es";
  return base + "s";
}

export function pluralizeAsLabel(entity) {
  if (!entity) return "";
  if (/[sxz]$/.test(entity) || /(ch|sh)$/.test(entity)) return entity + "es";
  return entity + "s";
}

/**
 * Резолвит chips для одной rowAssociation + item: junction-записи, где
 * junction[assoc.foreignKey] === item.id, матчатся к other-entity (Lookup
 * по assoc.otherField → other.name/title/label).
 */
export function resolveChipsForAssoc(assoc, item, ctx) {
  if (!assoc?.junction || !assoc.foreignKey || !item?.id || !ctx?.world) return [];
  const junctionKey = pluralizeEn(assoc.junction);
  const junctionRows = (ctx.world[junctionKey] || []).filter(
    j => j && j[assoc.foreignKey] === item.id,
  );
  const otherKey = assoc.otherEntity ? pluralizeEn(assoc.otherEntity) : null;
  const otherCollection = otherKey ? (ctx.world[otherKey] || []) : null;
  return junctionRows.map((j, idx) => {
    const otherId = assoc.otherField ? j[assoc.otherField] : null;
    let label = otherId || j.id || `#${idx}`;
    if (otherCollection && otherId) {
      const other = otherCollection.find(o => o.id === otherId);
      if (other) label = other.name || other.title || other.label || otherId;
    }
    return { id: j.id, junctionRow: j, label, name: label };
  });
}

/**
 * RowAssociationChips — рендерит ChipList с attach/detach для одного
 * rowAssociation (pattern inline-chip-association). Используется в DataGrid
 * (как cell) и в list/grid catalog-layouts (как footer row-item).
 *
 * Props:
 *   - assoc: entry из slots.rowAssociations (junction, foreignKey, otherField,
 *            otherEntity, attachIntent, detachIntent)
 *   - item: текущая row/card (mainEntity-запись)
 *   - ctx: world + exec + adapter
 *   - layout?: "inline" (default, одна строка) | "stacked" (chips под меткой)
 */
export default function RowAssociationChips({ assoc, item, ctx, layout = "inline" }) {
  if (!assoc?.junction || !assoc.foreignKey || !ctx?.world || !item) return null;

  const chips = resolveChipsForAssoc(assoc, item, ctx);

  const handleDetach = chips.length > 0 && assoc.detachIntent && ctx.exec ? (chip) => {
    ctx.exec(assoc.detachIntent, { id: chip.junctionRow?.id, [assoc.foreignKey]: item.id });
  } : undefined;

  const handleAdd = assoc.attachIntent && ctx.exec ? () => {
    ctx.exec(assoc.attachIntent, { [assoc.foreignKey]: item.id });
  } : undefined;

  const inner = (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}
      onClick={(e) => e.stopPropagation()}
    >
      <ChipList
        value={chips}
        variant="tag"
        onDetach={handleDetach}
        emptyLabel=""
        ctx={ctx}
      />
      {handleAdd && (
        <button
          type="button"
          onClick={handleAdd}
          aria-label={`Add ${assoc.otherEntity || "item"}`}
          title={`Добавить ${assoc.otherEntity || ""}`.trim()}
          style={chipAddButtonStyle}
        >
          +
        </button>
      )}
    </span>
  );

  if (layout === "stacked") {
    return (
      <div style={stackedStyle}>
        <span style={stackedLabelStyle}>
          {assoc.otherEntity ? pluralizeAsLabel(assoc.otherEntity) : assoc.junction}
        </span>
        {inner}
      </div>
    );
  }
  return inner;
}

const chipAddButtonStyle = {
  width: 20,
  height: 20,
  padding: 0,
  border: "1px dashed var(--idf-border, #d1d5db)",
  borderRadius: 10,
  background: "transparent",
  color: "var(--idf-text-muted, #6b7280)",
  fontSize: 13,
  lineHeight: 1,
  cursor: "pointer",
};

const stackedStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 3,
  marginTop: 6,
};

const stackedLabelStyle = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--idf-text-muted, #6b7280)",
};
