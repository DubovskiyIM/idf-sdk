/**
 * ResourceTree — древовидный inline-list для Kubernetes-style ресурсов
 * (Deployment → ReplicaSet → Pod, Service, ConfigMap, ...). Backlog §10.4c
 * (ArgoCD G-A-4c).
 *
 * Подходит для inline-arrays (Application.status.resources[]) с
 * иерархией через ownerReferences или через явный `parentField`.
 *
 * Props:
 *   items         — массив объектов
 *   nameField     — поле для отображения имени ресурса (default "name")
 *   kindField     — поле kind / type (default "kind")
 *   parentField   — поле, ссылающееся на parent.name (опционально); если
 *                   задано — строится parent-child граф, depth = traversal
 *   levelField    — поле явного уровня вложенности (если задано — приоритет
 *                   над parentField)
 *   iconMap       — map kind → emoji/icon (extends DEFAULT_ICONS)
 *   badgeColumns  — массив { field, colorMap, label? } — render как Tag
 *                   справа от имени, для каждого item
 *   onItemClick   — callback (item) => void для row-click (опционально)
 *
 * Без adapter-delegation — pure HTML primitive. Стилизация через CSS-vars.
 */

const DEFAULT_KIND_ICONS = {
  Deployment: "📦",
  StatefulSet: "📚",
  DaemonSet: "🛡",
  ReplicaSet: "🔁",
  Pod: "🐳",
  Service: "🔌",
  Ingress: "🌐",
  ConfigMap: "⚙",
  Secret: "🔐",
  Job: "⚡",
  CronJob: "⏰",
  PersistentVolume: "💾",
  PersistentVolumeClaim: "🗂",
  Namespace: "📁",
  ServiceAccount: "👤",
  Role: "🔑",
  RoleBinding: "🔗",
  ClusterRole: "🔑",
  ClusterRoleBinding: "🔗",
  HorizontalPodAutoscaler: "📈",
  NetworkPolicy: "🛡",
  CustomResourceDefinition: "📋",
};

const DEFAULT_TONE_COLORS = {
  success: { bg: "#dcfce7", fg: "#15803d" },
  warning: { bg: "#fef3c7", fg: "#b45309" },
  danger: { bg: "#fee2e2", fg: "#b91c1c" },
  info: { bg: "#dbeafe", fg: "#1d4ed8" },
  neutral: { bg: "#f3f4f6", fg: "#4b5563" },
  default: { bg: "#eef2ff", fg: "#6366f1" },
};

/**
 * Группирует items в дерево по parentField. Возвращает flat-list
 * [{ item, level }] в depth-first порядке. Items без parent (root) —
 * level 0; их children — level 1, etc. Циклы предотвращаются через
 * `visited`-set. Items на которых ссылается parentField, но parent не
 * найден — рендерятся как root (level 0).
 */
function buildTreeOrder(items, { nameField, parentField, levelField }) {
  if (!Array.isArray(items) || items.length === 0) return [];

  // Если levelField — используем его, без parent-graph
  if (levelField) {
    return items.map((item) => ({
      item,
      level: Math.max(0, Number(item[levelField]) || 0),
    }));
  }

  if (!parentField) {
    return items.map((item) => ({ item, level: 0 }));
  }

  const byName = new Map();
  for (const it of items) {
    const key = it[nameField];
    if (key) byName.set(key, it);
  }

  const childrenOf = new Map();
  const roots = [];
  for (const it of items) {
    const parent = it[parentField];
    if (parent && byName.has(parent)) {
      if (!childrenOf.has(parent)) childrenOf.set(parent, []);
      childrenOf.get(parent).push(it);
    } else {
      roots.push(it);
    }
  }

  const result = [];
  const visited = new Set();
  const walk = (item, level) => {
    const key = item[nameField];
    if (key && visited.has(key)) return;
    if (key) visited.add(key);
    result.push({ item, level });
    const kids = (key && childrenOf.get(key)) || [];
    for (const k of kids) walk(k, level + 1);
  };
  for (const r of roots) walk(r, 0);

  // Items, оставшиеся после walk (не посещены — например, в orphan-cycle):
  // дописать flat в конец, чтобы не потерять.
  for (const it of items) {
    const key = it[nameField];
    if (key && !visited.has(key)) {
      result.push({ item: it, level: 0 });
      visited.add(key);
    }
  }

  return result;
}

function BadgeCell({ value, colorMap }) {
  if (value == null || value === "") return null;
  const tone = colorMap?.[value] || "default";
  const c = DEFAULT_TONE_COLORS[tone] || DEFAULT_TONE_COLORS.default;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        padding: "2px 8px",
        borderRadius: 4,
        background: c.bg,
        color: c.fg,
        whiteSpace: "nowrap",
      }}
    >
      {String(value)}
    </span>
  );
}

export function ResourceTree({
  items,
  nameField = "name",
  kindField = "kind",
  parentField,
  levelField,
  iconMap,
  badgeColumns,
  onItemClick,
}) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const icons = { ...DEFAULT_KIND_ICONS, ...(iconMap || {}) };
  const ordered = buildTreeOrder(items, { nameField, parentField, levelField });

  return (
    <div data-resource-tree style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {ordered.map(({ item, level }, idx) => {
        const kind = kindField ? item[kindField] : null;
        const name = nameField ? item[nameField] : null;
        const icon = kind ? icons[kind] || "📄" : "📄";
        const clickable = typeof onItemClick === "function";

        return (
          <div
            key={item.id ?? `${name}_${idx}`}
            data-resource-row
            data-level={level}
            onClick={clickable ? () => onItemClick(item) : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              paddingLeft: 12 + level * 20,
              background: "var(--idf-hover, transparent)",
              border: "1px solid var(--idf-border, #e5e7eb)",
              borderRadius: 6,
              cursor: clickable ? "pointer" : "default",
              fontSize: 13,
            }}
          >
            <span style={{ fontSize: 14, flexShrink: 0 }} aria-hidden>
              {icon}
            </span>
            {kind && (
              <span style={{
                fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                color: "var(--idf-text-muted, #6b7280)", flexShrink: 0,
                minWidth: 100,
              }}>
                {kind}
              </span>
            )}
            <span style={{
              flex: 1, minWidth: 0, overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap",
              color: "var(--idf-text, #111827)",
            }}>
              {name ?? "—"}
            </span>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {(badgeColumns || []).map((col) => (
                <BadgeCell
                  key={col.field}
                  value={item[col.field]}
                  colorMap={col.colorMap}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ResourceTree;
