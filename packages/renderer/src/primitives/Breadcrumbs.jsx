/**
 * Breadcrumbs — вертикальная навигационная цепочка с click'абельными предками.
 *
 * Node-shape:
 *   {
 *     type: "breadcrumbs",
 *     items: [
 *       { label: "Metalakes", projection: "metalake_list" },
 *       { label: "prod_metalake", projection: "metalake_detail", params: { metalakeId: "m1" } },
 *       { label: "Catalog", projection: "catalog_detail", params: { catalogId: "c1" }, current: true },
 *     ],
 *     separator: "›", // optional, default "›"
 *   }
 *
 * Последний элемент считается current (если не помечен `current: true` явно —
 * берётся `items[items.length - 1]`). Current не кликабелен, визуально выделен.
 * Остальные — buttons → ctx.navigate(projection, params).
 *
 * Adapter-delegation: если адаптер даёт `getAdaptedComponent("primitive", "breadcrumbs")`
 * и capability `breadcrumbs` enabled — рендер через адаптер. Иначе SVG-fallback
 * с CSS-tokens.
 */
export default function Breadcrumbs({ node, ctx }) {
  const items = Array.isArray(node?.items) ? node.items : [];
  if (items.length === 0) return null;

  const separator = node?.separator ?? "›";

  // Adapter-delegation, если есть
  const Adapted = ctx?.adapter?.getComponent?.("primitive", "breadcrumbs");
  if (Adapted) {
    return <Adapted node={node} ctx={ctx} />;
  }

  // SVG-fallback
  return (
    <nav aria-label="Breadcrumbs" style={rootStyle}>
      <ol style={listStyle}>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const isCurrent = item.current === true || (isLast && !items.some(x => x.current === true));
          return (
            <li key={i} style={itemStyle}>
              {isCurrent ? (
                <span aria-current="page" style={currentStyle}>{item.label}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!ctx?.navigate || !item.projection) return;
                    ctx.navigate(item.projection, item.params || {});
                  }}
                  style={linkStyle}
                >
                  {item.label}
                </button>
              )}
              {!isLast && (
                <span aria-hidden="true" style={separatorStyle}>{separator}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const rootStyle = {
  fontSize: 13,
  lineHeight: 1.4,
};

const listStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 4,
  margin: 0,
  padding: 0,
  listStyle: "none",
};

const itemStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};

const linkStyle = {
  background: "transparent",
  border: "none",
  padding: "2px 4px",
  color: "var(--idf-accent, #2563eb)",
  cursor: "pointer",
  fontSize: "inherit",
  fontFamily: "inherit",
  textDecoration: "none",
  borderRadius: 2,
};

const currentStyle = {
  color: "var(--idf-text, #1a1a2e)",
  fontWeight: 600,
  padding: "2px 4px",
};

const separatorStyle = {
  color: "var(--idf-text-muted, #9ca3af)",
  userSelect: "none",
  padding: "0 2px",
};
