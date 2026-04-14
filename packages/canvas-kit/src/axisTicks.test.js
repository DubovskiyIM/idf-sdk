import { describe, it, expect } from "vitest";
import { axisTicks } from "./axisTicks.js";

describe("axisTicks", () => {
  it("returns 5 ticks for domain [0,100]", () => {
    const ticks = axisTicks([0, 100], 5);
    expect(ticks).toHaveLength(5);
    expect(ticks[0].value).toBe(0);
    expect(ticks[4].value).toBe(100);
  });

  it("tick.position evenly spaces 0..1", () => {
    const ticks = axisTicks([0, 10], 3);
    expect(ticks[0].position).toBeCloseTo(0);
    expect(ticks[1].position).toBeCloseTo(0.5);
    expect(ticks[2].position).toBeCloseTo(1);
  });

  it("tick.label is stringified value by default", () => {
    const ticks = axisTicks([0, 10], 2);
    expect(ticks[0].label).toBe("0");
    expect(ticks[1].label).toBe("10");
  });

  it("custom format function", () => {
    const ticks = axisTicks([0, 100], 2, { format: (v) => `${v}%` });
    expect(ticks[0].label).toBe("0%");
    expect(ticks[1].label).toBe("100%");
  });
});
