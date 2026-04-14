import { describe, it, expect } from "vitest";
import { mantineAdapter } from "./adapter.jsx";
import {
  registerUIAdapter,
  getAdaptedComponent,
  getCapability,
} from "@idf/renderer";

describe("@idf/adapter-mantine", () => {
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
});
