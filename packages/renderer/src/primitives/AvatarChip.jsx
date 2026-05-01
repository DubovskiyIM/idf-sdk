/**
 * AvatarChip — letter-avatar + optional name (U-derive Phase 1).
 *
 * kind="user" | "group" определяет background.
 * size="sm" | "md" | "lg" — diameter (16/18/24 px).
 *
 * Originally extracted из gravitino host (DetailPaneCommon.OwnerBlock — 20px circle с initial).
 */
const SIZES = { sm: 16, md: 18, lg: 24 };
const KIND_BG = {
  user:  "var(--idf-primary, #6478f7)",
  group: "#FFAB00",
};

export default function AvatarChip({ name, kind = "user", size = "md", showName = true }) {
  const px = SIZES[size] || SIZES.md;
  const letter = (name || "?").slice(0, 1).toUpperCase();
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontSize: 12, color: "var(--idf-text)",
    }}>
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: px, height: px, borderRadius: "50%",
        background: KIND_BG[kind] || KIND_BG.user, color: "white",
        fontSize: Math.round(px * 0.55), fontWeight: 600,
      }}>{letter}</span>
      {showName && name && <span style={{ color: "var(--idf-text)" }}>{name}</span>}
    </span>
  );
}
