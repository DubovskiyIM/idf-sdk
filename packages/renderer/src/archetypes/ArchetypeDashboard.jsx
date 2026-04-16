/**
 * ArchetypeDashboard — grid виджетов, каждый — одна из трёх форм:
 *
 *   { projection, title, size }                  — embedded ProjectionRendererV2
 *   { key, aggregate, title, size, unit? }       — скалярный агрегат
 *   { key, inline: { entity, filter, sort },
 *     title, size }                              — встроенный мини-список
 *
 * Aggregate-синтаксис (string):
 *   sum(collection, field [, filterExpr...])
 *   avg(collection, field [, filterExpr...])
 *   count(collection [, filterExpr...])
 * Каждый filterExpr: `field <op> <value>`, op ∈ {=, !=, >, <, >=, <=}.
 * value: literal | viewer.x | today | now.
 *
 * Inline — entity приводится к camelCase-плюрал-имени коллекции world.
 * filter — JS-expression от {item, viewer}; sort — `field:asc|desc`.
 */
import ProjectionRendererV2 from "../ProjectionRendererV2.jsx";
import { evalCondition } from "../eval.js";
import EmptyState from "../primitives/EmptyState.jsx";
import {
  toCollection,
  parseAggregate,
  evalAggregate,
  formatScalar,
  sortItems,
} from "./dashboardWidgets.js";

export default function ArchetypeDashboard({ slots, ctx }) {
  const widgets = slots.body?.widgets || [];
  const { artifacts, allProjections, navigate, world, exec, execBatch, viewer, viewerContext, theme } = ctx;

  if (widgets.length === 0) {
    return <EmptyState icon="📊" title="Пока смотреть нечего" hint="Здесь появятся виджеты, когда в проекцию добавят агрегаты, проекции-ссылки или встроенные списки." />;
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
      gap: 16,
      padding: 16,
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
      overflowX: "hidden",
    }}>
      {widgets.map((w, i) => {
        const isFull = w.size === "full";
        const wrapStyle = { ...cardStyle, gridColumn: isFull ? "1 / -1" : undefined };

        if (w.projection) {
          const widgetArtifact = artifacts?.[w.projection];
          const widgetProjection = allProjections?.[w.projection];
          if (!widgetArtifact) {
            return (
              <div key={i} style={wrapStyle}>
                <div style={headerStyle}>{w.title || w.projection}</div>
                <EmptyState size="sm" icon="📭" title="Нет данных" hint="Виджет ждёт, когда будут готовы исходные данные." />
              </div>
            );
          }
          return (
            <div key={w.projection} style={wrapStyle}>
              <div
                style={headerStyle}
                onClick={() => navigate?.(w.projection, {})}
                title={`Открыть ${w.title || w.projection}`}
              >
                {w.title || widgetProjection?.name || w.projection}
                <span style={{ fontSize: 10, color: "var(--mantine-color-dimmed, #9ca3af)", marginLeft: 8 }}>→</span>
              </div>
              <div style={{ maxHeight: 300, overflow: "auto" }}>
                <ProjectionRendererV2
                  artifact={widgetArtifact}
                  projection={widgetProjection}
                  world={world}
                  exec={exec}
                  execBatch={execBatch}
                  viewer={viewer}
                  viewerContext={viewerContext}
                  routeParams={{}}
                  navigate={navigate}
                  theme={theme}
                  artifacts={artifacts}
                  allProjections={allProjections}
                />
              </div>
            </div>
          );
        }

        if (w.aggregate) {
          const spec = parseAggregate(w.aggregate);
          const value = evalAggregate(spec, { world, viewer });
          return (
            <div key={w.key || i} style={wrapStyle}>
              <div style={headerStyle}>{w.title || w.key}</div>
              <div style={{ padding: "20px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "var(--mantine-color-text, #1a1a2e)" }}>
                  {formatScalar(value, spec?.field)}
                </div>
                {w.unit && <div style={{ fontSize: 11, color: "var(--mantine-color-dimmed, #9ca3af)", marginTop: 4 }}>{w.unit}</div>}
              </div>
            </div>
          );
        }

        if (w.inline) {
          const { entity, filter, sort } = w.inline;
          const coll = toCollection(entity);
          let items = (coll && world?.[coll]) || [];
          if (filter) items = items.filter(item => evalCondition(filter, { item, viewer }));
          if (sort) items = sortItems(items, sort);
          const visible = items.slice(0, 10);
          return (
            <div key={w.key || i} style={wrapStyle}>
              <div style={headerStyle}>{w.title || w.key} <span style={{ fontSize: 11, color: "var(--mantine-color-dimmed, #9ca3af)", fontWeight: 400 }}>({items.length})</span></div>
              <div style={{ maxHeight: 300, overflow: "auto" }}>
                {visible.length === 0 ? (
                  <EmptyState size="sm" icon="📭" title="Пока ничего" />
                ) : visible.map(it => (
                  <div key={it.id} style={{ padding: "8px 16px", borderBottom: "1px solid var(--mantine-color-default-border, #f3f4f6)", fontSize: 12 }}>
                    <div style={{ fontWeight: 500 }}>{it.name || it.title || it.id}</div>
                    {it.status && <div style={{ color: "var(--mantine-color-dimmed, #9ca3af)", fontSize: 11 }}>{it.status}</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div key={i} style={wrapStyle}>
            <div style={headerStyle}>{w.title || w.key || `Widget ${i}`}</div>
            <div style={{ padding: 16, color: "var(--mantine-color-dimmed, #9ca3af)", fontSize: 12 }}>
              Виджет неизвестной формы: ожидается projection / aggregate / inline.
            </div>
          </div>
        );
      })}
    </div>
  );
}

const cardStyle = {
  background: "var(--color-doodle-bg, var(--mantine-color-body, #fff))",
  border: "1.5px solid var(--color-doodle-ink, var(--mantine-color-default-border, #e5e7eb))",
  borderRadius: "var(--radius-doodle, 8px)",
  overflow: "hidden",
  boxShadow: "2px 2px 0 var(--color-doodle-ink, transparent)",
  minWidth: 0,
  maxWidth: "100%",
};

const headerStyle = {
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 600,
  color: "var(--mantine-color-text, #1a1a2e)",
  borderBottom: "1px solid var(--mantine-color-default-border, #e5e7eb)",
  cursor: "pointer",
  userSelect: "none",
};
