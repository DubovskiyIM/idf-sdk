import { describe, it, expect } from "vitest";
import { heatmapColorScale } from "./heatmapColorScale.js";

describe("heatmapColorScale", () => {
  it("returns exact color at stop value", () => {
    const scale = heatmapColorScale([
      { value: 0, color: "#ff0000" },
      { value: 1, color: "#00ff00" },
    ]);
    expect(scale(0)).toBe("rgb(255, 0, 0)");
    expect(scale(1)).toBe("rgb(0, 255, 0)");
  });
  it("interpolates between two stops", () => {
    const scale = heatmapColorScale([
      { value: 0, color: "#000000" },
      { value: 10, color: "#ffffff" },
    ]);
    expect(scale(5)).toBe("rgb(128, 128, 128)");
  });
  it("clamps below first stop", () => {
    const scale = heatmapColorScale([
      { value: 0, color: "#ff0000" },
      { value: 1, color: "#00ff00" },
    ]);
    expect(scale(-1)).toBe("rgb(255, 0, 0)");
  });
  it("clamps above last stop", () => {
    const scale = heatmapColorScale([
      { value: 0, color: "#ff0000" },
      { value: 1, color: "#00ff00" },
    ]);
    expect(scale(2)).toBe("rgb(0, 255, 0)");
  });
});
