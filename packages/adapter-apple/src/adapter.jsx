/**
 * Apple visionOS-glass UI-адаптер.
 * Третий после Mantine + shadcn-doodle.
 */
import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import {
  Pencil, Trash2, Plus, Check, X, MoreHorizontal, Search,
  ChevronDown, Pin, Reply, Send, Star, Bell, BellOff,
  Archive, Copy, Eye, Lock, Unlock, Settings, User, LogOut,
  Play, Square, Save, Download, Upload, RefreshCw, Filter,
  Calendar, Clock, Heart, ThumbsUp, ThumbsDown, Flag,
  MessageSquare, Phone, Video, Mic, MicOff, Volume2, VolumeX,
  Link, Unlink, Move, Maximize2, AlertTriangle, Info, HelpCircle,
  ArrowRight, ArrowLeft, Home, Target, Award, TrendingUp,
  Flame, Zap, BookOpen, Dumbbell, DollarSign, Briefcase, Users,
  Smile, Palette, Umbrella, Globe, Compass, CheckSquare,
  BarChart3, LineChart, PieChart, Lightbulb,
} from "lucide-react";
import "./theme.css";

// ─── EMOJI → LUCIDE ───
const EMOJI_TO_LUCIDE = {
  "✎": Pencil, "✏️": Pencil, "🗑": Trash2, "🗑️": Trash2,
  "➕": Plus, "+": Plus, "✓": Check, "✔": Check, "✔️": Check,
  "✕": X, "✗": X, "❌": X, "⋯": MoreHorizontal, "…": MoreHorizontal,
  "🔍": Search, "📌": Pin, "📍": Pin, "↩": Reply, "↩️": Reply,
  "📤": Send, "⭐": Star, "🔔": Bell, "🔕": BellOff,
  "📦": Archive, "📋": Copy, "👁": Eye, "🔒": Lock, "🔓": Unlock,
  "⚙": Settings, "⚙️": Settings, "👤": User, "🚪": LogOut,
  "▶": Play, "⏹": Square, "💾": Save, "📥": Download, "📤": Upload,
  "🔄": RefreshCw, "🔃": RefreshCw, "🗂": Filter,
  "📅": Calendar, "🕐": Clock, "❤️": Heart, "👍": ThumbsUp, "👎": ThumbsDown,
  "🚩": Flag, "💬": MessageSquare, "📞": Phone, "📹": Video,
  "🎤": Mic, "🔇": MicOff, "🔊": Volume2, "🔈": VolumeX,
  "🔗": Link, "✂": Unlink, "↔": Move, "⤢": Maximize2,
  "⚠": AlertTriangle, "⚠️": AlertTriangle, "ℹ": Info, "ℹ️": Info, "❓": HelpCircle,
  "→": ArrowRight, "←": ArrowLeft, "🏠": Home,
  "🎯": Target, "🏆": Award, "📈": TrendingUp,
  "🔥": Flame, "⚡": Zap, "📚": BookOpen, "💪": Dumbbell,
  "💰": DollarSign, "💼": Briefcase, "🤝": Users,
  "🧘": Smile, "🎨": Palette, "🏖️": Umbrella, "🌍": Globe, "🧭": Compass,
  "✅": CheckSquare, "☐": CheckSquare,
  "📊": BarChart3, "📉": LineChart, "🔬": PieChart, "💡": Lightbulb,
};

function resolveLucide(emoji) {
  if (!emoji) return null;
  return EMOJI_TO_LUCIDE[emoji] || null;
}

// ─── Shared input style (Apple HIG) ───
const inputStyle = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid rgba(60, 60, 67, 0.18)",
  background: "rgba(255, 255, 255, 0.9)",
  padding: "12px 16px",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif",
  fontSize: 17,
  letterSpacing: "-0.41px",
  color: "#1c1c1e",
  outline: "none",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};

const labelStyle = {
  fontSize: 15,
  fontWeight: 400,
  letterSpacing: "-0.24px",
  color: "#3c3c43",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
  marginBottom: 6,
};

// ─── Parameter Controls ───

