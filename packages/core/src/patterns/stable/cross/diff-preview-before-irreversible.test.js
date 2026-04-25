import { describe, it, expect } from "vitest";
import pattern from "./diff-preview-before-irreversible.js";

const { trigger, structure, _helpers } = pattern;
const { detectDualStateFields } = _helpers;

// ── helpers ──────────────────────────────────────────────────────────────────

function makeIrrIntent(id) {
  return { id, irreversibility: "high", particles: { effects: [] } };
}

function makeConfirmOverlay(intentId) {
  return {
    type: "confirmDialog",
    key: `overlay_${intentId}`,
    triggerIntentId: intentId,
    irreversibility: "high",
    message: `${intentId}?`,
  };
}

/** Онтология с currentConfig + targetConfig на mainEntity */
function makeCurrentTargetOntology(mainEntity = "Application") {
  return {
    entities: {
      [mainEntity]: {
        fields: {
          id:            { type: "text" },
          currentConfig: { type: "textarea", label: "Текущий конфиг" },
          targetConfig:  { type: "textarea", label: "Целевой конфиг" },
          status:        { type: "select",   options: ["synced", "OutOfSync"] },
        },
      },
    },
  };
}

/** Онтология с fieldRole current-state / desired-state */
function makeRoleBasedOntology(mainEntity = "Deployment") {
  return {
    entities: {
      [mainEntity]: {
        fields: {
          id:           { type: "text" },
          liveSpec:     { type: "textarea", fieldRole: "current-state", label: "Live" },
          desiredSpec:  { type: "textarea", fieldRole: "desired-state", label: "Desired" },
        },
      },
    },
  };
}

/** Онтология без dual-state полей */
function makeSimpleOntology(mainEntity = "Deal") {
  return {
    entities: {
      [mainEntity]: {
        fields: {
          id:     { type: "text" },
          amount: { type: "number", fieldRole: "money" },
          status: { type: "select", options: ["open", "closed"] },
        },
      },
    },
  };
}

// ── trigger.match ─────────────────────────────────────────────────────────────

describe("diff-preview-before-irreversible — trigger.match", () => {
  it("матчится: current+target поля + high-irr intent", () => {
    const intents = [makeIrrIntent("rollback")];
    const ontology = makeCurrentTargetOntology("Application");
    const projection = { kind: "detail", mainEntity: "Application" };
    expect(trigger.match(intents, ontology, projection)).toBe(true);
  });

  it("матчится: live+desired поля + high-irr intent", () => {
    const intents = [makeIrrIntent("force_sync")];
    const ontology = {
      entities: {
        App: {
          fields: {
            id:          { type: "text" },
            liveImage:   { type: "text", label: "Live" },
            desiredImage: { type: "text", label: "Desired" },
          },
        },
      },
    };
    const projection = { kind: "detail", mainEntity: "App" };
    expect(trigger.match(intents, ontology, projection)).toBe(true);
  });

  it("матчится: before+after поля + high-irr intent", () => {
    const intents = [makeIrrIntent("apply_patch")];
    const ontology = {
      entities: {
        Config: {
          fields: {
            id:           { type: "text" },
            beforeSchema: { type: "textarea" },
            afterSchema:  { type: "textarea" },
          },
        },
      },
    };
    const projection = { kind: "detail", mainEntity: "Config" };
    expect(trigger.match(intents, ontology, projection)).toBe(true);
  });

  it("матчится: fieldRole current-state/desired-state + high-irr intent", () => {
    const intents = [makeIrrIntent("promote_deployment")];
    const ontology = makeRoleBasedOntology("Deployment");
    const projection = { kind: "detail", mainEntity: "Deployment" };
    expect(trigger.match(intents, ontology, projection)).toBe(true);
  });

  it("не матчится: dual-state поля есть, но нет high-irr intent", () => {
    const intents = [{ id: "view", irreversibility: "low", particles: { effects: [] } }];
    const ontology = makeCurrentTargetOntology("Application");
    const projection = { kind: "detail", mainEntity: "Application" };
    expect(trigger.match(intents, ontology, projection)).toBe(false);
  });

  it("не матчится: high-irr intent есть, но entity без dual-state полей", () => {
    const intents = [makeIrrIntent("delete_deal")];
    const ontology = makeSimpleOntology("Deal");
    const projection = { kind: "detail", mainEntity: "Deal" };
    expect(trigger.match(intents, ontology, projection)).toBe(false);
  });

  it("не матчится: projection без mainEntity", () => {
    const intents = [makeIrrIntent("rollback")];
    const ontology = makeCurrentTargetOntology("Application");
    const projection = { kind: "detail" };
    expect(trigger.match(intents, ontology, projection)).toBe(false);
  });
});

// ── structure.apply ───────────────────────────────────────────────────────────

