import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  classifyIntentRole,
  buildCostMatrix,
  greedyAssign,
  INFINITY_COST,
} from "./jointSolver.js";

const SLOTS_DEFAULT = {
  primaryCTA: { capacity: 3, allowedRoles: ["primary", "destructive"] },
  secondary:  { capacity: 5, allowedRoles: ["primary", "secondary", "navigation"] },
  toolbar:    { capacity: 10, allowedRoles: ["secondary", "utility", "navigation"] },
  footer:     { capacity: 5, allowedRoles: ["utility", "destructive"] },
};

const mkIntent = (id, salience, opts = {}) => ({
  id,
  salience,
  particles: { effects: opts.effects || [] },
  ...opts,
});

describe("classifyIntentRole", () => {
  it("salience ≥ 80 → primary", () => {
    expect(classifyIntentRole({ salience: 100 })).toContain("primary");
    expect(classifyIntentRole({ salience: 80 })).toContain("primary");
  });

  it("salience 60-79 → secondary", () => {
    expect(classifyIntentRole({ salience: 70 })).toContain("secondary");
    expect(classifyIntentRole({ salience: 60 })).toContain("secondary");
  });

  it("salience 30-59 → navigation", () => {
    expect(classifyIntentRole({ salience: 40 })).toContain("navigation");
    expect(classifyIntentRole({ salience: 30 })).toContain("navigation");
  });

  it("salience < 30 → utility", () => {
    expect(classifyIntentRole({ salience: 10 })).toContain("utility");
    expect(classifyIntentRole({ salience: 5 })).toContain("utility");
  });

  it("intent с remove-main effect — добавляет destructive", () => {
    const intent = {
      salience: 30,
      particles: { effects: [{ α: "remove", target: "Listing" }] },
    };
    const roles = classifyIntentRole(intent, "Listing");
    expect(roles).toContain("navigation");
    expect(roles).toContain("destructive");
  });

  it("без salience → default 40 → navigation", () => {
    expect(classifyIntentRole({})).toContain("navigation");
  });

  it("intent с salience '' (некорректное) — default", () => {
    expect(classifyIntentRole({ salience: "junk" })).toContain("navigation");
  });
});

describe("buildCostMatrix", () => {
  it("матрица размера intents × slots", () => {
    const intents = [mkIntent("a", 80), mkIntent("b", 40)];
    const { cost, rowIndex, colIndex } = buildCostMatrix({
      intents,
      slots: SLOTS_DEFAULT,
    });
    expect(cost).toHaveLength(2);
    expect(cost[0]).toHaveLength(4);
    expect(rowIndex.get("a")).toBe(0);
    expect(rowIndex.get("b")).toBe(1);
    expect([...colIndex.keys()]).toEqual(["primaryCTA", "secondary", "toolbar", "footer"]);
  });

  it("cost = -salience для slot который принимает роль intent'а", () => {
    const intents = [mkIntent("primary_intent", 80)];
    const { cost, colIndex } = buildCostMatrix({
      intents,
      slots: SLOTS_DEFAULT,
    });
    expect(cost[0][colIndex.get("primaryCTA")]).toBe(-80);
    expect(cost[0][colIndex.get("secondary")]).toBe(-80);
  });

  it("cost = INFINITY если slot не принимает роль intent'а", () => {
    const intents = [mkIntent("utility_intent", 10)];
    const { cost, colIndex } = buildCostMatrix({
      intents,
      slots: SLOTS_DEFAULT,
    });
    expect(cost[0][colIndex.get("primaryCTA")]).toBe(INFINITY_COST);
    expect(cost[0][colIndex.get("toolbar")]).toBe(-10);
  });

  it("destructive intent — допускается в primaryCTA даже с низкой salience", () => {
    const intents = [
      mkIntent("delete_listing", 30, {
        effects: [{ α: "remove", target: "Listing" }],
      }),
    ];
    const { cost, colIndex } = buildCostMatrix({
      intents,
      slots: SLOTS_DEFAULT,
      mainEntity: "Listing",
    });
    expect(cost[0][colIndex.get("primaryCTA")]).toBe(-30);
    expect(cost[0][colIndex.get("footer")]).toBe(-30);
  });

  it("intent без salience → default 40 → navigation", () => {
    const intents = [mkIntent("read_only", undefined)];
    const { cost, colIndex } = buildCostMatrix({
      intents,
      slots: SLOTS_DEFAULT,
    });
    expect(cost[0][colIndex.get("secondary")]).toBe(-40);
    expect(cost[0][colIndex.get("toolbar")]).toBe(-40);
    expect(cost[0][colIndex.get("primaryCTA")]).toBe(INFINITY_COST);
  });

  it("пустой intents → пустая матрица", () => {
    const { cost, rowIndex } = buildCostMatrix({
      intents: [],
      slots: SLOTS_DEFAULT,
    });
    expect(cost).toEqual([]);
    expect(rowIndex.size).toBe(0);
  });

  it("пустые slots → каждая строка пустая", () => {
    const intents = [mkIntent("a", 80)];
    const { cost } = buildCostMatrix({
      intents,
      slots: {},
    });
    expect(cost[0]).toEqual([]);
  });
});