function AppleTextInput({ spec, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {spec.label && <label style={labelStyle}>{spec.label}</label>}
      <input
        type={spec.type === "email" ? "email" : spec.type === "url" ? "url" : spec.type === "tel" ? "tel" : "text"}
        style={inputStyle}
        placeholder={spec.placeholder || ""}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        required={spec.required}
      />
    </div>
  );
}

function AppleTextarea({ spec, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {spec.label && <label style={labelStyle}>{spec.label}</label>}
      <textarea
        style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
        placeholder={spec.placeholder || ""}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        rows={3}
      />
    </div>
  );
}

function AppleNumber({ spec, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {spec.label && <label style={labelStyle}>{spec.label}</label>}
      <input
        type="number"
        style={inputStyle}
        value={value ?? ""}
        onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))}
        min={spec.min}
        max={spec.max}
      />
    </div>
  );
}

function AppleRange({ spec, value, onChange }) {
  const min = spec.min ?? 0;
  const max = spec.max ?? 100;
  const current = value ?? min;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {spec.label && <label style={labelStyle}>{spec.label}</label>}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <input
          type="range"
          min={min}
          max={max}
          value={current}
          onChange={e => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: "#007aff" }}
        />
        <span style={{
          fontSize: 22, fontWeight: 700, minWidth: 48, textAlign: "center",
          color: "#007aff",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
        }}>{current}%</span>
      </div>
    </div>
  );
}

function AppleDateTime({ spec, value, onChange }) {
  const isTimeOnly = spec.name && /time/i.test(spec.name) && !/date/i.test(spec.name);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {spec.label && <label style={labelStyle}>{spec.label}</label>}
      <input
        type={isTimeOnly ? "time" : "date"}
        style={inputStyle}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function AppleSelect({ spec, value, onChange }) {
  const options = spec.options || [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {spec.label && <label style={labelStyle}>{spec.label}</label>}
      <SelectPrimitive.Root value={value || ""} onValueChange={onChange}>
        <SelectPrimitive.Trigger
          style={{
            ...inputStyle,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            cursor: "pointer",
          }}
        >
          <SelectPrimitive.Value placeholder={spec.placeholder || "Выбрать..."} />
          <SelectPrimitive.Icon><ChevronDown size={16} color="var(--color-apple-text-secondary)" /></SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            style={{
              background: "rgba(255, 255, 255, 0.97)",
              backdropFilter: "blur(60px) saturate(200%)",
              WebkitBackdropFilter: "blur(60px) saturate(200%)",
              border: "0.5px solid rgba(0, 0, 0, 0.08)",
              borderRadius: 14,
              boxShadow: "0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)",
              zIndex: 9999,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
              minWidth: 200,
            }}
            position="popper" sideOffset={4}
          >
            <SelectPrimitive.Viewport style={{ padding: 4 }}>
              {options.map(opt => (
                <SelectPrimitive.Item
                  key={opt.value || opt}
                  value={opt.value || opt}
                  style={{
                    padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                    color: "var(--color-apple-text)", outline: "none", fontSize: 15,
                  }}
                >
                  <SelectPrimitive.ItemText>{opt.label || opt}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}

// ─── Buttons ───

const btnBase = {
  borderRadius: 12,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
  cursor: "pointer",
  transition: "all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
  fontSize: 17,
  fontWeight: 600,
  letterSpacing: "-0.41px",
  border: "none",
  WebkitTapHighlightColor: "transparent",
};

function ApplePrimaryButton({ children, onClick, disabled, ...props }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        ...btnBase, padding: "12px 24px",
        background: "#007aff", color: "#ffffff",
        opacity: disabled ? 0.35 : 1,
      }}
      {...props}
    >{children}</button>
  );
}

function AppleSecondaryButton({ children, onClick, disabled, ...props }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        ...btnBase, padding: "12px 24px",
        background: "rgba(0, 122, 255, 0.12)", color: "#007aff",
        opacity: disabled ? 0.35 : 1,
      }}
      {...props}
    >{children}</button>
  );
}

