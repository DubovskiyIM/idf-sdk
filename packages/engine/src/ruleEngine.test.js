import { describe, it, expect } from "vitest";
import {
  createRuleEngine,
  matchTrigger,
  resolveContext,
  buildActionEffect,
  evaluateCondition,
  evaluateRuleCondition,
  parseSchedule,
  shouldFireSchedule,
  cronToFirstFiresAt,
} from "./ruleEngine.js";
import { createInMemoryPersistence } from "./persistence/inMemory.js";

const SIMPLE_INTENT = {
  particles: { effects: [{ alpha: "add", target: "Notif", value: null }] },
};

function mkEngine({ rules = [], intents = { notify: SIMPLE_INTENT }, clock, onRuleTriggered } = {}) {
  const persistence = createInMemoryPersistence();
  const engine = createRuleEngine({
    persistence,
    rules,
    intents,
    clock: clock || (() => 1000),
    onRuleTriggered,
  });
  return { engine, persistence };
}

describe("matchTrigger", () => {
  it("exact match", () => {
    expect(matchTrigger("create_foo", "create_foo")).toBe(true);
    expect(matchTrigger("create_foo", "create_bar")).toBe(false);
  });
  it("wildcard *", () => {
    expect(matchTrigger("*", "anything")).toBe(true);
  });
  it("prefix glob", () => {
    expect(matchTrigger("vote_*", "vote_up")).toBe(true);
    expect(matchTrigger("vote_*", "veto")).toBe(false);
  });
  it("array OR", () => {
    expect(matchTrigger(["a", "b"], "b")).toBe(true);
    expect(matchTrigger(["a", "b"], "c")).toBe(false);
  });
  it("non-string returns false", () => {
    expect(matchTrigger(null, "x")).toBe(false);
    expect(matchTrigger(undefined, "x")).toBe(false);
  });
});

describe("resolveContext", () => {
  it("resolves effect.field paths", () => {
    const r = resolveContext({ userId: "effect.userId", name: "literal" }, { userId: "u1" });
    expect(r).toEqual({ userId: "u1", name: "literal" });
  });
  it("returns empty for empty mapping", () => {
    expect(resolveContext(null, {})).toEqual({});
  });
});

describe("buildActionEffect", () => {
  it("single effect", () => {
    const ef = buildActionEffect("notify", SIMPLE_INTENT, { x: 1 }, "rule_1", () => 100);
    expect(ef.alpha).toBe("add");
    expect(ef.target).toBe("Notif");
    expect(ef.context.x).toBe(1);
    expect(ef.context.__witness.ruleId).toBe("rule_1");
    expect(ef.created_at).toBe(100);
    expect(ef.status).toBe("proposed");
  });
  it("batch for multiple effects", () => {
    const intent = { particles: { effects: [
      { alpha: "add", target: "A" },
      { alpha: "replace", target: "B.status" },
    ] } };
    const ef = buildActionEffect("do", intent, {}, null, () => 0);
    expect(ef.alpha).toBe("batch");
    expect(Array.isArray(ef.value)).toBe(true);
    expect(ef.value.length).toBe(2);
  });
});

describe("evaluateCondition (threshold DSL)", () => {
  it("all_equal", () => {
    expect(evaluateCondition("all_equal:7", [7, 7, 7])).toBe(true);
    expect(evaluateCondition("all_equal:7", [7, 8, 7])).toBe(false);
  });
  it("equals / gt / lt", () => {
    expect(evaluateCondition("equals:5", [5])).toBe(true);
    expect(evaluateCondition("gt:3", [5])).toBe(true);
    expect(evaluateCondition("lt:3", [5])).toBe(false);
  });
  it("falsy on missing condition", () => {
    expect(evaluateCondition(null, [1])).toBe(false);
  });
});

describe("evaluateRuleCondition (JS expression)", () => {
  it("returns true when no expression", () => {
    expect(evaluateRuleCondition(null, {})).toBe(true);
  });
  it("evaluates effect.x > 0.6", () => {
    expect(evaluateRuleCondition("effect.x > 0.6", { x: 0.8 })).toBe(true);
    expect(evaluateRuleCondition("effect.x > 0.6", { x: 0.5 })).toBe(false);
  });
  it("supports Math.abs", () => {
    expect(evaluateRuleCondition("Math.abs(effect.delta) > 0.5", { delta: -0.8 })).toBe(true);
  });
  it("returns false on parse error", () => {
    expect(evaluateRuleCondition("not a valid expression !!!", {})).toBe(false);
  });
});

