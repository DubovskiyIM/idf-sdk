import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  hungarianMatch,
  expandSlots,
  hungarianAssign,
} from "./hungarianAssign.js";
import { buildCostMatrix, greedyAssign } from "./jointSolver.js";

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

describe("hungarianMatch — square cost matrix", () => {
  it("identity 1x1", () => {
    expect(hungarianMatch([[5]])).toEqual([0]);
  });

  it("2x2 obvious — diagonal optimal", () => {
    const result = hungarianMatch([[1, 100], [100, 1]]);
    expect(result).toEqual([0, 1]);
  });

  it("2x2 cross — anti-diagonal optimal", () => {
    const result = hungarianMatch([[100, 1], [1, 100]]);
    expect(result).toEqual([1, 0]);
  });

  it("3x3 — total cost = 10 (anti-diag)", () => {
    // C = [[1,2,3],[2,4,6],[3,6,9]]
    // Best: 0→2(3)+1→1(4)+2→0(3) = 10
    const matrix = [[1, 2, 3], [2, 4, 6], [3, 6, 9]];
    const result = hungarianMatch(matrix);
    const cost = result.reduce((s, c, r) => s + matrix[r][c], 0);
    expect(cost).toBe(10);
  });

  it("permutation invariance: assignment — bijection", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 6 }).chain(n =>
          fc.array(
            fc.array(fc.integer({ min: 0, max: 100 }), { minLength: n, maxLength: n }),
            { minLength: n, maxLength: n }
          )
        ),
        (matrix) => {
          const result = hungarianMatch(matrix);
          expect(new Set(result).size).toBe(matrix.length);
          for (const c of result) {
            expect(c).toBeGreaterThanOrEqual(0);
            expect(c).toBeLessThan(matrix.length);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("optimality: Hungarian == brute-force minimum (n ≤ 4)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 4 }).chain(n =>
          fc.array(
            fc.array(fc.integer({ min: 0, max: 100 }), { minLength: n, maxLength: n }),
            { minLength: n, maxLength: n }
          )
        ),
        (matrix) => {
          const n = matrix.length;
          const hung = hungarianMatch(matrix);
          const hungCost = hung.reduce((s, c, r) => s + matrix[r][c], 0);
          // brute-force: enumerate all permutations
          const perms = (function gen(arr) {
            if (arr.length <= 1) return [arr];
            const res = [];
            for (let i = 0; i < arr.length; i++) {
              const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
              for (const p of gen(rest)) res.push([arr[i], ...p]);
            }
            return res;
          })(Array.from({ length: n }, (_, i) => i));
          let bruteCost = Infinity;
          for (const p of perms) {
            const c = p.reduce((s, col, row) => s + matrix[row][col], 0);
            if (c < bruteCost) bruteCost = c;
          }
          expect(hungCost).toBe(bruteCost);
        }
      ),
      { numRuns: 30 }
    );
  });
});

describe("expandSlots", () => {
  it("capacity 1 — без разворачивания", () => {
    const slots = { A: { capacity: 1 }, B: { capacity: 1 } };
    expect(expandSlots(slots)).toEqual([
      { virtualName: "A#0", physicalName: "A" },
      { virtualName: "B#0", physicalName: "B" },
    ]);
  });

  it("capacity > 1 — разворачивается в N slot-slots", () => {
    const slots = { A: { capacity: 3 }, B: { capacity: 2 } };
    const expanded = expandSlots(slots);
    expect(expanded).toHaveLength(5);
    expect(expanded[0]).toEqual({ virtualName: "A#0", physicalName: "A" });
    expect(expanded[2]).toEqual({ virtualName: "A#2", physicalName: "A" });
    expect(expanded[3]).toEqual({ virtualName: "B#0", physicalName: "B" });
  });

  it("capacity 0 — slot пропускается", () => {
    const slots = { A: { capacity: 0 }, B: { capacity: 2 } };
    const expanded = expandSlots(slots);
    expect(expanded).toHaveLength(2);
    expect(expanded[0].physicalName).toBe("B");
  });
});

