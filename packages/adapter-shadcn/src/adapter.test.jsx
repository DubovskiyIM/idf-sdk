import { describe, it, expect } from "vitest";
import { shadcnAdapter } from "./adapter.jsx";
import { registerUIAdapter, getAdaptedComponent, pickBest } from "@intent-driven/renderer";

describe("@intent-driven/adapter-shadcn", () => {
  it("adapter has name 'shadcn'", () => {
    expect(shadcnAdapter.name).toBe("shadcn");
  });
  it("resolves parameter.text after register", () => {
    registerUIAdapter(shadcnAdapter);
    expect(getAdaptedComponent("parameter", "text")).toBeDefined();
  });
  it("affinity: fieldRole=\"price\" → Number компонент", () => {
    const best = pickBest("parameter", { type: "text", fieldRole: "price", name: "fee" }, shadcnAdapter);
    expect(best).toBe(shadcnAdapter.parameter.number);
  });
});
