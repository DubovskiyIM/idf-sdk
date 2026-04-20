import { describe, it, expect } from "vitest";
import pattern from "./response-cost-before-action.js";

const INTENT_WITH_COST = {
  id: "respond_to_task",
  name: "Откликнуться",
  α: "add",
  costHint: 80,
};

const INTENT_META_COST = {
  id: "place_bid",
  name: "Сделать ставку",
  α: "add",
  meta: { costHint: 50, costCurrency: "€" },
};

const INTENT_PARTICLES_COST = {
  id: "claim_order",
  α: "add",
  particles: { costHint: 25 },
};

const INTENT_FREE = {
  id: "send_message",
  name: "Отправить",
  α: "add",
};

describe("response-cost-before-action — trigger match()", () => {
  it("match=true для intent с top-level costHint", () => {
    const r = pattern.trigger.match([INTENT_WITH_COST], {}, { kind: "feed" });
    expect(r).toBe(true);
  });

  it("match=true для intent с meta.costHint", () => {
    const r = pattern.trigger.match([INTENT_META_COST], {}, { kind: "detail" });
    expect(r).toBe(true);
  });

  it("match=true для intent с particles.costHint", () => {
    const r = pattern.trigger.match([INTENT_PARTICLES_COST], {}, { kind: "catalog" });
    expect(r).toBe(true);
  });

  it("match=false когда все intents без costHint", () => {
    const r = pattern.trigger.match([INTENT_FREE], {}, { kind: "feed" });
    expect(r).toBe(false);
  });

  it("match=false при costHint ≤ 0", () => {
    const r = pattern.trigger.match(
      [{ id: "i", α: "add", costHint: 0 }],
      {}, { kind: "feed" }
    );
    expect(r).toBe(false);
  });

  it("match=false без projection.kind", () => {
    const r = pattern.trigger.match([INTENT_WITH_COST], {}, {});
    expect(r).toBe(false);
  });
});

describe("response-cost-before-action — structure.apply", () => {
  it("обогащает label toolbar-item'а costHint суффиксом", () => {
    const slots = { toolbar: [{ intentId: "respond_to_task", label: "Откликнуться" }] };
    const out = pattern.structure.apply(slots, { intents: [INTENT_WITH_COST] });
    expect(out.toolbar[0].label).toBe("Откликнуться · 80 ₽");
    expect(out.toolbar[0].costHint).toBe(80);
    expect(out.toolbar[0].costCurrency).toBe("₽");
  });

  it("использует meta.costCurrency override", () => {
    const slots = { toolbar: [{ intentId: "place_bid", label: "Сделать ставку" }] };
    const out = pattern.structure.apply(slots, { intents: [INTENT_META_COST] });
    expect(out.toolbar[0].label).toBe("Сделать ставку · 50 €");
  });

  it("не трогает toolbar-item без costHint", () => {
    const slots = { toolbar: [
      { intentId: "respond_to_task", label: "Откликнуться" },
      { intentId: "send_message", label: "Отправить" },
    ] };
    const out = pattern.structure.apply(slots, {
      intents: [INTENT_WITH_COST, INTENT_FREE],
    });
    expect(out.toolbar[0].label).toBe("Откликнуться · 80 ₽");
    expect(out.toolbar[1].label).toBe("Отправить");
    expect(out.toolbar[1].costHint).toBeUndefined();
  });

  it("идемпотентно: не добавляет суффикс дважды (регекс /·\\s+\\d/)", () => {
    const slots = { toolbar: [{ intentId: "respond_to_task", label: "Откликнуться · 80 ₽" }] };
    const out = pattern.structure.apply(slots, { intents: [INTENT_WITH_COST] });
    expect(out).toBe(slots);
  });

  it("fallback label из intent.name когда toolbar.label отсутствует", () => {
    const slots = { toolbar: [{ intentId: "respond_to_task" }] };
    const out = pattern.structure.apply(slots, { intents: [INTENT_WITH_COST] });
    expect(out.toolbar[0].label).toBe("Откликнуться · 80 ₽");
  });

  it("formatCost: 1500 → '1 500' (ru-RU использует NBSP)", () => {
    const slots = { toolbar: [{ intentId: "big", label: "Buy" }] };
    const bigIntent = { id: "big", α: "add", costHint: 1500 };
    const out = pattern.structure.apply(slots, { intents: [bigIntent] });
    expect(out.toolbar[0].label).toMatch(/1\s500/);
    expect(out.toolbar[0].label).toContain("Buy · ");
  });

  it("no-op когда toolbar пуст", () => {
    const slots = { toolbar: [] };
    const out = pattern.structure.apply(slots, { intents: [INTENT_WITH_COST] });
    expect(out).toBe(slots);
  });

  it("no-op когда ни один toolbar.intentId не match'ит intents с costHint", () => {
    const slots = { toolbar: [{ intentId: "unknown" }] };
    const out = pattern.structure.apply(slots, { intents: [INTENT_WITH_COST] });
    expect(out).toBe(slots);
  });

  it("чистая функция: не мутирует входной slots или toolbar", () => {
    const slots = { toolbar: [{ intentId: "respond_to_task", label: "Откликнуться" }] };
    const snapshot = JSON.stringify(slots);
    pattern.structure.apply(slots, { intents: [INTENT_WITH_COST] });
    expect(JSON.stringify(slots)).toBe(snapshot);
  });
});
