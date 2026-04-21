/**
 * Тесты: irreversibility guard в validator.submit.
 *
 * §23 манифеста: α:"remove" на сущность с past confirmed effect
 * где __irr.point === "high" && __irr.at !== null — заблокирован.
 * Forward-correction через α:"replace" разрешён всегда.
 *
 * Портировано из host: server/validator.irreversibility.test.js.
 */

import { describe, it, expect } from "vitest";
import { createValidator } from "./validator.js";
import { createInMemoryPersistence } from "./persistence/inMemory.js";

/**
 * Фабрика для тестов — seed confirmed эффектов + createValidator.
 */
async function mkValidator(ontology = {}, seedEffects = [], opts = {}) {
  const clock = opts.clock || (() => 1000);
  const persistence = createInMemoryPersistence({ clock });
  for (const e of seedEffects) {
    await persistence.appendEffect({ ...e, status: "confirmed" });
  }
  const validator = createValidator({
    persistence,
    ontology,
    validateIntentConditions: opts.validateIntentConditions || (() => ({ ok: true })),
    clock,
  });
  return { validator, persistence };
}

describe("irreversibility guard: validator.submit", () => {
  // --------------------------------------------------------------------------
  // 1. remove на entity с past high-irr → rejected
  // --------------------------------------------------------------------------
  it("блокирует remove на past-high-irreversible entity", async () => {
    const ontology = { entities: { Payment: {} }, roles: {} };
    const seed = [
      {
        id: "pay-1", intent_id: "capture_payment", alpha: "add", target: "Payment",
        context: { id: "p1", __irr: { point: "high", at: 1000, reason: "capture" } },
        value: null, created_at: 1000,
      },
    ];
    const { validator } = await mkValidator(ontology, seed);
    const result = await validator.submit({
      id: "pay-2", intent_id: "refund", alpha: "remove", target: "Payment",
      status: "proposed", context: { id: "p1" }, value: null, created_at: 2000,
    });

    expect(result.status).toBe("rejected");
    expect(result.reason).toMatch(/irreversibility/i);
  });

  // --------------------------------------------------------------------------
  // 2. replace (forward correction) на той же entity → confirmed
  // --------------------------------------------------------------------------
  it("разрешает replace (forward correction) на past-high-irreversible entity", async () => {
    const ontology = { entities: { Payment: {} }, roles: {} };
    const seed = [
      {
        id: "pay-1", intent_id: "capture_payment", alpha: "add", target: "Payment",
        context: { id: "p1", __irr: { point: "high", at: 1000, reason: "capture" } },
        value: null, created_at: 1000,
      },
    ];
    const { validator } = await mkValidator(ontology, seed);
    const result = await validator.submit({
      id: "pay-3", intent_id: "mark_refunded", alpha: "replace", target: "Payment",
      status: "proposed", context: { id: "p1", status: "refunded" }, value: null, created_at: 2000,
    });

    expect(result.status).toBe("confirmed");
  });

  // --------------------------------------------------------------------------
  // 3. remove на entity без irreversible past → confirmed
  // --------------------------------------------------------------------------
  it("разрешает remove на entity без __irr в истории", async () => {
    const ontology = { entities: { Draft: {} }, roles: {} };
    const seed = [
      {
        id: "draft-1", intent_id: "create_draft", alpha: "add", target: "Draft",
        context: { id: "d1", title: "test" }, value: null, created_at: 1000,
      },
    ];
    const { validator } = await mkValidator(ontology, seed);
    const result = await validator.submit({
      id: "draft-2", intent_id: "delete_draft", alpha: "remove", target: "Draft",
      status: "proposed", context: { id: "d1" }, value: null, created_at: 2000,
    });

    expect(result.status).toBe("confirmed");
  });

  // --------------------------------------------------------------------------
  // 4. __irr.point: "low" не блокирует remove
  // --------------------------------------------------------------------------
  it("не блокирует remove при __irr.point=low", async () => {
    const ontology = { entities: { Order: {} }, roles: {} };
    const seed = [
      {
        id: "ord-1", intent_id: "create_order", alpha: "add", target: "Order",
        context: { id: "o1", __irr: { point: "low", at: 1000, reason: "soft-lock" } },
        value: null, created_at: 1000,
      },
    ];
    const { validator } = await mkValidator(ontology, seed);
    const result = await validator.submit({
      id: "ord-2", intent_id: "cancel_order", alpha: "remove", target: "Order",
      status: "proposed", context: { id: "o1" }, value: null, created_at: 2000,
    });

    expect(result.status).toBe("confirmed");
  });

  // --------------------------------------------------------------------------
  // 5. __irr.at === null не блокирует remove (guard требует at !== null)
  // --------------------------------------------------------------------------
  it("не блокирует remove когда __irr.at=null (точка не зафиксирована)", async () => {
    const ontology = { entities: { Contract: {} }, roles: {} };
    const seed = [
      {
        id: "con-1", intent_id: "sign_contract", alpha: "add", target: "Contract",
        context: { id: "c1", __irr: { point: "high", at: null, reason: "pending" } },
        value: null, created_at: 1000,
      },
    ];
    const { validator } = await mkValidator(ontology, seed);
    const result = await validator.submit({
      id: "con-2", intent_id: "void_contract", alpha: "remove", target: "Contract",
      status: "proposed", context: { id: "c1" }, value: null, created_at: 2000,
    });

    expect(result.status).toBe("confirmed");
  });
});