function AppleDangerButton({ children, onClick, disabled, ...props }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        ...btnBase, padding: "12px 24px",
        background: "#ff3b30", color: "#ffffff",
        opacity: disabled ? 0.35 : 1,
      }}
      {...props}
    >{children}</button>
  );
}

function AppleIntentButton({ spec, onClick, disabled }) {
  const Icon = spec.icon ? resolveLucide(spec.icon) : null;
  const label = spec.label || spec.intentId;
  const isDanger = spec.irreversibility === "high" || spec.variant === "danger";
  const isPrimary = spec.variant === "primary";

  const bg = isDanger ? "rgba(255, 59, 48, 0.1)"
           : isPrimary ? "var(--color-apple-accent)"
           : "rgba(0, 122, 255, 0.08)";
  const color = isDanger ? "var(--color-apple-danger)"
              : isPrimary ? "white"
              : "var(--color-apple-accent)";

  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        ...btnBase, display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 14px", fontSize: 14,
        background: bg, color: color,
        opacity: disabled ? 0.4 : 1,
      }}
      title={label}
    >
      {Icon && <Icon size={16} />}
      <span>{label}</span>
    </button>
  );
}

function AppleOverflowMenu({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button style={{
          ...btnBase, padding: 8,
          background: "rgba(0, 0, 0, 0.04)", color: "var(--color-apple-text-secondary)",
          width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <MoreHorizontal size={16} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end" collisionPadding={16}
          style={{
            background: "rgba(255, 255, 255, 0.97)",
            backdropFilter: "blur(60px) saturate(200%)",
            WebkitBackdropFilter: "blur(60px) saturate(200%)",
            border: "0.5px solid rgba(0, 0, 0, 0.08)",
            borderRadius: 14,
            boxShadow: "0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)",
            padding: 6, zIndex: 9999,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
            minWidth: 200, maxWidth: "90vw",
          }}
          sideOffset={6}
        >
          {items.map((item, i) => {
            if (item.divider) return <DropdownMenu.Separator key={item.key} style={{ height: 0.5, background: "var(--color-apple-divider)", margin: "4px 0" }} />;
            const IconCmp = item.icon ? resolveLucide(item.icon) : null;
            return (
              <DropdownMenu.Item
                key={item.key || i}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 8, fontSize: 15,
                  color: "var(--color-apple-text)", outline: "none", cursor: "pointer",
                }}
                onSelect={() => item.onClick?.()}
              >
                {IconCmp && <IconCmp size={16} />}
                <span>{item.label}</span>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ─── Shell ───

function AppleModalShell({ onClose, title, children }) {
  return (
    <Dialog.Root open={true} onOpenChange={v => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(12px)", zIndex: 9999,
          animation: "fadeIn 0.2s ease",
        }} />
        <Dialog.Content style={{
          position: "fixed", left: "50%", top: "50%",
          transform: "translate(-50%, -50%)", zIndex: 9999,
          width: "calc(100% - 40px)", maxWidth: 480, maxHeight: "85vh",
          overflowY: "auto",
          background: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(60px) saturate(200%)",
          WebkitBackdropFilter: "blur(60px) saturate(200%)",
          border: "0.5px solid var(--color-apple-glass-border)",
          borderRadius: 14,
          padding: "24px 20px",
          fontFamily: "var(--font-apple)",
          boxShadow: "var(--shadow-apple-elevated, 0 8px 40px rgba(0,0,0,0.12))",
        }}>
          <Dialog.Title style={{
            fontSize: 20, fontWeight: 600, letterSpacing: "0.38px",
            color: "var(--color-apple-text)",
            marginBottom: 20, marginTop: 0,
            textAlign: "center",
          }}>
            {title}
          </Dialog.Title>
          {children}
          <Dialog.Close asChild>
            <button style={{
              position: "absolute", top: 12, right: 12,
              background: "rgba(120, 120, 128, 0.12)",
              border: "none", color: "var(--color-apple-text-secondary)", cursor: "pointer",
              padding: 0, borderRadius: "50%", width: 30, height: 30,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <X size={14} strokeWidth={2.5} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AppleTabs({ items = [], active, onSelect, extra }) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <TabsPrimitive.Root
        value={active || null}
        onValueChange={(v) => v && onSelect && onSelect(v)}
        style={{ flex: 1 }}
      >
        <TabsPrimitive.List style={{
          display: "inline-flex",
          background: "rgba(120, 120, 128, 0.12)",
          borderRadius: 9,
          padding: 2,
          fontFamily: "var(--font-apple)",
          gap: 0,
        }}>
          {items.map(item => {
            const isActive = active === item.value;
            return (
              <TabsPrimitive.Trigger
                key={item.value}
                value={item.value}
                style={{
                  padding: "7px 16px", fontSize: 13, whiteSpace: "nowrap",
                  background: isActive ? "white" : "transparent",
                  border: "none", cursor: "pointer",
                  fontFamily: "inherit", borderRadius: 7,
                  color: isActive ? "var(--color-apple-text, #1c1c1e)" : "var(--color-apple-text-secondary, #8e8e93)",
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: "-0.08px",
                  transition: "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
                  boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.08), 0 0.5px 1px rgba(0,0,0,0.04)" : "none",
                }}
              >
                {item.label}
              </TabsPrimitive.Trigger>
            );
          })}
        </TabsPrimitive.List>
      </TabsPrimitive.Root>
      {extra && <div style={{ marginRight: 8 }}>{extra}</div>}
    </div>
  );
}

// ─── Primitives ───

function AppleHeading({ children, level = 2, ...props }) {
  const Tag = `h${Math.min(level, 6)}`;
  // Apple HIG Dynamic Type scale
  const typeScale = {
    1: { fontSize: 34, fontWeight: 700, letterSpacing: "0.37px", lineHeight: "41px" },  // Large Title
    2: { fontSize: 28, fontWeight: 700, letterSpacing: "0.36px", lineHeight: "34px" },  // Title 1
    3: { fontSize: 22, fontWeight: 700, letterSpacing: "0.35px", lineHeight: "28px" },  // Title 2
    4: { fontSize: 20, fontWeight: 600, letterSpacing: "0.38px", lineHeight: "25px" },  // Title 3
    5: { fontSize: 17, fontWeight: 600, letterSpacing: "-0.41px", lineHeight: "22px" }, // Headline
    6: { fontSize: 15, fontWeight: 600, letterSpacing: "-0.24px", lineHeight: "20px" }, // Subheadline
  };
  const scale = typeScale[level] || typeScale[3];
  return (
    <Tag style={{
      ...scale,
      fontFamily: "var(--font-apple)",
      color: "var(--color-apple-text, #1c1c1e)",
      margin: 0,
    }} {...props}>
      {children}
    </Tag>
  );
}

function AppleText({ children, preset, ...props }) {
  const colors = {
    dimmed: "var(--color-apple-text-secondary)",
    accent: "var(--color-apple-accent)",
    danger: "var(--color-apple-danger)",
    success: "var(--color-apple-success)",
  };
  return (
    <span style={{
      fontFamily: "var(--font-apple)",
      color: colors[preset] || "var(--color-apple-text)",
      fontSize: 15,
    }} {...props}>
      {children}
    </span>
  );
}

function AppleBadge({ children, color, ...props }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 600, fontFamily: "var(--font-apple)",
      background: color ? `${color}22` : "rgba(0, 122, 255, 0.1)",
      color: color || "var(--color-apple-accent)",
    }} {...props}>
      {children}
    </span>
  );
}

/**
 * AppleChipList — glass-morphism chip'ы в Apple-стилистике: pill-shape,
 * semi-transparent fill по variant, subtle backdrop-blur border.
 */
function AppleChipList({ node }) {
  const value = node?.value;
  const items = Array.isArray(value) ? value : [];
  const variant = node?.variant || "tag";
  const maxVisible = node?.maxVisible ?? 5;
  const emptyLabel = node?.emptyLabel ?? "Нет";
  if (items.length === 0) {
    return (
      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontStyle: "italic", fontFamily: "var(--font-apple)" }}>
        {emptyLabel}
      </span>
    );
  }
  const visible = items.slice(0, maxVisible);
  const overflow = items.length - visible.length;
  const tone = variant === "policy"
    ? { bg: "rgba(255, 159, 10, 0.18)", fg: "#ff9f0a", border: "rgba(255, 159, 10, 0.3)" }
    : variant === "role"
    ? { bg: "rgba(175, 82, 222, 0.18)", fg: "#af52de", border: "rgba(175, 82, 222, 0.3)" }
    : { bg: "rgba(0, 122, 255, 0.12)", fg: "var(--color-apple-accent)", border: "rgba(0, 122, 255, 0.25)" };
  return (
    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {visible.map((item, i) => {
        const label = typeof item === "object" ? (item.label || item.name || JSON.stringify(item)) : String(item);
        const onClick = node?.onItemClick ? () => node.onItemClick(item) : undefined;
        const handleDetach = node?.onDetach ? (e) => { e.stopPropagation(); node.onDetach(item, i); } : null;
        return (
          <span
            key={i}
            onClick={onClick}
            role={onClick ? "button" : undefined}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 10px",
              borderRadius: 999,
              border: `1px solid ${tone.border}`,
              background: tone.bg,
              color: tone.fg,
              fontSize: 12, fontWeight: 600, fontFamily: "var(--font-apple)",
              backdropFilter: "blur(8px)",
              cursor: onClick ? "pointer" : undefined,
            }}
          >
            {typeof item === "object" && item.icon && <span>{item.icon}</span>}
            <span>{label}</span>
            {handleDetach && (
              <button
                type="button"
                onClick={handleDetach}
                aria-label={`Detach ${label}`}
                style={{
                  background: "transparent", border: "none", padding: 0, marginLeft: 2,
                  cursor: "pointer", fontSize: 13, lineHeight: 1, color: tone.fg,
                  opacity: 0.7,
                }}
              >
                ×
              </button>
            )}
          </span>
        );
      })}
      {overflow > 0 && (
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-apple)" }}>
          +{overflow}
        </span>
      )}
    </span>
  );
}

