import { useCallback, useState } from "react";

export function useTooltipPosition() {
  const [state, setState] = useState({ x: 0, y: 0, visible: false });
  const show = useCallback((x, y) => setState({ x, y, visible: true }), []);
  const hide = useCallback(() => setState((s) => ({ ...s, visible: false })), []);
  return { ...state, show, hide };
}
