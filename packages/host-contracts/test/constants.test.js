import { describe, it, expect } from "vitest";
import { HEADER_SLOTS } from "../src/constants.js";

describe("HEADER_SLOTS", () => {
  it("is a frozen list of canonical slot names", () => {
    expect(Array.isArray(HEADER_SLOTS)).toBe(true);
    expect(Object.isFrozen(HEADER_SLOTS)).toBe(true);
    expect(HEADER_SLOTS).toContain("primary");
    expect(HEADER_SLOTS).toContain("user-menu");
  });

  it("has no duplicates", () => {
    expect(new Set(HEADER_SLOTS).size).toBe(HEADER_SLOTS.length);
  });
});
