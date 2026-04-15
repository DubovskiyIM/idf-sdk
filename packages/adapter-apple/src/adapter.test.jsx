import { describe, it, expect } from "vitest";
import { appleAdapter } from "./adapter.jsx";
import { registerUIAdapter, getAdaptedComponent } from "@intent-driven/renderer";

describe("@intent-driven/adapter-apple", () => {
  it("adapter has name 'apple'", () => {
    expect(appleAdapter.name).toBe("apple");
  });
  it("resolves parameter.text after register", () => {
    registerUIAdapter(appleAdapter);
    expect(getAdaptedComponent("parameter", "text")).toBeDefined();
  });
});
