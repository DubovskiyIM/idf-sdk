import { useCallback, useState } from "react";

export function useZoomPan({ min, max }) {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

  const onWheel = useCallback((e) => {
    e.preventDefault?.();
    setTransform((t) => {
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const scale = Math.max(min, Math.min(max, t.scale * factor));
      return { ...t, scale };
    });
  }, [min, max]);

  const reset = useCallback(() => setTransform({ x: 0, y: 0, scale: 1 }), []);

  return { transform, handlers: { onWheel }, reset };
}
