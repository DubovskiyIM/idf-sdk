import { describe, it, expect } from "vitest";
import { scoreCandidate, rankCandidates, pickBest, AFFINITY_WEIGHTS } from "./matching.js";

function makeAdapter(category) {
  return { name: "test", parameter: category };
}

function Comp(label) {
  const fn = () => label;
  return fn;
}

describe("scoreCandidate", () => {
  it("exact type match даёт exactType вес", () => {
    const score = scoreCandidate({ type: "text" }, Comp("text"), "text");
    expect(score).toBe(AFFINITY_WEIGHTS.exactType);
  });

  it("нет совпадений → score=0", () => {
    expect(scoreCandidate({ type: "number" }, Comp("text"), "text")).toBe(0);
  });

  it("affinity.roles: fieldRole совпадает → +roleMatch", () => {
    const withAff = Comp("money-input");
    withAff.affinity = { roles: ["money", "price"] };
    const score = scoreCandidate(
      { type: "number", fieldRole: "price" },
      withAff,
      "number"
    );
    expect(score).toBe(AFFINITY_WEIGHTS.exactType + AFFINITY_WEIGHTS.roleMatch);
  });

  it("affinity.fields: specName в list → +fieldMatch", () => {
    const phone = Comp("phone");
    phone.affinity = { fields: ["phoneNumber", "mobile"] };
    const score = scoreCandidate(
      { type: "text", name: "phoneNumber" },
      phone,
      "tel"
    );
    expect(score).toBe(AFFINITY_WEIGHTS.fieldMatch);
  });

  it("affinity.features: spec.withTime=true → +featureMatch", () => {
    const dtFull = Comp("datetime-withtime");
    dtFull.affinity = { features: ["withTime"] };
    const score = scoreCandidate(
      { type: "datetime", withTime: true },
      dtFull,
      "datetime"
    );
    expect(score).toBe(AFFINITY_WEIGHTS.exactType + AFFINITY_WEIGHTS.featureMatch);
  });

  it("wrapper-форма {component, affinity}", () => {
    const withAff = {
      component: Comp("coord"),
      affinity: { roles: ["coordinate"] },
    };
    const score = scoreCandidate(
      { type: "text", fieldRole: "coordinate" },
      withAff,
      "map"
    );
    expect(score).toBe(AFFINITY_WEIGHTS.roleMatch);
  });
});

describe("rankCandidates", () => {
  it("сортирует по убыванию score", () => {
    const text = Comp("text");
    const money = Comp("money");
    money.affinity = { roles: ["money"] };
    const adapter = makeAdapter({ text, number: money });

    const ranked = rankCandidates(
      "parameter",
      { type: "number", fieldRole: "money" },
      adapter
    );
    expect(ranked[0].type).toBe("number");
    expect(ranked[0].score).toBeGreaterThan(ranked[1]?.score || 0);
  });

  it("при отсутствии ранжированных кандидатов fallback на exact type (back-compat)", () => {
    const text = Comp("text");
    const adapter = makeAdapter({ text });
    const ranked = rankCandidates("parameter", { type: "text" }, adapter);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].type).toBe("text");
  });

  it("категория пустая → []", () => {
    expect(rankCandidates("parameter", { type: "x" }, { parameter: {} })).toEqual([]);
  });
});

describe("pickBest", () => {
  it("возвращает компонент с макс. score", () => {
    const text = Comp("text");
    const money = Comp("money");
    money.affinity = { roles: ["money", "price"] };
    const adapter = makeAdapter({ text, number: money });

    const best = pickBest(
      "parameter",
      { type: "text", fieldRole: "price" },
      adapter
    );
    // money имеет roleMatch=20, text имеет exactType=10 → money побеждает
    expect(best).toBe(money);
  });

  it("без аффинити: обычный text lookup работает как раньше", () => {
    const text = Comp("text");
    const adapter = makeAdapter({ text });
    expect(pickBest("parameter", { type: "text" }, adapter)).toBe(text);
  });

  it("нет подходящего компонента → null", () => {
    expect(pickBest("parameter", { type: "unknown" }, { parameter: {} })).toBeNull();
  });
});