describe("greedyAssign", () => {
  it("один intent с одним подходящим слотом → assigned", () => {
    const intents = [mkIntent("a", 80)];
    const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
    const result = greedyAssign(matrix, SLOTS_DEFAULT);
    expect(result.assignment.get("a")).toBe("primaryCTA");
    expect(result.unassigned).toEqual([]);
  });

  it("intents в порядке salience desc — primary занимает primaryCTA", () => {
    const intents = [
      mkIntent("low", 30),
      mkIntent("high", 90),
      mkIntent("mid", 60),
    ];
    const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
    const result = greedyAssign(matrix, SLOTS_DEFAULT);
    expect(result.assignment.get("high")).toBe("primaryCTA");
    expect(result.assignment.get("mid")).toBe("secondary");
    expect(["secondary", "toolbar"]).toContain(result.assignment.get("low"));
  });

  it("capacity respect: 4 primary intents → 3 в primaryCTA, 1 в secondary", () => {
    const intents = [
      mkIntent("p1", 90),
      mkIntent("p2", 88),
      mkIntent("p3", 86),
      mkIntent("p4", 84),
    ];
    const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
    const result = greedyAssign(matrix, SLOTS_DEFAULT);
    const inPrimary = [...result.assignment.entries()].filter(([_, s]) => s === "primaryCTA");
    expect(inPrimary).toHaveLength(3);
    expect(result.assignment.get("p4")).toBe("secondary");
  });

  it("intent без подходящего slot'а — unassigned + witness", () => {
    const intents = [mkIntent("orphan", 80)];
    const slotsRestricted = {
      onlyUtility: { capacity: 1, allowedRoles: ["utility"] },
    };
    const matrix = buildCostMatrix({ intents, slots: slotsRestricted });
    const result = greedyAssign(matrix, slotsRestricted);
    expect(result.assignment.has("orphan")).toBe(false);
    expect(result.unassigned).toEqual(["orphan"]);
    expect(result.witnesses).toContainEqual(
      expect.objectContaining({
        basis: "ill-conditioned",
        intentId: "orphan",
      })
    );
  });

  it("все intents fit — unassigned пуст, witnesses пуст", () => {
    const intents = [mkIntent("a", 80), mkIntent("b", 50), mkIntent("c", 20)];
    const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
    const result = greedyAssign(matrix, SLOTS_DEFAULT);
    expect(result.unassigned).toEqual([]);
    expect(result.witnesses).toEqual([]);
    expect(result.assignment.size).toBe(3);
  });

  it("capacity 0 — slot никого не принимает", () => {
    const slotsZero = {
      blocked: { capacity: 0, allowedRoles: ["primary"] },
      open: { capacity: 5, allowedRoles: ["primary"] },
    };
    const intents = [mkIntent("a", 90)];
    const matrix = buildCostMatrix({ intents, slots: slotsZero });
    const result = greedyAssign(matrix, slotsZero);
    expect(result.assignment.get("a")).toBe("open");
  });

  it("детерминизм: один input → одинаковый output", () => {
    const intents = [
      mkIntent("a", 80),
      mkIntent("b", 80),
      mkIntent("c", 80),
    ];
    const matrix1 = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
    const result1 = greedyAssign(matrix1, SLOTS_DEFAULT);
    const matrix2 = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
    const result2 = greedyAssign(matrix2, SLOTS_DEFAULT);
    expect([...result1.assignment.entries()]).toEqual([...result2.assignment.entries()]);
  });
});

describe("greedyAssign — property tests (invariants)", () => {
  it("invariant: |assignment| + |unassigned| === |intents|", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 0, maxLength: 30 }),
        (saliences) => {
          const intents = saliences.map((s, i) => mkIntent(`i${i}`, s));
          const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
          const result = greedyAssign(matrix, SLOTS_DEFAULT);
          expect(result.assignment.size + result.unassigned.length).toBe(intents.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("invariant: capacity respect — каждый slot не превышает capacity", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 0, maxLength: 50 }),
        (saliences) => {
          const intents = saliences.map((s, i) => mkIntent(`i${i}`, s));
          const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
          const result = greedyAssign(matrix, SLOTS_DEFAULT);
          const counts = new Map();
          for (const slotName of result.assignment.values()) {
            counts.set(slotName, (counts.get(slotName) || 0) + 1);
          }
          for (const [slotName, count] of counts) {
            expect(count).toBeLessThanOrEqual(SLOTS_DEFAULT[slotName].capacity);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("invariant: assigned intent имеет cost < INFINITY в matrix", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 30 }),
        (saliences) => {
          const intents = saliences.map((s, i) => mkIntent(`i${i}`, s));
          const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
          const result = greedyAssign(matrix, SLOTS_DEFAULT);
          for (const [intentId, slotName] of result.assignment) {
            const i = matrix.rowIndex.get(intentId);
            const j = matrix.colIndex.get(slotName);
            expect(matrix.cost[i][j]).toBeLessThan(INFINITY_COST);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("invariant: unassigned ↔ нет feasible slot с ёмкостью (n primary > 8)", () => {
    // primary intents: помещаются только в primaryCTA(3) + secondary(5) = 8 максимум.
    // toolbar и footer не принимают primary роль.
    fc.assert(
      fc.property(
        fc.integer({ min: 30, max: 50 }),
        (n) => {
          const intents = Array.from({ length: n }, (_, i) =>
            mkIntent(`i${i}`, 90)
          );
          const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
          const result = greedyAssign(matrix, SLOTS_DEFAULT);
          expect(result.assignment.size).toBeLessThanOrEqual(8);
          if (n > 8) {
            expect(result.unassigned.length).toBe(n - 8);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