describe("parseSchedule", () => {
  it("weekly", () => {
    expect(parseSchedule("weekly:sun:20:00")).toEqual({ period: "weekly", day: 0, hour: 20, minute: 0 });
  });
  it("daily", () => {
    expect(parseSchedule("daily:08:00")).toEqual({ period: "daily", hour: 8, minute: 0 });
  });
  it("returns null for invalid", () => {
    expect(parseSchedule(null)).toBe(null);
  });
});

describe("shouldFireSchedule", () => {
  // shouldFireSchedule использует LOCAL time (getHours/getMinutes/getDay).
  // Чтобы не зависеть от TZ runner'а — конструируем Date локально.
  it("fires when time matches + dedup ok", () => {
    const sched = { period: "daily", hour: 8, minute: 0 };
    const now = new Date(2026, 3, 21, 8, 0, 0); // 21 апреля 2026, 08:00 local
    expect(shouldFireSchedule(sched, now, 0, now.getTime())).toBe(true);
  });
  it("skips when already fired recently", () => {
    const sched = { period: "daily", hour: 8, minute: 0 };
    const now = new Date(2026, 3, 21, 8, 0, 0);
    const lastFiredAt = now.getTime() - 1000; // <4 minutes ago
    expect(shouldFireSchedule(sched, now, lastFiredAt, now.getTime())).toBe(false);
  });
});

describe("cronToFirstFiresAt", () => {
  it("daily schedule pushes to next day if past", () => {
    const parsed = { period: "daily", hour: 8, minute: 0 };
    const nowMs = new Date("2026-04-21T09:00:00Z").getTime();
    const firesAt = cronToFirstFiresAt(parsed, nowMs);
    expect(firesAt).toBeGreaterThan(nowMs);
    const diff = firesAt - nowMs;
    expect(diff).toBeGreaterThan(20 * 3600 * 1000);
    expect(diff).toBeLessThan(24 * 3600 * 1000);
  });
});

describe("createRuleEngine — aggregation guard", () => {
  it("fires every Nth trigger per user", async () => {
    const rule = {
      id: "agg_3",
      trigger: "ping",
      action: "notify",
      context: { userId: "effect.userId" },
      aggregation: { everyN: 3 },
    };
    const { engine } = mkEngine({ rules: [rule] });
    const mkPing = () => ({ intent_id: "ping", context: { userId: "u1" } });

    expect((await engine.react(mkPing())).length).toBe(0); // counter=1
    expect((await engine.react(mkPing())).length).toBe(0); // counter=2
    expect((await engine.react(mkPing())).length).toBe(1); // counter=3 → fire
    expect((await engine.react(mkPing())).length).toBe(0); // counter=4
  });

  it("counter isolated per user", async () => {
    const rule = {
      id: "agg_2",
      trigger: "ping",
      action: "notify",
      context: { userId: "effect.userId" },
      aggregation: { everyN: 2 },
    };
    const { engine } = mkEngine({ rules: [rule] });
    const ping = (userId) => ({ intent_id: "ping", context: { userId } });

    expect((await engine.react(ping("u1"))).length).toBe(0);
    expect((await engine.react(ping("u2"))).length).toBe(0);
    expect((await engine.react(ping("u1"))).length).toBe(1); // u1 counter=2
    expect((await engine.react(ping("u2"))).length).toBe(1); // u2 counter=2
  });
});

describe("createRuleEngine — threshold guard", () => {
  it("blocks when lookback not enough", async () => {
    const rule = {
      id: "thr",
      trigger: "log",
      action: "notify",
      context: { userId: "effect.userId" },
      threshold: { lookback: 3, field: "mood", condition: "all_equal:sad", collection: "moodEntries" },
    };
    const { engine } = mkEngine({ rules: [rule] });
    const world = { moodEntries: [{ userId: "u1", mood: "sad", loggedAt: 1 }] };
    const res = await engine.react({ intent_id: "log", context: { userId: "u1" } }, world);
    expect(res.length).toBe(0);
  });

  it("fires when lookback matches", async () => {
    const rule = {
      id: "thr",
      trigger: "log",
      action: "notify",
      context: { userId: "effect.userId" },
      threshold: { lookback: 3, field: "mood", condition: "all_equal:sad", collection: "moodEntries" },
    };
    const { engine } = mkEngine({ rules: [rule] });
    const world = {
      moodEntries: [
        { userId: "u1", mood: "sad", loggedAt: 3 },
        { userId: "u1", mood: "sad", loggedAt: 2 },
        { userId: "u1", mood: "sad", loggedAt: 1 },
      ],
    };
    const res = await engine.react({ intent_id: "log", context: { userId: "u1" } }, world);
    expect(res.length).toBe(1);
  });
});

