import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { TimerQueue, hydrateFromWorld, evalGuard, createTimeEngine } from "./timeEngine.js";
import { createInMemoryPersistence } from "./persistence/inMemory.js";

describe("TimerQueue", () => {
  it("insert + size + removeById", () => {
    const q = new TimerQueue();
    q.insert({ id: "a", firesAt: 10 });
    q.insert({ id: "b", firesAt: 20 });
    expect(q.size()).toBe(2);
    q.removeById("a");
    expect(q.size()).toBe(1);
  });

  it("popDue returns ≤ now, removes from queue, ascending", () => {
    const q = new TimerQueue();
    q.insert({ id: "c", firesAt: 30 });
    q.insert({ id: "a", firesAt: 10 });
    q.insert({ id: "b", firesAt: 20 });
    const due = q.popDue(25);
    expect(due.map(t => t.id)).toEqual(["a", "b"]);
    expect(q.size()).toBe(1);
    expect(q.snapshot()[0].id).toBe("c");
  });

  it("popDue empty when nothing due", () => {
    const q = new TimerQueue();
    q.insert({ id: "a", firesAt: 100 });
    expect(q.popDue(50)).toEqual([]);
    expect(q.size()).toBe(1);
  });
});

describe("hydrateFromWorld", () => {
  it("inserts only active + not-firedAt timers", () => {
    const q = new TimerQueue();
    hydrateFromWorld(q, {
      scheduledTimers: [
        { id: "a", active: true, firedAt: null, firesAt: 1 },
        { id: "b", active: false, firedAt: null, firesAt: 2 },
        { id: "c", active: true, firedAt: 100, firesAt: 3 },
      ],
    });
    expect(q.size()).toBe(1);
    expect(q.snapshot()[0].id).toBe("a");
  });

  it("noop для пустого world", () => {
    const q = new TimerQueue();
    hydrateFromWorld(q, {});
    expect(q.size()).toBe(0);
  });
});

describe("evalGuard", () => {
  it("true when expression empty", () => {
    expect(evalGuard(null, {})).toBe(true);
  });
  it("evaluates world-based expression", () => {
    expect(evalGuard("world.a > 5", { a: 10 })).toBe(true);
    expect(evalGuard("world.a > 5", { a: 3 })).toBe(false);
  });
  it("returns false on error", () => {
    expect(evalGuard("bogus(", {})).toBe(false);
  });
});

describe("createTimeEngine — onEffectConfirmed + fireDue", () => {
  it("schedule_timer inserts into queue", () => {
    const te = createTimeEngine({ clock: () => 1000 });
    te.onEffectConfirmed({
      intent_id: "schedule_timer",
      value: null,
      context: { id: "t1", firesAt: 1500, fireIntent: "remind" },
    });
    expect(te.queue.size()).toBe(1);
  });

  it("revoke_timer removes from queue", () => {
    const te = createTimeEngine({ clock: () => 1000 });
    te.onEffectConfirmed({
      intent_id: "schedule_timer",
      context: { id: "t1", firesAt: 1500, fireIntent: "x" },
    });
    te.onEffectConfirmed({
      intent_id: "revoke_timer",
      context: { id: "t1" },
    });
    expect(te.queue.size()).toBe(0);
  });

  it("fireDue emits fireIntent + revoke_timer when due", () => {
    const te = createTimeEngine({ clock: () => 2000 });
    te.onEffectConfirmed({
      intent_id: "schedule_timer",
      context: { id: "t1", firesAt: 1500, fireIntent: "remind_me", fireParams: { x: 1 } },
    });
    const emitted = te.fireDue({});
    expect(emitted.length).toBe(2);
    expect(emitted[0].intent_id).toBe("remind_me");
    expect(emitted[0].context.x).toBe(1);
    expect(emitted[1].intent_id).toBe("revoke_timer");
    expect(emitted[1].context.guardEvaluatedTrue).toBe(true);
    expect(te.queue.size()).toBe(0);
  });

  it("fireDue skips fireIntent when guard fails but still revokes", () => {
    const te = createTimeEngine({ clock: () => 2000 });
    te.onEffectConfirmed({
      intent_id: "schedule_timer",
      context: { id: "t1", firesAt: 1500, fireIntent: "x", guard: "world.ok === true" },
    });
    const emitted = te.fireDue({ ok: false });
    // Только revoke_timer
    expect(emitted.length).toBe(1);
    expect(emitted[0].intent_id).toBe("revoke_timer");
    expect(emitted[0].context.guardEvaluatedTrue).toBe(false);
  });

  it("cron self-reschedules после firing", () => {
    const te = createTimeEngine({ clock: () => Date.UTC(2026, 3, 21, 9, 0) });
    const firesAt = Date.UTC(2026, 3, 21, 9, 0);
    te.onEffectConfirmed({
      intent_id: "schedule_timer",
      context: { id: "t1", firesAt, fireIntent: "daily_x", cronSchedule: "daily:09:00" },
    });
    const emitted = te.fireDue({});
    // fire + revoke + next schedule
    expect(emitted.length).toBe(3);
    const nextSchedule = emitted.find(e => e.intent_id === "schedule_timer");
    expect(nextSchedule).toBeDefined();
    expect(nextSchedule.context.firesAt).toBeGreaterThan(firesAt);
  });
});

