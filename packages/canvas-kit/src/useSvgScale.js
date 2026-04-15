/**
 * Создаёт линейную шкалу domain → range.
 * Для SVG-координат range часто инвертирован (y-axis).
 */
export function makeSvgScale([d0, d1], [r0, r1], { clamp = false } = {}) {
  const dSpan = d1 - d0;
  const rSpan = r1 - r0;
  return (v) => {
    let t = (v - d0) / dSpan;
    if (clamp) t = Math.max(0, Math.min(1, t));
    return r0 + t * rSpan;
  };
}