describe("createRuleEngine — condition guard", () => {
  it("skips when condition false", async () => {
    const rule = {
      id: "cond",
      trigger: "signal",
      action: "notify",
      context: {},
      condition: "effect.x > 0.6",
    };
    const { engine } = mkEngine({ rules: [rule] });
    const res = await engine.react({ intent_id: "signal", context: { x: 0.5 } });
    expect(res.length).toBe(0);
  });
  it("fires when condition true", async () => {
    const rule = {
      id: "cond",
      trigger: "signal",
      action: "notify",
      context: {},
      condition: "effect.x > 0.6",
    };
    const { engine } = mkEngine({ rules: [rule] });
    const res = await engine.react({ intent_id: "signal", context: { x: 0.8 } });
    expect(res.length).toBe(1);
  });
});

describe("createRuleEngine — reactScheduleV2", () => {
  it("emits schedule_timer на match trigger + rule.after", () => {
    const rule = {
      id: "sched_1",
      trigger: "place_order",
      after: "10min",
      fireIntent: "remind_order",
      params: { orderId: "$.orderId" },
    };
    const { engine } = mkEngine({ rules: [rule], clock: () => 1_000_000 });
    const effects = engine.reactScheduleV2({ intent_id: "place_order", context: { orderId: "o1" } });
    expect(effects.length).toBe(1);
    expect(effects[0].intent_id).toBe("schedule_timer");
    expect(effects[0].context.firesAt).toBe(1_000_000 + 10 * 60_000);
    expect(effects[0].context.fireParams.orderId).toBe("o1");
  });

  it("emits revoke_timer на revokeOn trigger", () => {
    const rule = {
      id: "sched_1",
      trigger: "place_order",
      revokeOn: ["cancel_order"],
    };
    const { engine } = mkEngine({ rules: [rule] });
    const world = {
      scheduledTimers: [
        { id: "t1", active: true, firedAt: null, triggerEventKey: "sched_1:place_order" },
      ],
    };
    const effects = engine.reactScheduleV2({ intent_id: "cancel_order", context: {} }, world);
    expect(effects.length).toBe(1);
    expect(effects[0].intent_id).toBe("revoke_timer");
    expect(effects[0].context.id).toBe("t1");
  });
});

