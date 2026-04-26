import { describe, it, expect } from "vitest";
import * as core from "./index.js";

describe("@intent-driven/core — snapshot exports (A1)", () => {
  it("экспортирует createSnapshot, foldFromSnapshot, applyEffect, getCollectionType", () => {
    expect(typeof core.createSnapshot).toBe("function");
    expect(typeof core.foldFromSnapshot).toBe("function");
    expect(typeof core.applyEffect).toBe("function");
    expect(typeof core.getCollectionType).toBe("function");
  });

  it("createSnapshot и foldFromSnapshot работают через публичный API", () => {
    const effects = [
      {
        id: "e1",
        parent_id: null,
        target: "user",
        alpha: "add",
        status: "confirmed",
        context: { id: "u1", name: "Alice" },
        created_at: 100,
      },
    ];
    const snap = core.createSnapshot(effects);
    expect(snap.world.user).toHaveLength(1);
    const next = core.foldFromSnapshot(snap, [
      {
        id: "e2",
        parent_id: null,
        target: "user",
        alpha: "add",
        status: "confirmed",
        context: { id: "u2" },
        created_at: 200,
      },
    ]);
    expect(next.user).toHaveLength(2);
  });
});
