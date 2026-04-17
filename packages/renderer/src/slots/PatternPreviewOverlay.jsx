// PatternPreviewOverlay.jsx
//
// Визуальный overlay для preview-режима Pattern Inspector (§27 authoring-env).
// Оборачивает слоты/секции, которые были добавлены применением structural
// pattern'а (source: "derived:..."), в dashed-border контейнер с corner-badge,
// несущим patternId. Используется только когда renderer в preview-режиме
// (artifactOverride + previewPatternId).
//
// Чистый presentational компонент: никакой логики, только стилистика.
// CSS-переменная --pattern-preview может переопределить цвет извне.

export default function PatternPreviewOverlay({ patternId, children }) {
  return (
    <div style={{
      position: "relative",
      border: "1px dashed var(--pattern-preview, #fd8)",
      borderRadius: 4,
      padding: 2,
    }}>
      <div style={{
        position: "absolute",
        top: -8,
        right: 8,
        background: "var(--pattern-preview, #fd8)",
        color: "#000",
        fontSize: 10,
        padding: "1px 6px",
        borderRadius: 8,
        zIndex: 2,
      }}>
        pattern: {patternId}
      </div>
      {children}
    </div>
  );
}
