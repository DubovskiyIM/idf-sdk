import { describe, it, expect } from "vitest";
import { makeSvgScale } from "./useSvgScale.js";

describe("makeSvgScale", () => {
  it("maps domain [0,1] → range [0,100]", () => {
    const scale = makeSvgScale([0, 1], [0, 100]);
    expect(scale(0)).toBe(0);
    expect(scale(0.5)).toBe(50);
    expect(scale(1)).toBe(100);
  });

  it("supports inverted range (SVG y-axis)", () => {
    const scale = makeSvgScale([0, 10], [100, 0]);
    expect(scale(0)).toBe(100);
    expect(scale(10)).toBe(0);
  });

  it("clamps values outside domain when clamp=true", () => {
    const scale = makeSvgScale([0, 1], [0, 100], { clamp: true });
    expect(scale(-0.5)).toBe(0);
    expect(scale(2)).toBe(100);
  });

  it("does not clamp by default", () => {
    const scale = makeSvgScale([0, 1], [0, 100]);
    expect(scale(2)).toBe(200);
  });
});
