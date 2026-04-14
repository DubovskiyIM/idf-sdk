import { describe, it, expect } from "vitest";
import { pointsToPath } from "./pointsToPath.js";

describe("pointsToPath", () => {
  it("empty array → empty string", () => {
    expect(pointsToPath([])).toBe("");
  });
  it("single point → M x y", () => {
    expect(pointsToPath([[10, 20]])).toBe("M 10 20");
  });
  it("two points → straight line", () => {
    expect(pointsToPath([[0, 0], [100, 50]])).toBe("M 0 0 L 100 50");
  });
  it("closed=true appends Z", () => {
    expect(pointsToPath([[0, 0], [10, 0], [10, 10]], { closed: true })).toBe("M 0 0 L 10 0 L 10 10 Z");
  });
  it("smooth=true emits cubic Bezier segments", () => {
    const path = pointsToPath([[0, 0], [10, 10], [20, 0]], { smooth: true });
    expect(path.startsWith("M 0 0")).toBe(true);
    expect(path).toMatch(/C /);
  });
});
