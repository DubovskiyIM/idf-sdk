import { useCallback, useRef, useState } from "react";

export function useDraggablePoint({ onDrag, constrain }) {
  const [isDragging, setDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e) => {
    startRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = true;
    setDragging(true);
    e.currentTarget?.setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    let x = e.clientX, y = e.clientY;
    if (constrain) ({ x, y } = constrain({ x, y }));
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    onDrag({ x, y, dx, dy });
  }, [onDrag, constrain]);

  const onPointerUp = useCallback((e) => {
    isDraggingRef.current = false;
    setDragging(false);
    e.currentTarget?.releasePointerCapture?.(e.pointerId);
  }, []);

  return { isDragging, handlers: { onPointerDown, onPointerMove, onPointerUp } };
}
