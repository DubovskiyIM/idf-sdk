import { describe, it, expect, beforeEach } from "vitest";
import {
  registerUIAdapter,
  getAdaptedComponent,
  getCapability,
  supportsVariant,
} from "./registry.js";

describe("UI adapter registry", () => {
  beforeEach(() => registerUIAdapter(null));

  it("returns null when no adapter registered", () => {
    expect(getAdaptedComponent("parameter", "text")).toBeNull();
  });

  it("registers and resolves by kind+type", () => {
    const Comp = () => null;
    registerUIAdapter({ parameter: { text: Comp } });
    expect(getAdaptedComponent("parameter", "text")).toBe(Comp);
  });

  it("returns null for unknown kind/type", () => {
    registerUIAdapter({ parameter: { text: () => null } });
    expect(getAdaptedComponent("parameter", "nonexistent")).toBeNull();
    expect(getAdaptedComponent("unknown", "anything")).toBeNull();
  });

  it("null adapter arg unregisters", () => {
    registerUIAdapter({ parameter: { text: () => null } });
    registerUIAdapter(null);
    expect(getAdaptedComponent("parameter", "text")).toBeNull();
  });
});

describe("capability surface", () => {
  beforeEach(() => registerUIAdapter(null));

  it("getCapability returns null when adapter has no capabilities", () => {
    registerUIAdapter({ parameter: { text: () => null } });
    expect(getCapability("primitive", "chart")).toBeNull();
  });

  it("getCapability returns descriptor object", () => {
    registerUIAdapter({
      capabilities: { primitive: { chart: { chartTypes: ["line", "pie"] } } },
    });
    const cap = getCapability("primitive", "chart");
    expect(cap.chartTypes).toEqual(["line", "pie"]);
  });

  it("getCapability returns false when explicitly disabled", () => {
    registerUIAdapter({ capabilities: { primitive: { statistic: false } } });
    expect(getCapability("primitive", "statistic")).toBe(false);
  });

  it("supportsVariant: unknown capability → true (backcompat)", () => {
    registerUIAdapter({ parameter: { text: () => null } });
    expect(supportsVariant("primitive", "chart", "chartTypes", "candlestick")).toBe(true);
  });

  it("supportsVariant: variant in list → true", () => {
    registerUIAdapter({
      capabilities: { primitive: { chart: { chartTypes: ["line"] } } },
    });
    expect(supportsVariant("primitive", "chart", "chartTypes", "line")).toBe(true);
  });

  it("supportsVariant: variant NOT in list → false", () => {
    registerUIAdapter({
      capabilities: { primitive: { chart: { chartTypes: ["line"] } } },
    });
    expect(supportsVariant("primitive", "chart", "chartTypes", "candlestick")).toBe(false);
  });

  it("supportsVariant: capability=false → false", () => {
    registerUIAdapter({ capabilities: { primitive: { statistic: false } } });
    expect(supportsVariant("primitive", "statistic", "x", "y")).toBe(false);
  });
});
