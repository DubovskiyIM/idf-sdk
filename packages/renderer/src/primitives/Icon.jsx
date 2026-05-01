/**
 * <Icon/> — централизованный icon primitive (D12).
 *
 * Canonical names — semantic, не привязаны к emoji или lucide-react:
 * "schema" / "table" / "fileset" / "topic" / "model" / "function" /
 * "role" / "policy" / "tag" / "user" / "group" / "edit" / "delete" /
 * "key" / "gear" / "lock" / "search" / "expand" / "collapse" / ...
 *
 * Resolver-цепочка:
 *   1. Custom resolver через registerIconResolver(fn) — host-side.
 *   2. lucide-react lookup (имя → component из lucide-react/icons).
 *   3. Emoji fallback (EMOJI_MAP).
 *   4. Generic ⬚ glyph.
 *
 * Host gravitino: registerIconResolver вернёт кастомные icons для специфичных
 * нужд (например, postgres-elephant вместо database).
 */
import { useMemo } from "react";

// ═══ Emoji fallback map ════════════════════════════════════════════════
// Используется когда lucide не resolve'ит и custom resolver не зарегистрирован.
const EMOJI_MAP = {
  schema:    "📂",
  table:     "🗒",
  fileset:   "📁",
  topic:     "📡",
  model:     "🤖",
  function:  "𝑓",
  role:      "🎭",
  policy:    "📜",
  tag:       "🏷",
  user:      "👤",
  group:     "👥",
  edit:      "✎",
  delete:    "🗑",
  key:       "🔑",
  gear:      "⚙",
  lock:      "🔒",
  search:    "🔍",
  expand:    "▸",
  collapse:  "▼",
  refresh:   "↻",
  add:       "+",
  close:     "✕",
  check:     "✓",
  warning:   "⚠",
  info:      "ℹ",
  link:      "🔗",
  unlink:    "🚫",
  download:  "⬇",
  upload:    "⬆",
  metalake:  "🏛",
  catalog:   "📒",
};

// ═══ Lucide-react component name map ═══════════════════════════════════
// Maps canonical → PascalCase lucide name. Lucide-react exports каждую icon
// как named export (e.g., import { FolderOpen } from "lucide-react").
const LUCIDE_MAP = {
  schema:    "FolderOpen",
  table:     "Table2",
  fileset:   "Folder",
  topic:     "Radio",
  model:     "Bot",
  function:  "FunctionSquare",
  role:      "Drama",
  policy:    "ScrollText",
  tag:       "Tag",
  user:      "User",
  group:     "Users",
  edit:      "Pencil",
  delete:    "Trash2",
  key:       "Key",
  gear:      "Settings",
  lock:      "Lock",
  search:    "Search",
  expand:    "ChevronRight",
  collapse:  "ChevronDown",
  refresh:   "RefreshCw",
  add:       "Plus",
  close:     "X",
  check:     "Check",
  warning:   "AlertTriangle",
  info:      "Info",
  link:      "Link",
  unlink:    "Unlink",
  download:  "Download",
  upload:    "Upload",
  metalake:  "Database",
  catalog:   "Library",
};

// ═══ Custom resolver registry ═══════════════════════════════════════════
let customResolver = null;
export function registerIconResolver(fn) {
  customResolver = typeof fn === "function" ? fn : null;
}
export function getIconResolver() { return customResolver; }

// ═══ Lucide loader (lazy) ═══════════════════════════════════════════════
// Pulls lucide-react только если она реально установлена в host. Loader
// ленивый — попытка require'a при первом use; если ESM — нужен import.
//
// Lucide-react НЕ объявлен peerDep renderer'a (это бы ломало DTS resolution
// из-за @types/react diamond). Lucide уже peer adapter-{mantine,shadcn,apple,
// antd} — host получает её через adapter setup. Если lucide отсутствует —
// resolver падает back на emoji-map.
let _lucide = null;
let _lucideAttempted = false;
function getLucide() {
  if (_lucideAttempted) return _lucide;
  _lucideAttempted = true;
  try {
    // eslint-disable-next-line global-require
    _lucide = require("lucide-react");
  } catch {
    _lucide = null;
  }
  return _lucide;
}

// ═══ Icon component ════════════════════════════════════════════════════
export default function Icon({
  name, size = 14, color, mode = "auto", strokeWidth = 1.75, style,
  ...rest
}) {
  const resolved = useMemo(() => {
    // 1. Custom resolver
    if (customResolver) {
      const r = customResolver(name, { size, color, mode });
      if (r != null) return { kind: "custom", el: r };
    }
    // 2. Mode override
    if (mode === "emoji") return { kind: "emoji", char: EMOJI_MAP[name] || "⬚" };
    if (mode === "none") return { kind: "none" };

    // 3. Lucide lookup (если mode=auto или mode=lucide)
    const lucide = getLucide();
    const lucideName = LUCIDE_MAP[name];
    if (lucide && lucideName && lucide[lucideName]) {
      return { kind: "lucide", Component: lucide[lucideName] };
    }

    // 4. Emoji fallback
    if (EMOJI_MAP[name]) return { kind: "emoji", char: EMOJI_MAP[name] };

    // 5. Generic glyph
    return { kind: "emoji", char: "⬚" };
  }, [name, size, color, mode]);

  if (resolved.kind === "none") return null;
  if (resolved.kind === "custom") return resolved.el;
  if (resolved.kind === "lucide") {
    const C = resolved.Component;
    return (
      <C
        size={size}
        color={color || "currentColor"}
        strokeWidth={strokeWidth}
        aria-label={name}
        style={{ display: "inline-block", verticalAlign: "middle", ...style }}
        {...rest}
      />
    );
  }
  // emoji
  return (
    <span
      role="img"
      aria-label={name}
      style={{
        display: "inline-block",
        fontSize: size + 2,
        lineHeight: 1,
        color: color || "currentColor",
        ...style,
      }}
    >{resolved.char}</span>
  );
}

export { EMOJI_MAP, LUCIDE_MAP };
