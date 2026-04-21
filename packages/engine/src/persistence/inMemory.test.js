import { describe, it, expect } from "vitest";
import { createInMemoryPersistence } from "./inMemory.js";

const mkEffect = (id, props = {}) => ({
  id, intent_id: "x", alpha: "add", target: "t", status: "proposed",
  context: {}, created_at: Date.now(), ...props,
});

describe("createInMemoryPersistence", () => {
  it("appends and reads effects", async () => {
    const p = createInMemoryPersistence();
    await p.appendEffect(mkEffect("a"));
    await p.appendEffect(mkEffect("b"));
    const all = await p.readEffects();
    expect(all).toHaveLength(2);
    expect(all.map(e => e.id).sort()).toEqual(["a", "b"]);
  });

  it("rejects effect without id", async () => {
    const p = createInMemoryPersistence();
    await expect(p.appendEffect({})).rejects.toThrow(/id/);
  });

  it("filters readEffects by status", async () => {
    const p = createInMemoryPersistence();
    await p.appendEffect(mkEffect("a", { status: "confirmed" }));
    await p.appendEffect(mkEffect("b", { status: "rejected" }));
    await p.appendEffect(mkEffect("c", { status: "proposed" }));
    const confirmed = await p.readEffects({ status: "confirmed" });
    expect(confirmed).toHaveLength(1);
    expect(confirmed[0].id).toBe("a");
  });

  it("filters by since timestamp", async () => {
    const p = createInMemoryPersistence();
    await p.appendEffect(mkEffect("a", { created_at: 100 }));
    await p.appendEffect(mkEffect("b", { created_at: 200 }));
    const out = await p.readEffects({ since: 150 });
    expect(out.map(e => e.id)).toEqual(["b"]);
  });

  it("updateStatus changes effect status + resolved_at", async () => {
    const p = createInMemoryPersistence();
    await p.appendEffect(mkEffect("a"));
    await p.updateStatus("a", "rejected", { reason: "test-reason" });
    const [e] = await p.readEffects();
    expect(e.status).toBe("rejected");
    expect(e.reason).toBe("test-reason");
    expect(typeof e.resolved_at).toBe("number");
  });

  it("updateStatus is no-op for unknown id", async () => {
    const p = createInMemoryPersistence();
    await p.updateStatus("missing", "confirmed"); // не бросает
    expect(await p.readEffects()).toEqual([]);
  });

  it("ruleState.get returns zero-state for new rule", async () => {
    const p = createInMemoryPersistence();
    const s = await p.ruleState.get("r1", "u1");
    expect(s).toEqual({ counter: 0, lastFiredAt: null });
  });

  it("ruleState.set merges patch with previous", async () => {
    const p = createInMemoryPersistence();
    await p.ruleState.set("r1", "u1", { counter: 3 });
    await p.ruleState.set("r1", "u1", { lastFiredAt: 1000 });
    const s = await p.ruleState.get("r1", "u1");
    expect(s).toEqual({ counter: 3, lastFiredAt: 1000 });
  });

  it("ruleState isolates by (ruleId, userId) pair", async () => {
    const p = createInMemoryPersistence();
    await p.ruleState.set("r1", "u1", { counter: 5 });
    await p.ruleState.set("r1", "u2", { counter: 7 });
    await p.ruleState.set("r2", "u1", { counter: 9 });
    expect((await p.ruleState.get("r1", "u1")).counter).toBe(5);
    expect((await p.ruleState.get("r1", "u2")).counter).toBe(7);
    expect((await p.ruleState.get("r2", "u1")).counter).toBe(9);
  });

  it("uses injected clock for updateStatus fallback resolved_at", async () => {
    const p = createInMemoryPersistence({ clock: () => 42 });
    await p.appendEffect(mkEffect("a"));
    await p.updateStatus("a", "confirmed"); // без opts.resolvedAt → fallback
    const [e] = await p.readEffects();
    expect(e.resolved_at).toBe(42);
  });

  it("explicit opts.resolvedAt overrides injected clock", async () => {
    const p = createInMemoryPersistence({ clock: () => 42 });
    await p.appendEffect(mkEffect("a"));
    await p.updateStatus("a", "confirmed", { resolvedAt: 999 });
    const [e] = await p.readEffects();
    expect(e.resolved_at).toBe(999);
  });
});
