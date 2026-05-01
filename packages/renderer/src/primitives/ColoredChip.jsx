/**
 * ColoredChip — универсальный coloured chip для tag/policy/badge (U-derive Phase 1).
 *
 * Default kind="tag" (primary tone). Explicit color > kind preset.
 * Originally дуплицировался inline в gravitino host (TagsTable, PoliciesTable,
 * ChipsAssoc и др. — 8+ мест).
 */
const PRESETS = {
  tag:    { bg: "rgba(100,120,247,0.18)", text: "var(--idf-primary, #6478f7)" },
  policy: { bg: "rgba(255,171,0,0.18)",  text: "#FFAB00" },
  muted:  { bg: "var(--idf-bg-subtle, #f3f4f6)", text: "var(--idf-text)" },
};

export default function ColoredChip({ text, kind = "tag", color, textColor }) {
  const preset = PRESETS[kind] || PRESETS.tag;
  const bg = color || preset.bg;
  const fg = textColor || (color ? "white" : preset.text);
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 4,
      fontSize: 11, fontWeight: 600,
      background: bg, color: fg,
    }}>{text}</span>
  );
}
