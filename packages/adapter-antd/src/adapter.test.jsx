import { describe, it, expect } from "vitest";
import { antdAdapter } from "./adapter.jsx";
import { registerUIAdapter, getCapability, supportsVariant } from "@idf/renderer";

describe("@idf/adapter-antd", () => {
  it("adapter has name 'antd'", () => {
    expect(antdAdapter.name).toBe("antd");
  });

  it("declares primitive.chart with chartTypes (line/pie/column/area)", () => {
    registerUIAdapter(antdAdapter);
    const cap = getCapability("primitive", "chart");
    expect(cap.chartTypes).toEqual(expect.arrayContaining(["line", "pie", "column", "area"]));
  });

  it("candlestick chartType is NOT supported", () => {
    registerUIAdapter(antdAdapter);
    expect(supportsVariant("primitive", "chart", "chartTypes", "candlestick")).toBe(false);
  });

  it("primitive.statistic is supported", () => {
    registerUIAdapter(antdAdapter);
    expect(getCapability("primitive", "statistic")).not.toBe(false);
  });
});
