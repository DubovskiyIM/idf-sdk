/**
 * TreeNav — hierarchical navigation panel (UI-gap pattern apply #24).
 *
 * Node-shape:
 *   {
 *     type: "treeNav",
 *     root: "Metalake",
 *     levels: [
 *       { depth: 0, entity: "Metalake", children: ["Catalog"] },
 *       { depth: 1, entity: "Catalog",  children: ["Schema"] },
 *       { depth: 2, entity: "Schema",   children: ["Table"] },
 *     ],
 *   }
 *
 * Рендерит схему иерархии (типовая структура), не runtime instances.
 * Кликабельность узлов-entities — navigate на <entity>_list или
 * <entity>_detail, если такие projections есть в runtime context.
 *
 * Для полноценной tree-навигации с runtime items (expand-collapse по
 * entity instance) — нужен отдельный primitive + ctx.world интеграция.
 * Текущая реализация — schema-preview.
 */
export default function TreeNav({ node, ctx }) {
  const levels = Array.isArray(node?.levels) ? node.levels : [];
  if (levels.length === 0) return null;

  const navigate = (entity) => {
    if (!ctx?.navigate) return;
    // Попытка: <entity>_list → <entity>_detail как fallback.
    const listId = `${entity.toLowerCase()}_list`;
    const detailId = `${entity.toLowerCase()}_detail`;
    ctx.navigate(listId, { entity }) || ctx.navigate(detailId, { entity });
  };

  return (
    <nav
      aria-label="Hierarchy"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "8px 4px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--idf-text-muted, #6b7280)",
          textTransform: "uppercase",
          letterSpacing: "0.4px",
          marginBottom: 6,
          paddingLeft: 4,
        }}
      >
        Иерархия
      </div>
      {levels.map((level, i) => (
        <div
          key={level.entity + i}
          data-tree-level={level.depth}
          style={{ paddingLeft: level.depth * 14 }}
        >
          <button
            type="button"
            onClick={() => navigate(level.entity)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              width: "100%",
              padding: "4px 8px",
              borderRadius: 4,
              border: "none",
              background: "transparent",
              color: "var(--idf-text, #1a1a2e)",
              fontSize: 13,
              textAlign: "left",
              cursor: ctx?.navigate ? "pointer" : "default",
            }}
          >
            {level.depth > 0 && (
              <span
                style={{
                  color: "var(--idf-text-muted, #9ca3af)",
                  fontSize: 10,
                }}
              >
                ↳
              </span>
            )}
            <span>{level.entity}</span>
            {level.children?.length > 0 && (
              <span
                style={{
                  marginLeft: "auto",
                  color: "var(--idf-text-muted, #9ca3af)",
                  fontSize: 11,
                }}
              >
                {level.children.length}
              </span>
            )}
          </button>
        </div>
      ))}
    </nav>
  );
}