function AppleAvatar({ src, name, size = 32, ...props }) {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <AvatarPrimitive.Root style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      borderRadius: "50%", overflow: "hidden",
      background: "linear-gradient(135deg, var(--color-apple-accent), var(--color-apple-violet))",
      fontFamily: "var(--font-apple)",
      width: size, height: size,
    }} {...props}>
      <AvatarPrimitive.Image src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <AvatarPrimitive.Fallback style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: "100%", height: "100%",
        color: "white", fontSize: Math.round(size * 0.4), fontWeight: 600,
      }}>
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

function ApplePaper({ children, ...props }) {
  return (
    <div style={{
      borderRadius: "var(--radius-apple-card, 10px)",
      border: "0.5px solid var(--color-apple-glass-border, rgba(0,0,0,0.06))",
      background: "rgba(255, 255, 255, 0.8)",
      backdropFilter: "blur(40px) saturate(180%)",
      WebkitBackdropFilter: "blur(40px) saturate(180%)",
      padding: 16,
      boxShadow: "var(--shadow-apple-glass, 0 2px 16px rgba(0,0,0,0.08))",
    }} {...props}>
      {children}
    </div>
  );
}

// ─── Adapter Export ───

// Affinity для matching-score (см. renderer/adapters/matching.js).
AppleNumber.affinity = {
  roles: ["money", "price", "percentage", "trend"],
  types: ["number"],
  fields: ["amount", "total", "price", "fee", "balance"],
};
AppleDateTime.affinity = {
  roles: ["timestamp", "datetime"],
  types: ["datetime"],
  features: ["withTime"],
};

