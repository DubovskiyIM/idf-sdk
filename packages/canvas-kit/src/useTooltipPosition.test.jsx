import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTooltipPosition } from "./useTooltipPosition.js";

describe("useTooltipPosition", () => {
  it("initial state is hidden", () => {
    const { result } = renderHook(() => useTooltipPosition());
    expect(result.current.visible).toBe(false);
  });
  it("show() makes it visible at coords", () => {
    const { result } = renderHook(() => useTooltipPosition());
    act(() => result.current.show(100, 200));
    expect(result.current.visible).toBe(true);
    expect(result.current.x).toBe(100);
    expect(result.current.y).toBe(200);
  });
  it("hide() clears visibility", () => {
    const { result } = renderHook(() => useTooltipPosition());
    act(() => result.current.show(10, 20));
    act(() => result.current.hide());
    expect(result.current.visible).toBe(false);
  });
});
