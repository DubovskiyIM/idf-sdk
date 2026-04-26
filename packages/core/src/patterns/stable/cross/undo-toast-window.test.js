import { describe, it, expect } from "vitest";
import pattern from "./undo-toast-window.js";
import { validatePattern, evaluateTriggerExplained } from "../../schema.js";

describe("undo-toast-window (merge promotion)", () => {
  const destructive = {
    id: "reject_bid",
    irreversibility: "high",
    inverseIntent: "accept_bid",
    particles: { effects: [{ α: "replace", target: "bid.status", value: "rejected" }] },
  };
  const inverse = {
    id: "accept_bid",
    particles: { effects: [{ α: "replace", target: "bid.status", value: "accepted" }] },
  };

  it("passes schema validation", () => {
    expect(() => validatePattern(pattern)).not.toThrow();
  });

  it("matches: irreversibility:high + inverseIntent", () => {
    const res = evaluateTriggerExplained(pattern.trigger, [destructive, inverse], {}, { kind: "detail" });
    expect(res.ok).toBe(true);
  });

  it("matches: antagonist pair через effect α:remove", () => {
    const removeIntent = {
      id: "delete_msg",
      irreversibility: "medium",
      antagonist: "restore_msg",
      particles: { effects: [{ α: "remove", target: "messages" }] },
    };
    const restore = {
      id: "restore_msg",
      antagonist: "delete_msg",
      particles: { effects: [{ α: "add", target: "messages" }] },
    };
    const res = evaluateTriggerExplained(pattern.trigger, [removeIntent, restore], {}, { kind: "detail" });
    expect(res.ok).toBe(true);
  });

  it("NOT matches: нет inverse-intent", () => {
    const orphan = { ...destructive, inverseIntent: undefined, antagonist: undefined };
    const res = evaluateTriggerExplained(pattern.trigger, [orphan], {}, { kind: "detail" });
    expect(res.ok).toBe(false);
  });

  it("NOT matches: irreversibility не high/medium", () => {
    const low = { ...destructive, irreversibility: "extreme" };
    const res = evaluateTriggerExplained(pattern.trigger, [low, inverse], {}, { kind: "detail" });
    expect(res.ok).toBe(false);
  });

  it("NOT matches: intent.undoable=false (explicit opt-out)", () => {
    const optOut = { ...destructive, undoable: false };
    const res = evaluateTriggerExplained(pattern.trigger, [optOut, inverse], {}, { kind: "detail" });
    expect(res.ok).toBe(false);
  });

  it("NOT matches: projection.undoToast=false", () => {
    const res = evaluateTriggerExplained(pattern.trigger, [destructive, inverse], {},
      { kind: "detail", undoToast: false });
    expect(res.ok).toBe(false);
  });

  it("apply: добавляет undoToast overlay с правильной inverseIntentId", () => {
    const next = pattern.structure.apply(
      { overlay: [] },
      { intents: [destructive, inverse] }
    );
    expect(next.overlay).toHaveLength(1);
    expect(next.overlay[0]).toMatchObject({
      type: "undoToast",
      intentId: "reject_bid",
      inverseIntentId: "accept_bid",
      windowSec: 7,
    });
  });

  it("apply: использует intent.undoWindowSec override", () => {
    const fastIntent = { ...destructive, undoWindowSec: 3 };
    const next = pattern.structure.apply(
      { overlay: [] },
      { intents: [fastIntent, inverse] }
    );
    expect(next.overlay[0].windowSec).toBe(3);
  });

  it("apply: projection.undoWindowSec override", () => {
    const next = pattern.structure.apply(
      { overlay: [] },
      { intents: [destructive, inverse], projection: { undoWindowSec: 15 } }
    );
    expect(next.overlay[0].windowSec).toBe(15);
  });

  it("apply idempotent: undoToast уже в overlay для intentId", () => {
    const slots = { overlay: [{ type: "undoToast", intentId: "reject_bid" }] };
    const next = pattern.structure.apply(slots, { intents: [destructive, inverse] });
    expect(next).toBe(slots);
  });

  it("apply: каждый overlay entry имеет stable `key` (validateArtifact §13.11)", () => {
    const next = pattern.structure.apply(
      { overlay: [] },
      { intents: [destructive, inverse] }
    );
    expect(next.overlay[0].key).toBe("undoToast__reject_bid");
    // Идемпотентность: дополнительный intent → дополнительный stable key
    const both = pattern.structure.apply(
      { overlay: [] },
      { intents: [destructive, inverse, { ...destructive, id: "delete_x" }, { ...inverse, id: "restore_x" }] }
    );
    const keys = both.overlay.map((o) => o.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
