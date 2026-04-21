import { describe, it, expect } from "vitest";
import { createEngine, createInMemoryPersistence } from "./index.js";

/**
 * Integration fixture: booking domain с
 *  - 1 cardinality invariant (max 1 pending per userId)
 *  - 1 rule (confirm_booking триггерит schedule_timer на auto_cancel через 1ч)
 *  - 1 timer (auto_cancel)
 *
 * Покрывает полный submit → validate → rule-react → timer-schedule цикл.
 */

const bookingDomain = {
  ONTOLOGY: {
    entities: {
      Booking: { ownerField: "userId" },
    },
    roles: {
      user: { base: "owner", visibleFields: { Booking: ["id", "userId", "status"] } },
    },
    invariants: [
      {
        kind: "cardinality",
        entity: "Booking",
        groupBy: "userId",
        max: 1,
        severity: "error",
      },
    ],
    rules: [
      {
        id: "auto_cancel_timer",
        trigger: "create_booking",
        after: "1h",
        fireIntent: "auto_cancel",
        params: { bookingId: "$.id" },
      },
    ],
  },
  INTENTS: {
    create_booking: {
      particles: { effects: [{ alpha: "add", target: "Booking" }], conditions: [] },
    },
    auto_cancel: {
      particles: { effects: [{ alpha: "replace", target: "Booking.status" }], conditions: [] },
    },
    schedule_timer: { particles: { effects: [], conditions: [] } },
    revoke_timer: { particles: { effects: [], conditions: [] } },
  },
};

describe("engine — booking integration", () => {
  it("create_booking confirmed + cardinality enforced on duplicate", async () => {
    const persistence = createInMemoryPersistence();
    const engine = createEngine({
      domain: bookingDomain,
      persistence,
      clock: () => 1000,
    });
    await engine.hydrate();

    const first = await engine.submit({
      id: "e1", intent_id: "create_booking", alpha: "add", target: "Booking",
      context: { id: "bk1", userId: "u1", status: "pending" }, created_at: 1000,
    });
    expect(first.status).toBe("confirmed");

    const second = await engine.submit({
      id: "e2", intent_id: "create_booking", alpha: "add", target: "Booking",
      context: { id: "bk2", userId: "u1", status: "pending" }, created_at: 2000,
    });
    expect(second.status).toBe("rejected");
    expect(second.reason).toMatch(/cardinality/i);

    const world = await engine.foldWorld();
    expect(world.bookings).toHaveLength(1);
    expect(world.bookings[0].id).toBe("bk1");
  });

  it("create_booking triggers schedule_timer rule", async () => {
    const persistence = createInMemoryPersistence();
    const engine = createEngine({
      domain: bookingDomain,
      persistence,
      clock: () => 1_000_000,
    });
    await engine.hydrate();

    await engine.submit({
      id: "e1", intent_id: "create_booking", alpha: "add", target: "Booking",
      context: { id: "bk1", userId: "u1", status: "pending" }, created_at: 1_000_000,
    });

    // В Φ должен быть появиться schedule_timer эффект
    const all = await persistence.readEffects({ status: "confirmed" });
    const timerEffect = all.find(e => e.intent_id === "schedule_timer");
    expect(timerEffect).toBeDefined();
    expect(timerEffect.context.firesAt).toBe(1_000_000 + 3_600_000);
    expect(timerEffect.context.fireIntent).toBe("auto_cancel");
  });

  it("tick fires due timer and emits auto_cancel", async () => {
    const persistence = createInMemoryPersistence();
    let time = 1_000_000;
    const engine = createEngine({
      domain: bookingDomain,
      persistence,
      clock: () => time,
    });
    await engine.hydrate();

    await engine.submit({
      id: "e1", intent_id: "create_booking", alpha: "add", target: "Booking",
      context: { id: "bk1", userId: "u1", status: "pending" }, created_at: 1_000_000,
    });

    // Перематываем на 1 час и 1 секунду
    time = 1_000_000 + 3_600_000 + 1000;

    const emitted = await engine.tick();
    expect(emitted.length).toBeGreaterThanOrEqual(1);
    const autoCancel = emitted.find(e => e.intent_id === "auto_cancel");
    expect(autoCancel).toBeDefined();
    expect(autoCancel.context.bookingId).toBe("bk1");
  });
});
