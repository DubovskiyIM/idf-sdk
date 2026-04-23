import { describe, it, expect } from "vitest";
import { appleAdapter } from "./adapter.jsx";
import { registerUIAdapter, getAdaptedComponent, getCapability, pickBest } from "@intent-driven/renderer";

describe("@intent-driven/adapter-apple", () => {
  it("adapter has name 'apple'", () => {
    expect(appleAdapter.name).toBe("apple");
  });
  it("resolves parameter.text after register", () => {
    registerUIAdapter(appleAdapter);
    expect(getAdaptedComponent("parameter", "text")).toBeDefined();
  });
  it("affinity: fieldRole=\"money\" → Number компонент", () => {
    const best = pickBest("parameter", { type: "text", fieldRole: "money", name: "balance" }, appleAdapter);
    expect(best).toBe(appleAdapter.parameter.number);
  });

  it("registers primitive.chipList + capability declared", () => {
    registerUIAdapter(appleAdapter);
    expect(getAdaptedComponent("primitive", "chipList")).toBeDefined();
    const cap = getCapability("primitive", "chipList");
    expect(cap).toBeDefined();
    expect(cap.variants).toContain("tag");
  });
});
