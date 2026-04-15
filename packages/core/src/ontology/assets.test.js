import { describe, it, expect } from "vitest";
import { getAssets, validateAsset, ASSET_KINDS } from "./assets.js";

describe("ontology.assets — structured declaration", () => {
  const ontology = {
    assets: [
      { id: "mapbox_tiles", kind: "tiles", url: "https://api.mapbox.com/styles/v1/{...}", purpose: "map-primitive rendering" },
      { id: "twemoji", kind: "emoji", url: "https://twemoji.maxcdn.com/", purpose: "icon resolver fallback" },
      { id: "inter_font", kind: "font", url: "https://fonts.googleapis.com/css?family=Inter", purpose: "UI typography" },
    ]
  };

  describe("getAssets", () => {
    it("возвращает все assets при отсутствии kind-фильтра", () => {
      expect(getAssets(ontology)).toHaveLength(3);
    });

    it("фильтрует по kind", () => {
      expect(getAssets(ontology, "tiles")).toHaveLength(1);
      expect(getAssets(ontology, "emoji")).toHaveLength(1);
      expect(getAssets(ontology, "font")).toHaveLength(1);
    });

    it("kind, которого нет → пустой массив", () => {
      expect(getAssets(ontology, "media")).toEqual([]);
    });

    it("ontology без assets → пустой массив", () => {
      expect(getAssets({})).toEqual([]);
      expect(getAssets({ assets: [] })).toEqual([]);
      expect(getAssets(null)).toEqual([]);
    });
  });

  describe("validateAsset", () => {
    it("валидный asset", () => {
      const r = validateAsset({ id: "x", kind: "tiles", url: "https://example.com/", purpose: "y" });
      expect(r.valid).toBe(true);
    });

    it("missing id → invalid", () => {
      const r = validateAsset({ kind: "tiles", url: "https://example.com/" });
      expect(r.valid).toBe(false);
      expect(r.reason).toContain("id");
    });

    it("missing kind → invalid", () => {
      const r = validateAsset({ id: "x", url: "https://example.com/" });
      expect(r.valid).toBe(false);
      expect(r.reason).toContain("kind");
    });

    it("unknown kind → invalid", () => {
      const r = validateAsset({ id: "x", kind: "unknown_kind", url: "https://example.com/" });
      expect(r.valid).toBe(false);
      expect(r.reason).toContain("kind");
    });

    it("missing url → invalid", () => {
      const r = validateAsset({ id: "x", kind: "tiles" });
      expect(r.valid).toBe(false);
      expect(r.reason).toContain("url");
    });
  });

  describe("ASSET_KINDS constants", () => {
    it("содержит 4 базовых kind'а", () => {
      expect(ASSET_KINDS).toEqual(expect.arrayContaining(["tiles", "emoji", "font", "media"]));
    });
  });
});
