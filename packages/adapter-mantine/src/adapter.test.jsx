import { describe, it, expect } from "vitest";
import { mantineAdapter } from "./adapter.jsx";
import {
  registerUIAdapter,
  getAdaptedComponent,
  getCapability,
  pickBest,
} from "@intent-driven/renderer";

describe("@intent-driven/adapter-mantine", () => {
  it("adapter has name 'mantine'", () => {
    expect(mantineAdapter.name).toBe("mantine");
  });

  it("registers and resolves parameter.text", () => {
    registerUIAdapter(mantineAdapter);
    expect(getAdaptedComponent("parameter", "text")).toBeDefined();
  });

  it("registers and resolves parameter.datetime", () => {
    registerUIAdapter(mantineAdapter);
    expect(getAdaptedComponent("parameter", "datetime")).toBeDefined();
  });

  it("exposes primitive.chart capability with chartTypes", () => {
    registerUIAdapter(mantineAdapter);
    const cap = getCapability("primitive", "chart");
    expect(cap).toBeDefined();
    expect(cap.chartTypes).toContain("line");
  });

  it("affinity: fieldRole=\"price\" → Number компонент", () => {
    const best = pickBest("parameter", { type: "text", fieldRole: "price", name: "fee" }, mantineAdapter);
    expect(best).toBe(mantineAdapter.parameter.number);
  });

  it("affinity: withTime=true → DateTime компонент", () => {
    const best = pickBest("parameter", { type: "datetime", withTime: true, name: "deadline" }, mantineAdapter);
    expect(best).toBe(mantineAdapter.parameter.datetime);
  });
});