describe("createTimeEngine — hydrate from persistence", () => {
  it("recovers timers from confirmed schedule_timer effects", async () => {
    const persistence = createInMemoryPersistence();
    await persistence.appendEffect({
      id: "e1", intent_id: "schedule_timer", alpha: "add", target: "ScheduledTimer",
      status: "confirmed", context: { id: "t1", firesAt: 5000, fireIntent: "x" }, created_at: 100,
    });
    await persistence.appendEffect({
      id: "e2", intent_id: "schedule_timer", alpha: "add", target: "ScheduledTimer",
      status: "confirmed", context: { id: "t2", firesAt: 6000, fireIntent: "y" }, created_at: 200,
    });
    const te = createTimeEngine({ persistence });
    await te.hydrate();
    expect(te.queue.size()).toBe(2);
  });

  it("hydrate удаляет уже revoked таймеры", async () => {
    const persistence = createInMemoryPersistence();
    await persistence.appendEffect({
      id: "e1", intent_id: "schedule_timer", alpha: "add", target: "ScheduledTimer",
      status: "confirmed", context: { id: "t1", firesAt: 5000, fireIntent: "x" }, created_at: 100,
    });
    await persistence.appendEffect({
      id: "e2", intent_id: "revoke_timer", alpha: "replace", target: "ScheduledTimer",
      status: "confirmed", context: { id: "t1", firedAt: 200 }, created_at: 200,
    });
    const te = createTimeEngine({ persistence });
    await te.hydrate();
    expect(te.queue.size()).toBe(0);
  });
});

describe("TimerQueue — property-based ordering invariant", () => {
  it("popDue returns timers in firesAt ascending order regardless of insert order", () => {
    fc.assert(fc.property(
      fc.array(
        fc.tuple(fc.uuid(), fc.integer({ min: 1, max: 1_000_000 })),
        { minLength: 2, maxLength: 30 }
      ),
      (spec) => {
        const queue = new TimerQueue();
        for (const [id, firesAt] of spec) {
          queue.insert({ id, firesAt });
        }
        const now = Math.max(...spec.map(([, f]) => f));
        const due = queue.popDue(now);
        for (let i = 1; i < due.length; i++) {
          expect(due[i].firesAt).toBeGreaterThanOrEqual(due[i - 1].firesAt);
        }
        // Всё что firesAt <= now попадает в due (unique id).
        const uniqueIds = new Set(spec.map(([id]) => id));
        expect(due.length).toBe(uniqueIds.size);
      }
    ), { numRuns: 50 });
  });
});
