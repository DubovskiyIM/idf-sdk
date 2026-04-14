function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

export function heatmapColorScale(stops) {
  if (stops.length < 2) throw new Error("heatmapColorScale: need >=2 stops");
  const rgbStops = stops.map((s) => ({ value: s.value, rgb: hexToRgb(s.color) }));
  return (v) => {
    if (v <= rgbStops[0].value) {
      const [r, g, b] = rgbStops[0].rgb;
      return `rgb(${r}, ${g}, ${b})`;
    }
    if (v >= rgbStops[rgbStops.length - 1].value) {
      const [r, g, b] = rgbStops[rgbStops.length - 1].rgb;
      return `rgb(${r}, ${g}, ${b})`;
    }
    for (let i = 0; i < rgbStops.length - 1; i++) {
      const a = rgbStops[i], b = rgbStops[i + 1];
      if (v >= a.value && v <= b.value) {
        const t = (v - a.value) / (b.value - a.value);
        const r = lerp(a.rgb[0], b.rgb[0], t);
        const g = lerp(a.rgb[1], b.rgb[1], t);
        const bb = lerp(a.rgb[2], b.rgb[2], t);
        return `rgb(${r}, ${g}, ${bb})`;
      }
    }
    return `rgb(0, 0, 0)`;
  };
}
