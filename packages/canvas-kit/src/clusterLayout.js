export function clusterLayout(points, { minDistance, bounds, iterations = 10 }) {
  const out = points.map(([x, y]) => [x, y]);
  const md2 = minDistance * minDistance;

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const dx = out[j][0] - out[i][0];
        const dy = out[j][1] - out[i][1];
        const d2 = dx * dx + dy * dy;
        if (d2 < md2 && d2 > 0) {
          const d = Math.sqrt(d2);
          const push = (minDistance - d) / 2;
          const ux = dx / d, uy = dy / d;
          out[i][0] -= ux * push;
          out[i][1] -= uy * push;
          out[j][0] += ux * push;
          out[j][1] += uy * push;
        } else if (d2 === 0) {
          out[i][0] -= minDistance / 2;
          out[j][0] += minDistance / 2;
        }
      }
    }
    for (const p of out) {
      p[0] = Math.max(0, Math.min(bounds.width, p[0]));
      p[1] = Math.max(0, Math.min(bounds.height, p[1]));
    }
  }
  return out;
}