describe("diff-preview-before-irreversible — structure.apply", () => {
  it("добавляет showDiff и diffFields в confirmDialog overlay для high-irr intent", () => {
    const slots = {
      overlay: [makeConfirmOverlay("rollback")],
    };
    const context = {
      intents: [makeIrrIntent("rollback")],
      ontology: makeCurrentTargetOntology("Application"),
      projection: { kind: "detail", mainEntity: "Application" },
    };
    const result = structure.apply(slots, context);
    const entry = result.overlay.find(o => o.triggerIntentId === "rollback");
    expect(entry.showDiff).toBe(true);
    expect(entry.diffFields).toEqual({ from: "currentConfig", to: "targetConfig" });
  });

  it("no-op если showDiff уже задан (idempotent)", () => {
    const overlay = [{ ...makeConfirmOverlay("rollback"), showDiff: true, diffFields: { from: "a", to: "b" } }];
    const slots = { overlay };
    const context = {
      intents: [makeIrrIntent("rollback")],
      ontology: makeCurrentTargetOntology("Application"),
      projection: { kind: "detail", mainEntity: "Application" },
    };
    const result = structure.apply(slots, context);
    // Entry не меняется — от уже был showDiff: true
    expect(result.overlay[0].diffFields).toEqual({ from: "a", to: "b" });
    expect(result).toBe(slots); // ссылка та же — slots не менялся
  });

  it("no-op если overlay пустой", () => {
    const slots = { overlay: [] };
    const context = {
      intents: [makeIrrIntent("rollback")],
      ontology: makeCurrentTargetOntology("Application"),
      projection: { kind: "detail", mainEntity: "Application" },
    };
    const result = structure.apply(slots, context);
    expect(result.overlay).toHaveLength(0);
  });

  it("не мутирует входной slots (pure function)", () => {
    const overlayEntry = makeConfirmOverlay("rollback");
    const slots = { overlay: [overlayEntry] };
    Object.freeze(slots);
    Object.freeze(slots.overlay);
    Object.freeze(overlayEntry);
    const context = {
      intents: [makeIrrIntent("rollback")],
      ontology: makeCurrentTargetOntology("Application"),
      projection: { kind: "detail", mainEntity: "Application" },
    };
    expect(() => structure.apply(slots, context)).not.toThrow();
    expect(overlayEntry.showDiff).toBeUndefined();
  });

  it("пропускает confirmDialog с triggerIntentId != high-irr intent", () => {
    const slots = {
      overlay: [makeConfirmOverlay("low_action"), makeConfirmOverlay("rollback")],
    };
    const context = {
      intents: [
        { id: "low_action", irreversibility: "low", particles: { effects: [] } },
        makeIrrIntent("rollback"),
      ],
      ontology: makeCurrentTargetOntology("Application"),
      projection: { kind: "detail", mainEntity: "Application" },
    };
    const result = structure.apply(slots, context);
    const low = result.overlay.find(o => o.triggerIntentId === "low_action");
    const high = result.overlay.find(o => o.triggerIntentId === "rollback");
    expect(low.showDiff).toBeUndefined();
    expect(high.showDiff).toBe(true);
  });

  it("использует fieldRole-пару если name-пара отсутствует", () => {
    const slots = { overlay: [makeConfirmOverlay("promote")] };
    const context = {
      intents: [makeIrrIntent("promote")],
      ontology: makeRoleBasedOntology("Deployment"),
      projection: { kind: "detail", mainEntity: "Deployment" },
    };
    const result = structure.apply(slots, context);
    const entry = result.overlay.find(o => o.triggerIntentId === "promote");
    expect(entry.showDiff).toBe(true);
    expect(entry.diffFields).toEqual({ from: "liveSpec", to: "desiredSpec" });
  });
});

// ── _helpers.detectDualStateFields ────────────────────────────────────────────

describe("detectDualStateFields", () => {
  it("находит пару current+target по имени поля", () => {
    const fields = {
      currentConfig: { type: "textarea" },
      targetConfig:  { type: "textarea" },
    };
    expect(detectDualStateFields(fields)).toEqual({ from: "currentConfig", to: "targetConfig" });
  });

  it("находит пару live+desired по имени поля", () => {
    const fields = {
      liveImage:   { type: "text" },
      desiredImage: { type: "text" },
    };
    expect(detectDualStateFields(fields)).toEqual({ from: "liveImage", to: "desiredImage" });
  });

  it("находит пару по fieldRole current-state/desired-state (приоритет над name)", () => {
    const fields = {
      specA: { type: "textarea", fieldRole: "current-state" },
      specB: { type: "textarea", fieldRole: "desired-state" },
    };
    const result = detectDualStateFields(fields);
    expect(result).toEqual({ from: "specA", to: "specB" });
  });

  it("возвращает null если нет dual-state пары", () => {
    const fields = {
      id:     { type: "text" },
      amount: { type: "number" },
      status: { type: "select" },
    };
    expect(detectDualStateFields(fields)).toBeNull();
  });
});
