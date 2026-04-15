import { describe, it, expect } from "vitest";
import { calcBounds, projectPoint, normalizeLayer } from "./map.jsx";

describe("calcBounds", () => {
  it("empty layers → null", () => {
    expect(calcBounds([])).toBeNull();
  });

  it("marker layer — bounds = min/max по lat/lng", () => {
    const bounds = calcBounds([{
      kind: "marker",
      items: [{ lat: 55.7, lng: 37.6 }, { lat: 55.8, lng: 37.7 }],
    }]);
    expect(bounds.minLat).toBe(55.7);
    expect(bounds.maxLat).toBe(55.8);
    expect(bounds.minLng).toBe(37.6);
    expect(bounds.maxLng).toBe(37.7);
  });

  it("route layer — bounds покрывают все points", () => {
    const bounds = calcBounds([{
      kind: "route",
      points: [{ lat: 0, lng: 0 }, { lat: 10, lng: 20 }, { lat: -5, lng: 15 }],
    }]);
    expect(bounds.minLat).toBe(-5);
    expect(bounds.maxLat).toBe(10);
    expect(bounds.minLng).toBe(0);
    expect(bounds.maxLng).toBe(20);
  });

  it("polygon layer — bounds по coords", () => {
    const bounds = calcBounds([{
      kind: "polygon",
      coords: [{ lat: 55, lng: 37 }, { lat: 56, lng: 38 }, { lat: 54, lng: 39 }],
    }]);
    expect(bounds.minLat).toBe(54);
    expect(bounds.maxLat).toBe(56);
    expect(bounds.minLng).toBe(37);
    expect(bounds.maxLng).toBe(39);
  });

  it("mixed layers — union bounds", () => {
    const bounds = calcBounds([
      { kind: "marker", items: [{ lat: 10, lng: 20 }] },
      { kind: "polygon", coords: [{ lat: 50, lng: 5 }, { lat: 40, lng: 30 }] },
    ]);
    expect(bounds.minLat).toBe(10);
    expect(bounds.maxLat).toBe(50);
    expect(bounds.minLng).toBe(5);
    expect(bounds.maxLng).toBe(30);
  });

  it("ignores layers without data", () => {
    const bounds = calcBounds([
      { kind: "marker", items: [] },
      { kind: "marker", items: [{ lat: 1, lng: 2 }] },
    ]);
    expect(bounds.minLat).toBe(1);
  });
});

describe("projectPoint", () => {
  const bounds = { minLat: 0, maxLat: 10, minLng: 0, maxLng: 20 };
  const viewport = { width: 100, height: 100 };

  it("min corner → (0,100) — SVG y flipped для lat", () => {
    const p = projectPoint({ lat: 0, lng: 0 }, bounds, viewport);
    expect(p.x).toBe(0);
    expect(p.y).toBe(100);
  });

  it("max corner → (100,0)", () => {
    const p = projectPoint({ lat: 10, lng: 20 }, bounds, viewport);
    expect(p.x).toBe(100);
    expect(p.y).toBe(0);
  });

  it("centre → (50,50)", () => {
    const p = projectPoint({ lat: 5, lng: 10 }, bounds, viewport);
    expect(p.x).toBe(50);
    expect(p.y).toBe(50);
  });

  it("zero-range bounds → centre fallback", () => {
    const degenerate = { minLat: 5, maxLat: 5, minLng: 10, maxLng: 10 };
    const p = projectPoint({ lat: 5, lng: 10 }, degenerate, viewport);
    expect(p.x).toBe(50);
    expect(p.y).toBe(50);
  });
});

describe("normalizeLayer", () => {
  it("marker — items обязателен массив", () => {
    expect(normalizeLayer({ kind: "marker", items: null }).items).toEqual([]);
    expect(normalizeLayer({ kind: "marker" }).items).toEqual([]);
    expect(normalizeLayer({ kind: "marker", items: [{ lat: 1, lng: 2 }] }).items).toHaveLength(1);
  });

  it("route — points обязателен массив", () => {
    expect(normalizeLayer({ kind: "route" }).points).toEqual([]);
    expect(normalizeLayer({ kind: "route", points: [{ lat: 0, lng: 0 }] }).points).toHaveLength(1);
  });

  it("polygon — coords обязателен массив", () => {
    expect(normalizeLayer({ kind: "polygon" }).coords).toEqual([]);
  });

  it("неизвестный kind — возвращает as-is с items=[]", () => {
    const r = normalizeLayer({ kind: "unknown", foo: "bar" });
    expect(r.kind).toBe("unknown");
    expect(r.items).toEqual([]);
  });
});
