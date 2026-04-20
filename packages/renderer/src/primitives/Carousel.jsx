import { useEffect, useState, useRef } from "react";
import SlotRenderer from "../SlotRenderer.jsx";

/**
 * Carousel — ротирующий hero-баннер (UI-gap #5, Workzilla-style).
 *
 * Node-shape:
 *   {
 *     type: "carousel",
 *     slides: [
 *       { eyebrow?, title, subtitle?, illustration?, background? },
 *       ...
 *     ],
 *     intervalMs: 4000,   // опц., дефолт 5000
 *     autoplay: true,     // опц., дефолт true
 *     height: 140,        // опц., дефолт 140
 *   }
 *
 * Слайд как объект (shortcut shape) — рендерится inline:
 *   { eyebrow, title, subtitle, illustration }
 *
 * Либо как произвольный SlotRenderer-node (complex slide):
 *   { render: { type: "row", children: [...] } }
 *
 * Если один слайд → auto-rotation отключается, индикатор скрывается.
 */
export default function Carousel({ node, ctx }) {
  const slides = Array.isArray(node?.slides) ? node.slides : [];
  const [active, setActive] = useState(0);
  const autoplay = node?.autoplay !== false && slides.length > 1;
  const intervalMs = node?.intervalMs ?? 5000;
  const height = node?.height ?? 140;
  const timerRef = useRef(null);

  useEffect(() => {
    if (!autoplay) return;
    timerRef.current = setInterval(() => {
      setActive(i => (i + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [autoplay, intervalMs, slides.length]);

  if (slides.length === 0) return null;

  const current = slides[Math.min(active, slides.length - 1)];

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 10,
        overflow: "hidden",
        background: current?.background || "var(--idf-surface-soft, #eaf4ff)",
        padding: "16px 20px",
        minHeight: height,
        display: "flex",
        alignItems: "center",
      }}
    >
      <div style={{ flex: 1 }}>
        {current.render ? (
          <SlotRenderer item={current.render} ctx={ctx} />
        ) : (
          <Slide slide={current} />
        )}
      </div>
      {slides.length > 1 && (
        <div
          role="tablist"
          aria-label="Карусель"
          style={{
            position: "absolute",
            bottom: 10,
            left: 20,
            display: "flex",
            gap: 6,
          }}
        >
          {slides.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === active}
              type="button"
              onClick={() => setActive(i)}
              style={{
                width: i === active ? 20 : 8,
                height: 8,
                borderRadius: 4,
                border: "none",
                padding: 0,
                background:
                  i === active
                    ? "var(--idf-accent, #1677ff)"
                    : "var(--idf-border, rgba(0,0,0,0.2))",
                cursor: "pointer",
                transition: "width 0.2s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Slide({ slide }) {
  const { eyebrow, title, subtitle, illustration } = slide || {};
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <div style={{ flex: 1 }}>
        {eyebrow && (
          <div
            style={{
              fontSize: 12,
              color: "var(--idf-text-muted, #6b7280)",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            {eyebrow}
          </div>
        )}
        {title && (
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--idf-text, #1a1a2e)",
              lineHeight: 1.3,
            }}
          >
            {title}
          </div>
        )}
        {subtitle && (
          <div
            style={{
              fontSize: 14,
              color: "var(--idf-text-muted, #6b7280)",
              marginTop: 6,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {illustration && (
        typeof illustration === "string" ? (
          <img
            src={illustration}
            alt=""
            style={{ maxWidth: 120, maxHeight: 120, objectFit: "contain" }}
          />
        ) : (
          illustration
        )
      )}
    </div>
  );
}
