import { describe, it, expect } from "vitest";
import pattern from "./optimistic-replace-with-undo.js";
import { validatePattern, evaluateTriggerExplained } from "../../schema.js";

// Три замены-click'а — минимум для триггера optimistic-replace-with-undo.
// Каждая имеет inverseIntent, чтобы apply мог разрешить partner для revert.
const replaceClickIntent = (id, inverse) => ({
  id,
  inverseIntent: inverse,
  particles: {
    confirmation: "click",
    effects: [{ α: "replace", target: "item.status", value: id }],
  },
});

const BASE_INTENTS = [
  replaceClickIntent("set_status_todo", "set_status_done"),
  replaceClickIntent("set_status_done", "set_status_todo"),
  replaceClickIntent("set_status_cancelled", "set_status_todo"),
];

describe("optimistic-replace-with-undo", () => {
  it("passes schema validation", () => {
    expect(() => validatePattern(pattern)).not.toThrow();
  });

  it("matches: ≥3 replace + click-confirmation", () => {
    const res = evaluateTriggerExplained(pattern.trigger, BASE_INTENTS, {}, {});
    expect(res.ok).toBe(true);
  });

  it("NOT matches: <3 replace-click", () => {
    const res = evaluateTriggerExplained(
      pattern.trigger,
      BASE_INTENTS.slice(0, 2),
      {},
      {},
    );
    expect(res.ok).toBe(false);
  });

  it("NOT matches: replace-intents без click-confirmation", () => {
    const noClick = BASE_INTENTS.map(i => ({
      ...i,
      particles: { ...i.particles, confirmation: "auto" },
    }));
    const res = evaluateTriggerExplained(pattern.trigger, noClick, {}, {});
    expect(res.ok).toBe(false);
  });

  describe("apply", () => {
    it("добавляет undoToast в overlay для каждого intent'а с inverse", () => {
      const next = pattern.structure.apply(
        { overlay: [] },
        { intents: BASE_INTENTS },
      );
      expect(next.overlay).toHaveLength(3);
      expect(next.overlay[0]).toMatchObject({
        type: "undoToast",
        intentId: "set_status_todo",
        inverseIntentId: "set_status_done",
      });
      expect(next.overlay[0].windowSec).toBeGreaterThan(0);
    });

    it("skip intent без inverse — post-hoc revert невозможен", () => {
      const noInverse = [
        ...BASE_INTENTS.slice(0, 2),
        { ...replaceClickIntent("set_status_orphan"), inverseIntent: undefined },
      ];
      const next = pattern.structure.apply({ overlay: [] }, { intents: noInverse });
      // triple count satisfied (три candidate'а по click-replace), но orphan
      // без inverse не попадает в overlay
      expect(next.overlay.map(o => o.intentId)).toEqual([
        "set_status_todo",
        "set_status_done",
      ]);
    });

    it("skip intent с irreversibility=high — территория irreversible-confirm/undo-toast-window", () => {
      const withHigh = [
        ...BASE_INTENTS,
        {
          ...replaceClickIntent("confirm_payment", "refund_payment"),
          irreversibility: "high",
        },
      ];
      const next = pattern.structure.apply({ overlay: [] }, { intents: withHigh });
      expect(next.overlay.map(o => o.intentId)).not.toContain("confirm_payment");
    });

    it("skip intent с irreversibility=extreme", () => {
      const withExtreme = [
        ...BASE_INTENTS,
        {
          ...replaceClickIntent("send_email", "recall_email"),
          irreversibility: "extreme",
        },
      ];
      const next = pattern.structure.apply({ overlay: [] }, { intents: withExtreme });
      expect(next.overlay.map(o => o.intentId)).not.toContain("send_email");
    });

    it("skip intent с undoable=false", () => {
      const withOptOut = BASE_INTENTS.map((i, idx) =>
        idx === 0 ? { ...i, undoable: false } : i,
      );
      const next = pattern.structure.apply({ overlay: [] }, { intents: withOptOut });
      expect(next.overlay.map(o => o.intentId)).not.toContain("set_status_todo");
    });

    it("не применяется когда <3 candidates — защита от false-positive", () => {
      const tooFew = BASE_INTENTS.slice(0, 2);
      const slots = { overlay: [] };
      const next = pattern.structure.apply(slots, { intents: tooFew });
      expect(next).toBe(slots);
    });

    it("idempotent: undoToast уже в overlay для intentId", () => {
      const slots = {
        overlay: [
          { type: "undoToast", intentId: "set_status_todo" },
        ],
      };
      const next = pattern.structure.apply(slots, { intents: BASE_INTENTS });
      const ids = next.overlay
        .filter(o => o?.type === "undoToast")
        .map(o => o.intentId);
      expect(ids.filter(i => i === "set_status_todo")).toHaveLength(1);
      // остальные два всё равно добавляются
      expect(ids).toContain("set_status_done");
      expect(ids).toContain("set_status_cancelled");
    });

    it("projection.undoToast=false — pattern skip полностью", () => {
      const slots = { overlay: [] };
      const next = pattern.structure.apply(slots, {
        intents: BASE_INTENTS,
        projection: { undoToast: false },
      });
      expect(next).toBe(slots);
    });

    it("intent.undoWindowSec — override per-intent", () => {
      const withOverride = BASE_INTENTS.map((i, idx) =>
        idx === 0 ? { ...i, undoWindowSec: 3 } : i,
      );
      const next = pattern.structure.apply({ overlay: [] }, { intents: withOverride });
      const first = next.overlay.find(o => o.intentId === "set_status_todo");
      expect(first.windowSec).toBe(3);
    });

    it("projection.undoWindowSec — override per-projection", () => {
      const next = pattern.structure.apply(
        { overlay: [] },
        { intents: BASE_INTENTS, projection: { undoWindowSec: 10 } },
      );
      expect(next.overlay[0].windowSec).toBe(10);
    });

    it("intent.undoMessage — поддерживается в spec'е", () => {
      const withMessage = BASE_INTENTS.map((i, idx) =>
        idx === 0 ? { ...i, undoMessage: "Статус изменён" } : i,
      );
      const next = pattern.structure.apply({ overlay: [] }, { intents: withMessage });
      const first = next.overlay.find(o => o.intentId === "set_status_todo");
      expect(first.message).toBe("Статус изменён");
    });

    it("intent.antagonist — запасной источник inverse", () => {
      const withAntagonist = BASE_INTENTS.map(i => ({
        ...i,
        inverseIntent: undefined,
        antagonist: i.inverseIntent,
      }));
      // восстанавливаем inverse через antagonist у всех трёх
      for (let i = 0; i < withAntagonist.length; i++) {
        withAntagonist[i].antagonist = BASE_INTENTS[i].inverseIntent;
      }
      const next = pattern.structure.apply({ overlay: [] }, { intents: withAntagonist });
      expect(next.overlay.map(o => o.inverseIntentId)).toEqual([
        "set_status_done",
        "set_status_todo",
        "set_status_todo",
      ]);
    });

    it("returns same slots object если нечего добавить", () => {
      const slots = {
        overlay: BASE_INTENTS.map(i => ({
          type: "undoToast",
          intentId: i.id,
          inverseIntentId: i.inverseIntent,
        })),
      };
      const next = pattern.structure.apply(slots, { intents: BASE_INTENTS });
      expect(next).toBe(slots);
    });
  });
});
