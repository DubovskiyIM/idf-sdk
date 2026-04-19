// PatternPreviewOverlay.jsx
//
// Визуальный overlay для двух dev-only режимов §27 authoring:
//   mode="preview" (default) — оборачивает sections, добавленные превью одного
//     паттерна (artifactOverride + previewPatternId), warm dashed border + badge.
//   mode="xray" — оборачивает уже применённые derived sections с per-slot
//     attribution, warm dashed border + badge + hover-popover с trail.
//
// Чисто presentational. Hover popover — CSS-only (через style-тег с :hover),
// без JS-state, чтобы остаться SSR-friendly.

const COLORS = {
  preview: "#fd8",
  xray:    "#fd8",
};

export default function PatternPreviewOverlay({
  patternId,
  mode = "preview",
  attribution = null,
  witness = null,
  children,
  onExpandInDrawer,
  graphLink,
}) {
  const color = COLORS[mode] || COLORS.preview;
  const labelPrefix = mode === "xray" ? "xray" : "pattern";

  return (
    <div
      data-pattern-overlay={mode}
      data-pattern-id={patternId}
      className="pattern-preview-overlay"
      style={{
        position: "relative",
        border: `1px dashed var(--pattern-preview, ${color})`,
        borderRadius: 4,
        padding: 2,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -8,
          right: 8,
          background: `var(--pattern-preview, ${color})`,
          color: "#000",
          fontSize: 10,
          padding: "1px 6px",
          borderRadius: 8,
          zIndex: 2,
          cursor: mode === "xray" && onExpandInDrawer ? "pointer" : "default",
        }}
        onClick={mode === "xray" && onExpandInDrawer ? () => onExpandInDrawer(patternId) : undefined}
        title={mode === "xray" && attribution ? `${attribution.action} ${attribution.path}` : undefined}
      >
        {labelPrefix}: {patternId}
      </div>

      {mode === "xray" && (witness || attribution || graphLink) && (
        <div
          className="pattern-overlay-popover"
          style={{
            position: "absolute",
            top: 18,
            right: 8,
            background: "#1a1a1a",
            color: "#eee",
            border: "1px solid #444",
            borderRadius: 4,
            padding: "8px 10px",
            fontSize: 11,
            lineHeight: 1.4,
            minWidth: 220,
            maxWidth: 320,
            zIndex: 3,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            display: "none",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
          }}
        >
          <div><b>pattern:</b> {patternId}</div>
          <div><b>basis:</b> pattern-bank</div>
          <div><b>reliability:</b> rule-based</div>
          {attribution && (
            <div><b>action:</b> {attribution.action} <code>{attribution.path}</code></div>
          )}
          {witness?.requirements?.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <b>trigger:</b>
              <ul style={{ margin: "2px 0 0 12px", padding: 0, listStyle: "none" }}>
                {witness.requirements.map((r, i) => (
                  <li key={i} style={{ color: r.ok ? "#4f4" : "#f44" }}>
                    {r.ok ? "✓" : "✗"} {r.kind}
                    {r.spec ? ` ${JSON.stringify(r.spec)}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {graphLink && (
            <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid #333" }}>
              <a href={graphLink} target="_blank" rel="noreferrer" style={{ color: "#8af" }}>
                Open in Graph3D ↗
              </a>
            </div>
          )}
        </div>
      )}

      {mode === "xray" && (
        <style dangerouslySetInnerHTML={{ __html: `
          .pattern-preview-overlay:hover > .pattern-overlay-popover {
            display: block !important;
          }
        ` }} />
      )}

      {children}
    </div>
  );
}
