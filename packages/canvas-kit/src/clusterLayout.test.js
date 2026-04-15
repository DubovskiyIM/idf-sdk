import { describe, it, expect } from "vitest";
import { clusterLayout } from "./clusterLayout.js";

describe("clusterLayout", () => {
  it("returns same length as input", () => {
    const pts = [[0, 0], [1, 1], [2, 2]];
    const out = clusterLayout(pts, { minDistance: 0.5, bounds: { width: 100, height: 100 } });
    expect(out).toHaveLength(3);
  });
  it("spreads overlapping points apart (min distance)", () => {
    const pts = [[50, 50], [50, 50], [50, 50]];
    const out = clusterLayout(pts, { minDistance: 10, bounds: { width: 100, height: 100 } });
    const dx = out[0][0] - out[1][0];
    const dy = out[0][1] - out[1][1];
    const dist = Math.hypot(dx, dy);
    expect(dist).toBeGreaterThan(0);
  });
  it("keeps points within bounds", () => {
    const pts = [[0, 0], [100, 100]];
    const out = clusterLayout(pts, { minDistance: 5, bounds: { width: 100, height: 100 } });
    for (const [x, y] of out) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    }
  });
});
