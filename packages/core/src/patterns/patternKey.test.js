import { describe, it, expect } from "vitest";
import {
  patternKey,
  isSameLogicalPattern,
  findPatternByKey,
  parsePatternKey,
  logicalId,
} from "./patternKey.js";

describe("patternKey / §13.1", () => {
  it("stable: ключ = `stable__<id>`", () => {
    expect(patternKey({ id: "hero-create", status: "stable" })).toBe("stable__hero-create");
  });

  it("default status (нет поля) → stable", () => {
    expect(patternKey({ id: "hero-create" })).toBe("stable__hero-create");
  });

  it("candidate с sourceProduct → 3-х частный ключ", () => {
    expect(
      patternKey({ id: "rating-aggregate-hero", status: "candidate", sourceProduct: "avito" }),
    ).toBe("candidate__rating-aggregate-hero__avito");
  });

  it("candidate без sourceProduct → 2-х частный ключ (legacy)", () => {
    expect(patternKey({ id: "rating-aggregate-hero", status: "candidate" })).toBe(
      "candidate__rating-aggregate-hero",
    );
  });

  it("anti — отдельный prefix", () => {
    expect(patternKey({ id: "modal-on-modal", status: "anti" })).toBe("anti__modal-on-modal");
  });

  it("invalid status fallback к stable", () => {
    expect(patternKey({ id: "x", status: "experimental" })).toBe("stable__x");
  });

  it("returns null для невалидного input", () => {
    expect(patternKey(null)).toBeNull();
    expect(patternKey({})).toBeNull();
    expect(patternKey({ status: "stable" })).toBeNull();
  });

  it("стабильные и candidate с одинаковым id — разные ключи (collision resolved)", () => {
    const stable = { id: "rating-aggregate-hero", status: "stable" };
    const candidate = {
      id: "rating-aggregate-hero",
      status: "candidate",
      sourceProduct: "avito",
    };
    expect(patternKey(stable)).not.toBe(patternKey(candidate));
  });
});

describe("logicalId", () => {
  it("читает .id или .patternId", () => {
    expect(logicalId({ id: "x" })).toBe("x");
    expect(logicalId({ patternId: "y" })).toBe("y");
    expect(logicalId({ id: "x", patternId: "y" })).toBe("x");
    expect(logicalId(null)).toBeNull();
  });
});

describe("isSameLogicalPattern", () => {
  it("true для same id", () => {
    expect(
      isSameLogicalPattern(
        { id: "x", status: "stable" },
        { id: "x", status: "candidate", sourceProduct: "avito" },
      ),
    ).toBe(true);
  });

  it("false для разных id", () => {
    expect(isSameLogicalPattern({ id: "x" }, { id: "y" })).toBe(false);
  });

  it("false для null/undefined", () => {
    expect(isSameLogicalPattern(null, { id: "x" })).toBe(false);
    expect(isSameLogicalPattern({ id: "x" }, undefined)).toBe(false);
  });
});

describe("findPatternByKey", () => {
  const patterns = [
    { id: "hero-create", status: "stable" },
    { id: "rating-aggregate-hero", status: "candidate", sourceProduct: "avito" },
    { id: "rating-aggregate-hero", status: "candidate", sourceProduct: "profi" },
  ];

  it("находит по composite-ключу", () => {
    const found = findPatternByKey(patterns, "candidate__rating-aggregate-hero__avito");
    expect(found.sourceProduct).toBe("avito");
  });

  it("отличает avito от profi с одинаковым id", () => {
    expect(findPatternByKey(patterns, "candidate__rating-aggregate-hero__profi").sourceProduct).toBe(
      "profi",
    );
  });

  it("returns null для несуществующего ключа", () => {
    expect(findPatternByKey(patterns, "stable__no-such-thing")).toBeNull();
  });
});

describe("parsePatternKey", () => {
  it("3-х частный ключ", () => {
    expect(parsePatternKey("candidate__rating-aggregate-hero__avito")).toEqual({
      status: "candidate",
      id: "rating-aggregate-hero",
      sourceProduct: "avito",
    });
  });

  it("2-х частный ключ", () => {
    expect(parsePatternKey("stable__hero-create")).toEqual({
      status: "stable",
      id: "hero-create",
      sourceProduct: null,
    });
  });

  it("invalid input returns null", () => {
    expect(parsePatternKey(null)).toBeNull();
    expect(parsePatternKey("")).toBeNull();
    expect(parsePatternKey("foo")).toBeNull();
    expect(parsePatternKey("notavalidstatus__x")).toBeNull();
  });

  it("sourceProduct с двойным __ восстанавливается", () => {
    expect(parsePatternKey("candidate__x__source__with__underscores")).toEqual({
      status: "candidate",
      id: "x",
      sourceProduct: "source__with__underscores",
    });
  });

  it("round-trip: patternKey ↔ parsePatternKey", () => {
    const p = { id: "hero-create", status: "candidate", sourceProduct: "notion" };
    const key = patternKey(p);
    const parsed = parsePatternKey(key);
    expect(parsed.id).toBe(p.id);
    expect(parsed.status).toBe(p.status);
    expect(parsed.sourceProduct).toBe(p.sourceProduct);
  });
});