/**
 * Apple visionOS-glass Sidebar. Frosted-glass background, translucent
 * rounded pills для активных пунктов, subtle dividers без hard-lines.
 * Секции видны из-за типографики и spacing, а не обводок.
 */
function AppleSidebar({ sections, active, onSelect, projectionNames }) {
  const [collapsed, setCollapsed] = React.useState({});
  const toggle = (s) => setCollapsed(p => ({ ...p, [s]: !p[s] }));

  return (
    <div style={{
      width: 260, flexShrink: 0, height: "100%",
      overflow: "auto",
      background: "rgba(255,255,255,0.55)",
      backdropFilter: "blur(40px) saturate(180%)",
      WebkitBackdropFilter: "blur(40px) saturate(180%)",
      borderRight: "1px solid rgba(0,0,0,0.06)",
      padding: "14px 10px",
      fontFamily: "var(--font-apple, -apple-system, BlinkMacSystemFont, system-ui, sans-serif)",
      letterSpacing: "-0.01em",
    }}>
      {(sections || []).map(sec => (
        <div key={sec.section} style={{ marginBottom: 14 }}>
          <button
            onClick={() => toggle(sec.section)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              width: "100%", padding: "4px 10px",
              background: "transparent", border: "none",
              cursor: "pointer", fontFamily: "inherit",
              fontSize: 11, fontWeight: 600,
              color: "var(--color-apple-text-secondary, #86868b)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {sec.icon && <span aria-hidden style={{ fontSize: 12 }}>{sec.icon}</span>}
            <span style={{ flex: 1, textAlign: "left" }}>{sec.section}</span>
            <span style={{ fontSize: 9, opacity: 0.5 }}>
              {collapsed[sec.section] ? "›" : "⌄"}
            </span>
          </button>
          {!collapsed[sec.section] && (
            <div style={{ marginTop: 2 }}>
              {(sec.items || []).map(projId => {
                const isActive = active === projId;
                return (
                  <button
                    key={projId}
                    onClick={() => onSelect && onSelect(projId)}
                    style={{
                      display: "block", width: "100%",
                      textAlign: "left",
                      padding: "9px 14px",
                      margin: "2px 0",
                      borderRadius: 12,
                      border: "none",
                      background: isActive
                        ? "rgba(0,122,255,0.15)"
                        : "transparent",
                      backdropFilter: isActive ? "blur(20px)" : "none",
                      WebkitBackdropFilter: isActive ? "blur(20px)" : "none",
                      cursor: "pointer", fontFamily: "inherit",
                      fontSize: 14,
                      color: isActive
                        ? "var(--color-apple-accent, #007aff)"
                        : "var(--color-apple-text, #1d1d1f)",
                      fontWeight: isActive ? 600 : 400,
                      transition: "background 0.18s ease",
                    }}
                    onMouseEnter={e => {
                      if (!isActive) e.currentTarget.style.background = "rgba(0,0,0,0.04)";
                    }}
                    onMouseLeave={e => {
                      if (!isActive) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {projectionNames?.[projId] || projId}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export const appleAdapter = {
  name: "apple",
  capabilities: {
    primitive: {
      chipList: { variants: ["tag", "policy", "role"] },
    },
    shell: { modal: true, tabs: true, sidebar: true },
    // bidirectional-canvas-tree-selection: Apple-адаптер без canvas primitive.
    interaction: { externalSelection: false },
  },
  parameter: {
    text: AppleTextInput,
    textarea: AppleTextarea,
    email: AppleTextInput,
    url: AppleTextInput,
    tel: AppleTextInput,
    number: AppleNumber,
    range: AppleRange,
    datetime: AppleDateTime,
    select: AppleSelect,
  },
  button: {
    primary: ApplePrimaryButton,
    secondary: AppleSecondaryButton,
    danger: AppleDangerButton,
    intent: AppleIntentButton,
    overflow: AppleOverflowMenu,
  },
  shell: {
    modal: AppleModalShell,
    tabs: AppleTabs,
    sidebar: AppleSidebar,
  },
  primitive: {
    heading: AppleHeading,
    text: AppleText,
    badge: AppleBadge,
    avatar: AppleAvatar,
    paper: ApplePaper,
    chipList: AppleChipList,
  },
  icon: {
    resolve: resolveLucide,
  },
};