describe("createRuleEngine — reactScheduleV2 warnAt", () => {
  const baseRule = {
    id: "booking_ttl",
    trigger: "book_appointment",
    after: "24h",
    fireIntent: "auto_cancel_booking",
    params: { bookingId: "$.bookingId" },
    revokeOn: ["confirm_booking"],
  };

  it("warnAt + after: emit 2 timers — primary + warning", () => {
    const rule = {
      ...baseRule,
      warnAt: "2h",
      warnIntent: "notify_booking_expiring",
    };
    const { engine } = mkEngine({ rules: [rule], clock: () => 1_000_000 });
    const effects = engine.reactScheduleV2({
      intent_id: "book_appointment",
      context: { bookingId: "b1" },
    });
    expect(effects).toHaveLength(2);
    const [primary, warning] = effects;
    expect(primary.context.fireIntent).toBe("auto_cancel_booking");
    expect(primary.context.firesAt).toBe(1_000_000 + 24 * 3_600_000);
    expect(warning.context.fireIntent).toBe("notify_booking_expiring");
    expect(warning.context.firesAt).toBe(primary.context.firesAt - 2 * 3_600_000);
    expect(warning.context.warning).toBe(true);
  });

  it("warnAt + at: поддерживается absolute-path schedule", () => {
    const rule = {
      id: "deadline_warn",
      trigger: "set_deadline",
      at: "$.readyAt",
      fireIntent: "mark_overdue",
      warnAt: "30min",
    };
    const { engine } = mkEngine({ rules: [rule], clock: () => 500 });
    const readyAt = 10_000_000;
    const effects = engine.reactScheduleV2({
      intent_id: "set_deadline",
      context: { readyAt },
    });
    expect(effects).toHaveLength(2);
    expect(effects[0].context.firesAt).toBe(readyAt);
    expect(effects[1].context.firesAt).toBe(readyAt - 30 * 60_000);
    expect(effects[1].context.fireIntent).toBe("__warn");
  });

  it("warnIntent по умолчанию __warn", () => {
    const rule = { ...baseRule, warnAt: "1h" };
    const { engine } = mkEngine({ rules: [rule], clock: () => 0 });
    const effects = engine.reactScheduleV2({
      intent_id: "book_appointment",
      context: { bookingId: "b1" },
    });
    expect(effects[1].context.fireIntent).toBe("__warn");
  });

  it("warnParams по умолчанию наследуются от params (resolved)", () => {
    const rule = { ...baseRule, warnAt: "1h" };
    const { engine } = mkEngine({ rules: [rule], clock: () => 0 });
    const effects = engine.reactScheduleV2({
      intent_id: "book_appointment",
      context: { bookingId: "b1" },
    });
    expect(effects[0].context.fireParams).toEqual({ bookingId: "b1" });
    expect(effects[1].context.fireParams).toEqual({ bookingId: "b1" });
  });

  it("warnParams — явный override с path-resolution", () => {
    const rule = {
      ...baseRule,
      warnAt: "1h",
      warnParams: { id: "$.bookingId", kind: "expiration" },
    };
    const { engine } = mkEngine({ rules: [rule], clock: () => 0 });
    const effects = engine.reactScheduleV2({
      intent_id: "book_appointment",
      context: { bookingId: "b1" },
    });
    expect(effects[1].context.fireParams).toEqual({ id: "b1", kind: "expiration" });
  });

  it("warnAt >= duration: warning пропускается, primary остаётся", () => {
    const rule = { ...baseRule, after: "2h", warnAt: "5h" };
    const { engine } = mkEngine({ rules: [rule], clock: () => 1_000_000 });
    const effects = engine.reactScheduleV2({
      intent_id: "book_appointment",
      context: { bookingId: "b1" },
    });
    expect(effects).toHaveLength(1);
    expect(effects[0].context.fireIntent).toBe("auto_cancel_booking");
  });

  it("warnAt невалидный parse: warning skipped, primary остаётся", () => {
    const rule = { ...baseRule, warnAt: "not-a-duration" };
    const { engine } = mkEngine({ rules: [rule], clock: () => 0 });
    const effects = engine.reactScheduleV2({
      intent_id: "book_appointment",
      context: { bookingId: "b1" },
    });
    expect(effects).toHaveLength(1);
    expect(effects[0].context.fireIntent).toBe("auto_cancel_booking");
  });

  it("warnAt без after/at: primary не эмитится, warning тоже", () => {
    const rule = {
      id: "orphan_warn",
      trigger: "book_appointment",
      fireIntent: "mark_overdue",
      warnAt: "1h",
    };
    const { engine } = mkEngine({ rules: [rule], clock: () => 0 });
    const effects = engine.reactScheduleV2({
      intent_id: "book_appointment",
      context: {},
    });
    expect(effects).toHaveLength(0);
  });

  it("revokeOn cancels и primary, и warning — тот же triggerEventKey", () => {
    const rule = { ...baseRule, warnAt: "2h" };
    const { engine } = mkEngine({ rules: [rule], clock: () => 1_000_000 });
    const scheduled = engine.reactScheduleV2({
      intent_id: "book_appointment",
      context: { bookingId: "b1" },
    });
    // Оба timer'а должны иметь одинаковый triggerEventKey
    expect(scheduled[0].context.triggerEventKey).toBe(scheduled[1].context.triggerEventKey);

    // Симулируем world с обоими активными timer'ами
    const world = {
      scheduledTimers: [
        {
          id: "primary-t",
          active: true,
          firedAt: null,
          triggerEventKey: scheduled[0].context.triggerEventKey,
        },
        {
          id: "warn-t",
          active: true,
          firedAt: null,
          triggerEventKey: scheduled[1].context.triggerEventKey,
        },
      ],
    };
    const revokes = engine.reactScheduleV2(
      { intent_id: "confirm_booking", context: {} },
      world,
    );
    expect(revokes).toHaveLength(2);
    expect(revokes.every(e => e.intent_id === "revoke_timer")).toBe(true);
    expect(revokes.map(e => e.context.id).sort()).toEqual(["primary-t", "warn-t"]);
  });
});

describe("createRuleEngine — determinism property", () => {
  it("same inputs produce same output (stripping uuids)", async () => {
    const rule = {
      id: "det",
      trigger: "ping",
      action: "notify",
      context: { userId: "effect.userId" },
    };
    const strip = (arr) => arr.map(({ id, context, ...rest }) => ({ ...rest, context: { ...context } }));
    const e1 = mkEngine({ rules: [rule], clock: () => 100 }).engine;
    const e2 = mkEngine({ rules: [rule], clock: () => 100 }).engine;
    const r1 = await e1.react({ intent_id: "ping", context: { userId: "u1" } });
    const r2 = await e2.react({ intent_id: "ping", context: { userId: "u1" } });
    // stripping id (uuid) и __witness содержит детерминируемый ruleId
    expect(strip(r1).map(x => ({ alpha: x.alpha, target: x.target, intent_id: x.intent_id })))
      .toEqual(strip(r2).map(x => ({ alpha: x.alpha, target: x.target, intent_id: x.intent_id })));
  });
});
