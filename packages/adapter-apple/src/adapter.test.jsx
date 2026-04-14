import { describe, it, expect } from "vitest";
import { appleAdapter } from "./adapter.jsx";
import { registerUIAdapter, getAdaptedComponent } from "@idf/renderer";

describe("@idf/adapter-apple", () => {
  it("adapter has name 'apple'", () => {
    expect(appleAdapter.name).toBe("apple");
  });
  it("resolves parameter.text after register", () => {
    registerUIAdapter(appleAdapter);
    expect(getAdaptedComponent("parameter", "text")).toBeDefined();
  });
});
