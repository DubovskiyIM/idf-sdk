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

import { getAdaptedComponent } from "../adapters/registry.js";
import { resolve } from "../eval.js";

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

/**
 * Пытается разрешить layer.source (`"world.couriers"`) в массив объектов.
 * Если source — массив или строка-путь в ctx.world — нормализуем.
 */
function coerceLayerItems(layer, ctx) {
  if (!layer) return layer;
  const source = layer.source;
  if (!source) return layer;

  let items = null;
  if (Array.isArray(source)) items = source;
  else if (typeof source === "string" && ctx?.world) {
    const resolved = resolve(ctx.world, source);
    if (Array.isArray(resolved)) items = resolved;
  }
  if (items == null) return layer;

  // В зависимости от kind — в правильное поле
  if (layer.kind === "marker" || layer.kind === "heatmap") {
    return { ...layer, items };
  }
  if (layer.kind === "route") {
    return { ...layer, points: items };
  }
  if (layer.kind === "polygon") {
    return { ...layer, coords: items };
  }
  return { ...layer, items };
}

const LAYER_COLORS = {
  marker: "#6366f1",
  route: "#10b981",
  polygon: "rgba(99, 102, 241, 0.15)",
  polygonStroke: "#6366f1",
  heatmap: "#ef4444",
};

/**
 * SVG-fallback: рисует все layers в единой viewport'е, рассчитанной
 * по bounds всех точек.
 *
 * Visual:
 *   - marker → кружок радиусом 5 с fill по iconField/statusField
 *   - route  → polyline поверх маршрута, толщина 2
 *   - polygon → fill полупрозрачный + stroke
 *   - heatmap → кружки с переменной прозрачностью по weight
 *
 * Для production нужен tile-layer — это делает native-адаптер (Plan 6).
 */
function SvgMapFallback({ layers, height = 400, width = "100%" }) {
  const bounds = calcBounds(layers);

  if (!bounds) {
    return (
      <div style={{
        height, width, display: "flex", alignItems: "center",
        justifyContent: "center", color: "#9ca3af", fontSize: 12,
        border: "1px solid var(--mantine-color-gray-3, #e5e7eb)",
        borderRadius: 8, background: "var(--mantine-color-gray-0, #f9fafb)"
      }}>
        Нет географических данных
      </div>
    );
  }

  const viewW = 800, viewH = 480;
  const pad = 20;
  const viewport = { width: viewW - 2 * pad, height: viewH - 2 * pad };

  // Небольшое расширение bounds, чтобы маркеры не прилипали к краю
  const latPad = (bounds.maxLat - bounds.minLat) * 0.05 || 0.001;
  const lngPad = (bounds.maxLng - bounds.minLng) * 0.05 || 0.001;
  const padded = {
    minLat: bounds.minLat - latPad, maxLat: bounds.maxLat + latPad,
    minLng: bounds.minLng - lngPad, maxLng: bounds.maxLng + lngPad,
  };

  const project = (pt) => {
    const p = projectPoint(pt, padded, viewport);
    return { x: p.x + pad, y: p.y + pad };
  };

  return (
    <svg viewBox={`0 0 ${viewW} ${viewH}`} width={width} height={height}
         preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      <rect x={0} y={0} width={viewW} height={viewH}
            fill="var(--mantine-color-gray-0, #f9fafb)"
            stroke="var(--mantine-color-gray-3, #e5e7eb)" strokeWidth="1" />
      {(layers || []).map((raw, i) => {
        const layer = normalizeLayer(raw);
        switch (layer.kind) {
          case "polygon": {
            if (layer.coords.length < 3) return null;
            const path = "M " + layer.coords.map(c => {
              const p = project(c);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            }).join(" L ") + " Z";
            return (
              <path key={i} d={path}
                    fill={LAYER_COLORS.polygon}
                    stroke={LAYER_COLORS.polygonStroke}
                    strokeWidth="1.5" />
            );
          }
          case "route": {
            if (layer.points.length < 2) return null;
            const path = "M " + layer.points.map(pt => {
              const p = project(pt);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            }).join(" L ");
            return (
              <path key={i} d={path}
                    fill="none" stroke={LAYER_COLORS.route} strokeWidth="3"
                    strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray={layer.animated ? "6,4" : "none"} />
            );
          }
          case "heatmap": {
            return (
              <g key={i}>
                {(layer.points || layer.items || []).map((pt, j) => {
                  const p = project(pt);
                  const w = Number(pt.weight) || Number(pt[layer.weightField]) || 0.5;
                  return (
                    <circle key={j} cx={p.x} cy={p.y} r={8 + w * 10}
                            fill={LAYER_COLORS.heatmap} fillOpacity={0.15 + w * 0.3} />
                  );
                })}
              </g>
            );
          }
          case "marker":
          default: {
            return (
              <g key={i}>
                {layer.items.map((it, j) => {
                  const p = project(it);
                  return (
                    <g key={j}>
                      <circle cx={p.x} cy={p.y} r={5}
                              fill={LAYER_COLORS.marker}
                              stroke="#fff" strokeWidth="2" />
                      {it.label && (
                        <text x={p.x + 8} y={p.y + 4} fontSize="11"
                              fill="var(--mantine-color-gray-7, #374151)">
                          {it.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          }
        }
      })}
    </svg>
  );
}

export function Map({ node, ctx }) {
  const rawLayers = node?.layers || [];
  const layers = rawLayers.map(l => coerceLayerItems(l, ctx));

  const AdaptedMap = getAdaptedComponent("primitive", "map");
  if (AdaptedMap) {
    return <AdaptedMap
      center={node.center}
      zoom={node.zoom}
      layers={layers}
      interactive={node.interactive !== false}
      height={node.height || 400}
    />;
  }

  return <SvgMapFallback layers={layers} height={node.height || 400} />;
}
