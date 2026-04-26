/**
 * Бенчмарк incremental fold vs full fold.
 *
 * Запуск: npx vitest bench src/snapshot.bench.js
 *
 * Цель: foldFromSnapshot(snap_9000, last_1000) должен быть ≥2× быстрее,
 * чем fold(10000) на одной machine. ≥5× — желаемая граница.
 */

import { bench, describe } from "vitest";
import { fold } from "./fold.js";
import { createSnapshot, foldFromSnapshot } from "./snapshot.js";

function makeEffects(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `e${i}`,
    parent_id: null,
    target: i % 3 === 0 ? "user" : "user.name",
    alpha: i % 3 === 0 ? "add" : "replace",
    status: "confirmed",
    context: i % 3 === 0
      ? { id: `u${i}`, name: `User${i}` }
      : { id: `u${Math.floor(i / 3) * 3}` },
    value: i % 3 !== 0 ? `name${i}` : undefined,
    created_at: i,
  }));
}

const TOTAL = 10_000;
const SNAP_SIZE = 9_000;
const all = makeEffects(TOTAL);
const snap = createSnapshot(all.slice(0, SNAP_SIZE));
const delta = all.slice(SNAP_SIZE);

describe("fold vs foldFromSnapshot — 10K Φ, 1K delta", () => {
  bench("fold(10K) — full re-fold", () => {
    fold(all);
  });

  bench("foldFromSnapshot(snap_9K, delta_1K)", () => {
    foldFromSnapshot(snap, delta);
  });

  bench("createSnapshot(9K) — one-time cost", () => {
    createSnapshot(all.slice(0, SNAP_SIZE));
  });
});
