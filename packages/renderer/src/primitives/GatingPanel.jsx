import { evalCondition } from "../eval.js";

/**
 * GatingPanel — onboarding prerequisites (UI-gap #6, Workzilla-style).
 *
 * Node-shape:
 *   {
 *     type: "gatingPanel",
 *     title: "Необходимые шаги для доступа к заданиям",
 *     steps: [
 *       { id: "registration", label: "Регистрация", icon: "👤",
 *         done: "viewer.registered === true" },
 *       { id: "test", label: "Обязательное тестирование", icon: "📝",
 *         done: "viewer.testPassed === true",
 *         cta: { label: "Пройти", intentId: "start_test" } },
 *     ],
 *   }
 *
 * Поведение:
 * - Если все steps done (conditions true) → panel скрыт (null).
 * - Для каждого step: если done → зелёная плашка «Пройдено»; иначе —
 *   CTA-button (если cta задан) или info-text.
 * - Condition evaluates через evalCondition с доступом к viewer/world.
 */
export default function GatingPanel({ node, ctx }) {
  const steps = Array.isArray(node?.steps) ? node.steps : [];
  if (steps.length === 0) return null;

  const evaluated = steps.map(step => ({
    ...step,
    isDone: step.done
      ? Boolean(evalCondition(step.done, { viewer: ctx?.viewer, world: ctx?.world }))
      : false,
  }));

  const allDone = evaluated.every(s => s.isDone);
  if (allDone) return null;

  return (
    <section
      aria-label="Шаги доступа"
      style={{
        padding: "20px 24px",
        background: "var(--idf-surface-soft, #f9fafb)",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {node.title && (
        <div
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "var(--idf-text, #1a1a2e)",
            textAlign: "center",
          }}
        >
          {node.title}
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {evaluated.map(step => (
          <GatingStep key={step.id} step={step} ctx={ctx} />
        ))}
      </div>
    </section>
  );
}

function GatingStep({ step, ctx }) {
  const { label, icon, isDone, cta } = step;
  const ctaClick = () => {
    if (!cta) return;
    if (typeof cta.onClick === "function") return cta.onClick(ctx);
    if (cta.intentId && ctx?.exec) ctx.exec(cta.intentId, cta.params || {});
  };

  return (
    <div
      style={{
        padding: "16px 18px",
        background: "var(--idf-surface, #fff)",
        border: `1px solid ${
          isDone
            ? "var(--idf-success-soft, rgba(34, 197, 94, 0.3))"
            : "var(--idf-border, #e5e7eb)"
        }`,
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {icon && (
          <div
            style={{
              fontSize: 28,
              lineHeight: 1,
              width: 44,
              height: 44,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--idf-accent-soft, rgba(22, 119, 255, 0.1))",
            }}
          >
            {icon}
          </div>
        )}
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--idf-text, #1a1a2e)",
            flex: 1,
          }}
        >
          {label}
        </div>
      </div>
      {isDone ? (
        <div
          aria-label="Выполнено"
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            background: "var(--idf-success-soft, rgba(34, 197, 94, 0.12))",
            color: "var(--idf-success, #16a34a)",
            fontSize: 13,
            fontWeight: 500,
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <span>✓</span>
          <span>Пройдено</span>
        </div>
      ) : cta ? (
        <button
          type="button"
          onClick={ctaClick}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "none",
            background: "var(--idf-accent, #1677ff)",
            color: "var(--idf-on-accent, #fff)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {cta.label}
        </button>
      ) : (
        <div
          style={{
            padding: "8px 12px",
            fontSize: 12,
            color: "var(--idf-text-muted, #6b7280)",
            textAlign: "center",
          }}
        >
          Не выполнено
        </div>
      )}
    </div>
  );
}
