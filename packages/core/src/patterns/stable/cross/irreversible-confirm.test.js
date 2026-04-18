import { describe, it, expect } from "vitest";
import irreversibleConfirm from "./irreversible-confirm.js";

function makeConfirmOverlay(intentId, message = `${intentId}?`) {
  return {
    type: "confirmDialog",
    key: `overlay_${intentId}`,
    triggerIntentId: intentId,
    irreversibility: "high",
    message,
    confirmBy: { type: "typeText", expected: "delete" },
  };
}

function makeIrrIntent(id, reason) {
  return {
    id,
    name: id,
    irreversibility: "high",
    __irr: { point: "high", reason },
    particles: { effects: [] },
  };
}

describe("irreversible-confirm.structure.apply", () => {
  it("обогащает confirmDialog overlay полем warning из intent.__irr.reason", () => {
    const intent = makeIrrIntent("confirm_deal", "Средства резервируются в escrow");
    const slots = {
      overlay: [makeConfirmOverlay("confirm_deal")],
      toolbar: [],
    };
    const result = irreversibleConfirm.structure.apply(slots, {
      intents: [intent],
      projection: { mainEntity: "Deal" },
      ontology: {},
    });
    const enriched = result.overlay.find(o => o.triggerIntentId === "confirm_deal");
    expect(enriched.warning).toBe("Средства резервируются в escrow");
    expect(enriched.triggerIntentId).toBe("confirm_deal");
    expect(enriched.type).toBe("confirmDialog");
  });

  it("no-op для intents без __irr (slot не меняется)", () => {
    const intent = { id: "plain_action", name: "plain_action", irreversibility: "low", particles: { effects: [] } };
    const slots = {
      overlay: [makeConfirmOverlay("plain_action")],
      toolbar: [],
    };
    const result = irreversibleConfirm.structure.apply(slots, {
      intents: [intent],
      projection: { mainEntity: "X" },
      ontology: {},
    });
    const enriched = result.overlay.find(o => o.triggerIntentId === "plain_action");
    expect(enriched.warning).toBeUndefined();
  });

  it("no-op если overlay не имеет соответствующего confirmDialog entry (intent в projection не рендерится)", () => {
    const intent = makeIrrIntent("confirm_deal", "reason");
    const slots = { overlay: [], toolbar: [] };
    const result = irreversibleConfirm.structure.apply(slots, {
      intents: [intent],
      projection: { mainEntity: "Deal" },
      ontology: {},
    });
    expect(result.overlay).toHaveLength(0);
  });

  it("обрабатывает несколько __irr intents за один проход", () => {
    const slots = {
      overlay: [
        makeConfirmOverlay("confirm_deal"),
        makeConfirmOverlay("accept_result"),
        makeConfirmOverlay("archive_portfolio"),
      ],
      toolbar: [],
    };
    const intents = [
      makeIrrIntent("confirm_deal", "Reason A"),
      makeIrrIntent("accept_result", "Reason B"),
      { id: "archive_portfolio", name: "archive_portfolio", irreversibility: "high", particles: { effects: [] } },
    ];
    const result = irreversibleConfirm.structure.apply(slots, {
      intents,
      projection: { mainEntity: "X" },
      ontology: {},
    });
    expect(result.overlay.find(o => o.triggerIntentId === "confirm_deal").warning).toBe("Reason A");
    expect(result.overlay.find(o => o.triggerIntentId === "accept_result").warning).toBe("Reason B");
    expect(result.overlay.find(o => o.triggerIntentId === "archive_portfolio").warning).toBeUndefined();
  });

  it("не мутирует входной slots (pure function contract)", () => {
    const intent = makeIrrIntent("confirm_deal", "reason");
    const overlayEntry = makeConfirmOverlay("confirm_deal");
    const slots = {
      overlay: [overlayEntry],
      toolbar: [],
    };
    Object.freeze(slots);
    Object.freeze(slots.overlay);
    Object.freeze(overlayEntry);
    expect(() =>
      irreversibleConfirm.structure.apply(slots, {
        intents: [intent],
        projection: { mainEntity: "Deal" },
        ontology: {},
      })
    ).not.toThrow();
    expect(overlayEntry.warning).toBeUndefined();
  });

  it("idempotent: повторный вызов не добавляет дубликаты", () => {
    const intent = makeIrrIntent("confirm_deal", "reason");
    const slots = { overlay: [makeConfirmOverlay("confirm_deal")], toolbar: [] };
    const first = irreversibleConfirm.structure.apply(slots, {
      intents: [intent],
      projection: { mainEntity: "Deal" },
      ontology: {},
    });
    const second = irreversibleConfirm.structure.apply(first, {
      intents: [intent],
      projection: { mainEntity: "Deal" },
      ontology: {},
    });
    expect(second.overlay).toHaveLength(1);
    expect(second.overlay[0].warning).toBe("reason");
  });
});
