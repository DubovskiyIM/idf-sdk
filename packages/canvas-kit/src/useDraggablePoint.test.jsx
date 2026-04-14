import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDraggablePoint } from "./useDraggablePoint.js";

describe("useDraggablePoint", () => {
  it("initial isDragging=false", () => {
    const { result } = renderHook(() => useDraggablePoint({ onDrag: () => {} }));
    expect(result.current.isDragging).toBe(false);
  });
  it("onPointerDown sets isDragging=true", () => {
    const { result } = renderHook(() => useDraggablePoint({ onDrag: () => {} }));
    act(() => result.current.handlers.onPointerDown({
      clientX: 10, clientY: 20, currentTarget: { setPointerCapture: () => {} }, pointerId: 1,
    }));
    expect(result.current.isDragging).toBe(true);
  });
  it("onPointerMove calls onDrag with new coords while dragging", () => {
    const onDrag = vi.fn();
    const { result } = renderHook(() => useDraggablePoint({ onDrag }));
    act(() => {
      result.current.handlers.onPointerDown({
        clientX: 10, clientY: 20, currentTarget: { setPointerCapture: () => {} }, pointerId: 1,
      });
      result.current.handlers.onPointerMove({ clientX: 50, clientY: 60 });
    });
    expect(onDrag).toHaveBeenCalledWith({ x: 50, y: 60, dx: 40, dy: 40 });
  });
  it("onPointerUp clears isDragging", () => {
    const { result } = renderHook(() => useDraggablePoint({ onDrag: () => {} }));
    act(() => result.current.handlers.onPointerDown({
      clientX: 0, clientY: 0, currentTarget: { setPointerCapture: () => {} }, pointerId: 1,
    }));
    act(() => result.current.handlers.onPointerUp({
      pointerId: 1, currentTarget: { releasePointerCapture: () => {} },
    }));
    expect(result.current.isDragging).toBe(false);
  });
  it("constrain clamps dragged coords", () => {
    const onDrag = vi.fn();
    const constrain = ({ x, y }) => ({ x: Math.max(0, x), y: Math.max(0, y) });
    const { result } = renderHook(() => useDraggablePoint({ onDrag, constrain }));
    act(() => {
      result.current.handlers.onPointerDown({
        clientX: 10, clientY: 10, currentTarget: { setPointerCapture: () => {} }, pointerId: 1,
      });
      result.current.handlers.onPointerMove({ clientX: -5, clientY: -5 });
    });
    expect(onDrag).toHaveBeenCalledWith({ x: 0, y: 0, dx: -15, dy: -15 });
  });
});
