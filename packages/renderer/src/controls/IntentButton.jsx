import { resolveParams, evalCondition } from "../eval.js";
import { getAdaptedComponent } from "../adapters/registry.js";
import Icon from "../adapters/Icon.jsx";

/**
 * Evaluate action-gate для spec.intentId. Если gate активен — возвращает
 * { blocked: true, tooltip, enabledBy }. Pattern lifecycle-gated-destructive
 * кладёт gates в ctx.actionGates (через ArchetypeDetail, ArchetypeCatalog и т.д.).
 */
function resolveGate(spec, ctx, item) {
  const gates = ctx?.actionGates;
  if (!Array.isArray(gates) || gates.length === 0) return null;
  const gate = gates.find(g => g?.intentId === spec?.intentId);
  if (!gate) return null;
  // Нет target-item'а — gate не применим (blockedWhen ссылается на item.*).
  const target = item ?? ctx?.target;
  if (!target) return null;
  try {
    const blocked = evalCondition(gate.blockedWhen, {
      item: target,
      viewer: ctx.viewer,
      world: ctx.world,
    });
    if (!blocked) return null;
    return { blocked: true, tooltip: gate.tooltip, enabledBy: gate.enabledBy };
  } catch {
    return null;
  }
}

export default function IntentButton({ spec, ctx, item }) {
  const gate = resolveGate(spec, ctx, item);
  const isBlocked = !!gate?.blocked;

  const handleClick = (e) => {
    e.stopPropagation();
    if (isBlocked) return;
    if (spec.opens === "overlay") {
      ctx.openOverlay(spec.overlayKey, { item });
      return;
    }
    // Composer context mode: reply_to_message → set composer reply context
    if (spec.composerMode === "reply" && ctx.setComposerMode && item) {
      const senderName = item.senderName || ((ctx.world?.users || []).find(u => u.id === item.senderId))?.name || "";
      ctx.setComposerMode({
        type: "reply",
        intentId: spec.intentId,
        messageId: item.id,
        senderName,
        preview: item.content || "",
      });
      return;
    }
    if (spec.filePicker) {
      const input = document.createElement("input");
      input.type = "file";
      input.onchange = async (ev) => {
        const file = ev.target.files?.[0];
        if (!file) return;
        ctx.exec(spec.intentId, { file, id: item?.id });
      };
      input.click();
      return;
    }
    const params = resolveParams(spec.params || {}, { ...ctx, item });
    ctx.exec(spec.intentId, { ...params, id: item?.id });
  };

  // Адаптер предоставляет унифицированную кнопку намерения (Mantine Button
  // с variant'ами по spec.variant/irreversibility). Если адаптер есть —
  // используем его, иначе built-in inline-styled fallback.
  const Adapted = getAdaptedComponent("button", "intent");
  if (Adapted) {
    // Gate: если active — disabled + tooltip-override. Адаптер читает
    // disabled и spec.title (fallback label) или data-tooltip.
    const effectiveSpec = isBlocked
      ? { ...spec, title: gate.tooltip, gatedBy: gate.enabledBy }
      : spec;
    return <Adapted spec={effectiveSpec} onClick={handleClick} disabled={isBlocked} />;
  }

  // Fallback: inline-стилизованная кнопка. Сохраняется для случаев без
  // адаптера или для тестов.
  const label = spec.label || spec.intentId;
  const icon = spec.icon;
  const LABEL_MAX = 8;
  const showLabel = label.length <= LABEL_MAX;

  return (
    <button
      onClick={handleClick}
      disabled={isBlocked}
      title={isBlocked ? gate.tooltip : label}
      style={{
        padding: showLabel ? "6px 12px" : "6px 10px",
        borderRadius: 6,
        border: "1px solid var(--idf-border)",
        background: "var(--idf-card)",
        color: isBlocked ? "var(--idf-text-muted)" : "var(--idf-text)",
        fontSize: 13,
        cursor: isBlocked ? "not-allowed" : "pointer",
        opacity: isBlocked ? 0.55 : 1,
        fontWeight: 500,
        fontFamily: "system-ui, sans-serif",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        lineHeight: 1,
      }}
    >
      {icon && <Icon emoji={icon} size={14} />}
      {showLabel && <span>{label}</span>}
    </button>
  );
}
