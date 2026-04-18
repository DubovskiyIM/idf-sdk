import { describe, it, expect } from "vitest";
import { computeSalience, bySalienceDesc, detectTiedGroups } from "./salience.js";

describe("computeSalience — explicit override", () => {
  it("число как salience возвращается напрямую", () => {
    expect(computeSalience({ salience: 777 }, "X").value).toBe(777);
    expect(computeSalience({ salience: 777 }, "X").source).toBe("explicit");
  });

  it("строка-label разворачивается в ordinal value", () => {
    expect(computeSalience({ salience: "primary" }, "X").value).toBe(100);
    expect(computeSalience({ salience: "secondary" }, "X").value).toBe(50);
    expect(computeSalience({ salience: "utility" }, "X").value).toBe(5);
  });

  it("неизвестная строка-label игнорируется, падает в computed", () => {
    const r = computeSalience({ salience: "bogus", particles: { effects: [] } }, "X");
    expect(r.source).toBe("computed");
  });
});

describe("computeSalience — computed defaults", () => {
  it("creator main entity → 80", () => {
    const r = computeSalience({ creates: "Listing" }, "Listing");
    expect(r.value).toBe(80);
    expect(r.reason).toBe("creator-of-main");
  });

  it("phase-transition (replace .status на main) → 70", () => {
    const intent = { particles: { effects: [{ α: "replace", target: "listing.status" }] } };
    const r = computeSalience(intent, "Listing");
    expect(r.value).toBe(70);
    expect(r.reason).toBe("phase-transition");
  });

  it("edit main entity (replace не статус) → 60", () => {
    const intent = { particles: { effects: [{ α: "replace", target: "listing.title" }] } };
    const r = computeSalience(intent, "Listing");
    expect(r.value).toBe(60);
    expect(r.reason).toBe("edit-main");
  });

  it("remove main entity → 30 (ниже edit)", () => {
    const intent = { particles: { effects: [{ α: "remove", target: "listing" }] } };
    const r = computeSalience(intent, "Listing");
    expect(r.value).toBe(30);
    expect(r.reason).toBe("destructive-main");
  });

  it("read-only (effects.length === 0) → 10", () => {
    const intent = { particles: { effects: [] } };
    expect(computeSalience(intent, "Listing").value).toBe(10);
  });

  it("effect не на main entity → 40 (default)", () => {
    const intent = { particles: { effects: [{ α: "replace", target: "bid.amount" }] } };
    const r = computeSalience(intent, "Listing");
    expect(r.value).toBe(40);
    expect(r.reason).toBe("default");
  });
});

describe("bySalienceDesc — comparator", () => {
  it("сортирует по salience desc", () => {
    const items = [
      { intentId: "a", salience: 10 },
      { intentId: "b", salience: 100 },
      { intentId: "c", salience: 50 },
    ].sort(bySalienceDesc);
    expect(items.map(i => i.intentId)).toEqual(["b", "c", "a"]);
  });

  it("при tied salience — стабильно алфавитно по intentId", () => {
    const items = [
      { intentId: "zzz", salience: 60 },
      { intentId: "aaa", salience: 60 },
      { intentId: "mmm", salience: 60 },
    ].sort(bySalienceDesc);
    expect(items.map(i => i.intentId)).toEqual(["aaa", "mmm", "zzz"]);
  });

  it("отсутствие salience трактуется как default 40", () => {
    const items = [
      { intentId: "low", salience: 20 },
      { intentId: "unset" }, // treated as 40
      { intentId: "high", salience: 70 },
    ].sort(bySalienceDesc);
    expect(items.map(i => i.intentId)).toEqual(["high", "unset", "low"]);
  });
});

describe("detectTiedGroups — witness alphabetical-fallback", () => {
  const ctx = { slot: "toolbar", projection: "listing_detail" };

  it("нет tied групп → witness-ов нет", () => {
    const items = [
      { intentId: "a", salience: 100 },
      { intentId: "b", salience: 70 },
      { intentId: "c", salience: 40 },
    ];
    expect(detectTiedGroups(items, ctx)).toEqual([]);
  });

  it("одна tied пара → один witness", () => {
    const items = [
      { intentId: "apply_template", salience: 60 },
      { intentId: "edit_listing", salience: 60 },
      { intentId: "delete_listing", salience: 30 },
    ];
    const ws = detectTiedGroups(items, ctx);
    expect(ws).toHaveLength(1);
    expect(ws[0]).toMatchObject({
      basis: "alphabetical-fallback",
      reliability: "heuristic",
      slot: "toolbar",
      projection: "listing_detail",
      salience: 60,
      chosen: "apply_template",
      peers: ["edit_listing"],
    });
    expect(ws[0].recommendation).toContain("apply_template");
    expect(ws[0].recommendation).toContain("edit_listing");
  });

  it("несколько групп — отдельный witness на каждую", () => {
    const items = [
      { intentId: "a", salience: 100 },
      { intentId: "b", salience: 100 },
      { intentId: "c", salience: 60 },
      { intentId: "d", salience: 60 },
      { intentId: "e", salience: 60 },
      { intentId: "f", salience: 30 },
    ];
    const ws = detectTiedGroups(items, ctx);
    expect(ws).toHaveLength(2);
    expect(ws[0].salience).toBe(100);
    expect(ws[0].peers).toEqual(["b"]);
    expect(ws[1].salience).toBe(60);
    expect(ws[1].peers).toEqual(["d", "e"]);
  });

  it("элементы без intentId (overflow/divider) игнорируются", () => {
    const items = [
      { intentId: "a", salience: 60 },
      { intentId: "b", salience: 60 },
      { type: "overflow" },
      { type: "divider" },
    ];
    const ws = detectTiedGroups(items, ctx);
    expect(ws).toHaveLength(1);
    expect(ws[0].peers).toEqual(["b"]);
  });

  it("singleton группа (только один элемент с данным salience) → witness не создаётся", () => {
    const items = [
      { intentId: "solo", salience: 70 },
      { intentId: "x", salience: 40 },
      { intentId: "y", salience: 40 },
    ];
    const ws = detectTiedGroups(items, ctx);
    expect(ws).toHaveLength(1);
    expect(ws[0].salience).toBe(40);
  });
});
