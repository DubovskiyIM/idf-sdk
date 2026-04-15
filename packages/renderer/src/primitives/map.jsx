/**
 * Map-primitive — пространственная primitive-категория по образцу chart.
 *
 * Spec (из проекции):
 *   {
 *     type: "map",
 *     center: { lat, lng } | undefined (auto из bounds),
 *     zoom: number | undefined,
 *     layers: [
 *       { kind: "marker",  items: [{lat, lng, ...}], iconField, statusField, onClick },
 *       { kind: "route",   points: [{lat, lng}...], style, animated },
 *       { kind: "polygon", coords: [{lat, lng}...], style },
 *       { kind: "heatmap", points: [{lat, lng, weight}...], weightField }
 *     ],
 *     interactive: boolean
 *   }
 *
 * Адаптер: getAdaptedComponent("primitive", "map") (см. Task 2).
 * Fallback: inline SVG с проекцией в bounds всех точек.
 *
 * Tile-provider — asset boundary, не effect boundary §19: fallback не рисует
 * базовую подложку, только структурные элементы (маркеры/маршруты/зоны).
 * Native реализации (Mapbox GL, @ant-design/maps) — Plan 6 (адаптеры).
 */

/**
 * Вычислить bounding box по всем layers. Возвращает null если нет данных.
 */
export function calcBounds(layers) {
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  let hasData = false;

  for (const layer of layers || []) {
    const points = extractPoints(layer);
    for (const p of points) {
      if (typeof p.lat !== "number" || typeof p.lng !== "number") continue;
      hasData = true;
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }
  }

  if (!hasData) return null;
  return { minLat, maxLat, minLng, maxLng };
}

function extractPoints(layer) {
  if (!layer || typeof layer !== "object") return [];
  switch (layer.kind) {
    case "marker": return layer.items || [];
    case "heatmap": return layer.points || [];
    case "route": return layer.points || [];
    case "polygon": return layer.coords || [];
    default: return [];
  }
}

/**
 * Спроецировать географическую точку в SVG-координаты viewport'а.
 * Инвертирует ось Y (SVG origin top-left, карта — bottom-left).
 */
export function projectPoint(point, bounds, viewport) {
  const { minLat, maxLat, minLng, maxLng } = bounds;
  const { width, height } = viewport;

  const rangeLat = maxLat - minLat;
  const rangeLng = maxLng - minLng;

  const xFrac = rangeLng === 0 ? 0.5 : (point.lng - minLng) / rangeLng;
  const yFrac = rangeLat === 0 ? 0.5 : (point.lat - minLat) / rangeLat;

  return {
    x: xFrac * width,
    y: height - yFrac * height, // Y-flip
  };
}

/**
 * Привести layer к нормальной форме — гарантирует, что массивы данных
 * существуют (чтобы downstream-код не проверял на null повсюду).
 */
export function normalizeLayer(layer) {
  if (!layer || typeof layer !== "object") return { kind: "unknown", items: [] };
  const out = { ...layer };
  if (layer.kind === "marker" || layer.kind === "heatmap") {
    out.items = Array.isArray(layer.items) ? layer.items : [];
    if (layer.kind === "heatmap") out.points = Array.isArray(layer.points) ? layer.points : [];
  } else if (layer.kind === "route") {
    out.points = Array.isArray(layer.points) ? layer.points : [];
  } else if (layer.kind === "polygon") {
    out.coords = Array.isArray(layer.coords) ? layer.coords : [];
  } else {
    out.items = Array.isArray(layer.items) ? layer.items : [];
  }
  return out;
}