describe("hungarianAssign — drop-in replacement для greedyAssign", () => {
  it("один intent → правильный slot", () => {
    const intents = [mkIntent("a", 80)];
    const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
    const result = hungarianAssign(matrix, SLOTS_DEFAULT);
    expect(result.assignment.get("a")).toBe("primaryCTA");
    expect(result.unassigned).toEqual([]);
    expect(result.witnesses).toEqual([]);
  });

  it("4 primary intents → 3 в primaryCTA, 1 в secondary", () => {
    const intents = [
      mkIntent("p1", 90),
      mkIntent("p2", 88),
      mkIntent("p3", 86),
      mkIntent("p4", 84),
    ];
    const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
    const result = hungarianAssign(matrix, SLOTS_DEFAULT);
    const inPrimary = [...result.assignment.entries()].filter(([_, s]) => s === "primaryCTA");
    expect(inPrimary).toHaveLength(3);
    expect(result.assignment.get("p4")).toBe("secondary");
  });

  it("intent без подходящего slot'а → unassigned + witness", () => {
    const intents = [mkIntent("orphan", 80)];
    const slotsRestricted = {
      onlyUtility: { capacity: 1, allowedRoles: ["utility"] },
    };
    const matrix = buildCostMatrix({ intents, slots: slotsRestricted });
    const result = hungarianAssign(matrix, slotsRestricted);
    expect(result.assignment.has("orphan")).toBe(false);
    expect(result.unassigned).toEqual(["orphan"]);
    expect(result.witnesses).toContainEqual(
      expect.objectContaining({
        basis: "ill-conditioned",
        intentId: "orphan",
      })
    );
  });

  it("больше primary intents чем total primary capacity — extra unassigned", () => {
    // primary fits в primaryCTA(3) + secondary(5) = 8
    const n = 12;
    const intents = Array.from({ length: n }, (_, i) =>
      mkIntent(`p${i}`, 90)
    );
    const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
    const result = hungarianAssign(matrix, SLOTS_DEFAULT);
    expect(result.assignment.size).toBe(8);
    expect(result.unassigned).toHaveLength(4);
  });

  it("пустой intents — empty result", () => {
    const matrix = buildCostMatrix({ intents: [], slots: SLOTS_DEFAULT });
    const result = hungarianAssign(matrix, SLOTS_DEFAULT);
    expect(result.assignment.size).toBe(0);
    expect(result.unassigned).toEqual([]);
  });
});

describe("hungarianAssign vs greedyAssign — optimality property", () => {
  function totalCost(matrix, result) {
    let s = 0;
    for (const [intentId, slotName] of result.assignment) {
      const i = matrix.rowIndex.get(intentId);
      const j = matrix.colIndex.get(slotName);
      s += matrix.cost[i][j];
    }
    return s;
  }

  it("Hungarian total cost ≤ Greedy total cost при равном assignment.size", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 2, maxLength: 15 }),
        (saliences) => {
          const intents = saliences.map((s, i) => mkIntent(`i${i}`, s));
          const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
          const greedy = greedyAssign(matrix, SLOTS_DEFAULT);
          const hung = hungarianAssign(matrix, SLOTS_DEFAULT);
          // Hungarian не должен оставлять fewer assigned чем greedy
          expect(hung.assignment.size).toBeGreaterThanOrEqual(greedy.assignment.size);
          // При равном size: Hungarian ≤ Greedy total cost
          if (greedy.assignment.size === hung.assignment.size) {
            expect(totalCost(matrix, hung)).toBeLessThanOrEqual(totalCost(matrix, greedy));
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("Hungarian: capacity respect", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 0, maxLength: 30 }),
        (saliences) => {
          const intents = saliences.map((s, i) => mkIntent(`i${i}`, s));
          const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
          const result = hungarianAssign(matrix, SLOTS_DEFAULT);
          const counts = new Map();
          for (const slotName of result.assignment.values()) {
            counts.set(slotName, (counts.get(slotName) || 0) + 1);
          }
          for (const [slotName, count] of counts) {
            expect(count).toBeLessThanOrEqual(SLOTS_DEFAULT[slotName].capacity);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
