import { describe, it, expect } from "vitest";
import { VERSION } from "./index.js";

describe("engine package", () => {
  it("exposes version", () => {
    expect(VERSION).toBe("0.1.0");
  });
});
