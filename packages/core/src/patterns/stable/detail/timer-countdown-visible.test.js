import { describe, it, expect } from "vitest";
import pattern from "./timer-countdown-visible.js";
import { validatePattern, evaluateTriggerExplained } from "../../schema.js";

describe("timer-countdown-visible (§6.5)", () => {
  it("passes schema validation", () => {
    expect(() => validatePattern(pattern)).not.toThrow();
  });

  it("matches: intent with emit:schedule_timer на mainEntity", () => {
    const intents = [{
      id: "confirm_booking",
      particles: {
        effects: [
          { α: "replace", target: "booking.status", value: "pending" },
          { α: "add", target: "scheduledTimers", emit: "schedule_timer" },
        ],
      },
    }];
    const projection = { kind: "detail", mainEntity: "Booking" };
    const res = evaluateTriggerExplained(pattern.trigger, intents, {}, projection);
    expect(res.ok).toBe(true);
  });

  it("matches: explicit intent=schedule_timer effect", () => {
    const intents = [{
      id: "start_order",
      particles: {
        effects: [
          { α: "replace", target: "order.status", value: "pending_accept" },
          { α: "add", intent: "schedule_timer", target: "orders" },
        ],
      },
    }];
    const projection = { kind: "detail", mainEntity: "Order" };
    const res = evaluateTriggerExplained(pattern.trigger, intents, {}, projection);
    expect(res.ok).toBe(true);
  });

  it("NOT matches: catalog projection", () => {
    const intents = [{
      id: "x",
      particles: {
        effects: [{ α: "add", target: "scheduledTimer", emit: "schedule_timer" }],
      },
    }];
    const projection = { kind: "catalog", mainEntity: "Booking" };
    const res = evaluateTriggerExplained(pattern.trigger, intents, {}, projection);
    expect(res.ok).toBe(false);
  });

  it("NOT matches: нет timer-intent", () => {
    const intents = [{
      id: "edit_booking",
      particles: { effects: [{ α: "replace", target: "booking.title" }] },
    }];
    const projection = { kind: "detail", mainEntity: "Booking" };
    const res = evaluateTriggerExplained(pattern.trigger, intents, {}, projection);
    expect(res.ok).toBe(false);
  });

  it("apply: инжектит countdown первой нодой в header", () => {
    const intents = [{
      id: "confirm_booking",
      particles: {
        effects: [
          { α: "replace", target: "booking.status", value: "pending" },
          { α: "add", target: "scheduledTimers", emit: "schedule_timer" },
        ],
      },
    }];
    const next = pattern.structure.apply(
      { header: [{ type: "title", bind: "title" }] },
      { projection: { kind: "detail", mainEntity: "Booking" }, intents }
    );
    expect(next.header[0]).toEqual({ type: "countdown", bind: "__scheduledTimer" });
    expect(next.header).toHaveLength(2);
  });

  it("apply idempotent: header уже содержит countdown", () => {
    const intents = [{
      id: "confirm_booking",
      particles: {
        effects: [
          { α: "replace", target: "booking.status" },
          { α: "add", target: "scheduledTimers", emit: "schedule_timer" },
        ],
      },
    }];
    const slots = { header: [{ type: "countdown", bind: "custom" }] };
    const next = pattern.structure.apply(slots, {
      projection: { kind: "detail", mainEntity: "Booking" },
      intents,
    });
    expect(next).toBe(slots);
  });
});
