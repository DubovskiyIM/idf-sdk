import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useZoomPan } from "./useZoomPan.js";

describe("useZoomPan", () => {
  it("initial transform = identity", () => {
    const { result } = renderHook(() => useZoomPan({ min: 0.1, max: 10 }));
    expect(result.current.transform).toEqual({ x: 0, y: 0, scale: 1 });
  });
  it("wheel zooms in (scale increases) clamped to max", () => {
    const { result } = renderHook(() => useZoomPan({ min: 0.1, max: 2 }));
    act(() => result.current.handlers.onWheel({ deltaY: -100, preventDefault: () => {} }));
    expect(result.current.transform.scale).toBeGreaterThan(1);
    expect(result.current.transform.scale).toBeLessThanOrEqual(2);
  });
  it("wheel zooms out clamped to min", () => {
    const { result } = renderHook(() => useZoomPan({ min: 0.5, max: 10 }));
    for (let i = 0; i < 20; i++) {
      act(() => result.current.handlers.onWheel({ deltaY: 100, preventDefault: () => {} }));
    }
    expect(result.current.transform.scale).toBeGreaterThanOrEqual(0.5);
  });
  it("reset() restores identity", () => {
    const { result } = renderHook(() => useZoomPan({ min: 0.1, max: 10 }));
    act(() => result.current.handlers.onWheel({ deltaY: -100, preventDefault: () => {} }));
    act(() => result.current.reset());
    expect(result.current.transform).toEqual({ x: 0, y: 0, scale: 1 });
  });
});
