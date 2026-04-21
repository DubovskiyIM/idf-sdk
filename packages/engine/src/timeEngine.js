/**
 * Темпоральный scheduler — first-class механизм парадигмы.
 *
 * Содержит:
 *  - TimerQueue: in-memory store по firesAt, popDue в порядке ascending
 *  - createTimeEngine(): factory с hydrate / onEffectConfirmed / fireDue
 *
 * В engine-пакете persistence DI + injected clock заменяют прямые
 * обращения к db.prepare и Date.now().
 */

import { v4 as uuid } from "uuid";

export class TimerQueue {
  constructor() {
    this._byId = new Map();
  }
  insert(timer) {
    this._byId.set(timer.id, timer);
  }
  removeById(id) {
    return this._byId.delete(id);
  }
  size() {
    return this._byId.size;
  }
  /** Вернуть и удалить таймеры с firesAt <= now, в порядке firesAt asc. */
  popDue(now) {
    const due = [];
    for (const t of this._byId.values()) {
      if (t.firesAt <= now) due.push(t);
    }
    due.sort((a, b) => a.firesAt - b.firesAt);
    for (const t of due) this._byId.delete(t.id);
    return due;
  }
  /** Удобно для тестов. */
  snapshot() {
    return Array.from(this._byId.values());
  }
}

export function hydrateFromWorld(queue, world) {
  const timers = world?.scheduledTimers || [];
  for (const t of timers) {
    if (t.active === true && t.firedAt == null) {
      queue.insert(t);
    }
  }
}

function parseJSON(s) {
  if (s == null) return null;
  if (typeof s !== "string") return s;
  if (s === "") return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export function evalGuard(expr, world) {
  if (!expr) return true;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("world", `"use strict"; return (${expr});`);
    return Boolean(fn(world));
  } catch {
    return false;
  }
}

function computeNextCronFiresAt(scheduleStr, nowMs) {
  if (!scheduleStr) return null;
  const parts = scheduleStr.split(":");
  const now = new Date(nowMs);
  const target = new Date(now);
  target.setUTCSeconds(0, 0);
  if (parts[0] === "daily") {
    target.setUTCHours(Number(parts[1] || 0), Number(parts[2] || 0));
    if (target.getTime() <= nowMs) target.setUTCDate(target.getUTCDate() + 1);
    return target.getTime();
  }
  if (parts[0] === "weekly") {
    const dayMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const day = dayMap[parts[1]?.toLowerCase()] ?? 0;
    target.setUTCHours(Number(parts[2] || 0), Number(parts[3] || 0));
    let daysAhead = (day - target.getUTCDay() + 7) % 7;
    if (daysAhead === 0 && target.getTime() <= nowMs) daysAhead = 7;
    target.setUTCDate(target.getUTCDate() + daysAhead);
    return target.getTime();
  }
  return null;
}

/**
 * @param {Object} opts
 * @param {import('./persistence/types.js').Persistence} [opts.persistence] — нужен только для hydrate()
 * @param {() => number} [opts.clock]
 * @param {(timer: Object) => void} [opts.onTimerFired]
 * @returns {{
 *   insert: Function,
 *   remove: Function,
 *   hydrate: (world?: Object) => Promise<void>,
 *   onEffectConfirmed: (effect: Object) => void,
 *   fireDue: (world?: Object) => Object[],
 *   queue: TimerQueue,
 * }}
 */
export function createTimeEngine({ persistence, clock = () => Date.now(), onTimerFired } = {}) {
  const queue = new TimerQueue();

  async function hydrate(worldOverride) {
    if (worldOverride) {
      hydrateFromWorld(queue, worldOverride);
      return;
    }
    if (!persistence) return;
    const effects = await persistence.readEffects({ status: "confirmed" });
    const timers = {};
    for (const e of effects) {
      if (e.intent_id !== "schedule_timer") continue;
      const ctx = typeof e.context === "string" ? parseJSON(e.context) : (e.context || {});
      const id = ctx?.id;
      if (!id || ctx.firesAt == null) continue;
      timers[id] = { ...ctx, active: true, firedAt: null };
    }
    for (const e of effects) {
      if (e.intent_id !== "revoke_timer") continue;
      const ctx = typeof e.context === "string" ? parseJSON(e.context) : (e.context || {});
      const id = ctx?.id;
      if (id && timers[id]) {
        timers[id].firedAt = ctx.firedAt || e.created_at;
        timers[id].active = false;
      }
    }
    for (const t of Object.values(timers)) {
      if (t.active && t.firedAt == null) queue.insert(t);
    }
  }

  function onEffectConfirmed(effect) {
    const intentId = effect.intent_id;
    if (intentId !== "schedule_timer" && intentId !== "revoke_timer") return;
    const value = typeof effect.value === "string" ? parseJSON(effect.value) : effect.value;
    const context = typeof effect.context === "string" ? parseJSON(effect.context) : (effect.context || {});
    const payload = (value && typeof value === "object") ? value : (context || {});
    const id = payload.id || context?.id;

    if (intentId === "schedule_timer") {
      if (!id || payload.firesAt == null || !payload.fireIntent) return;
      queue.insert({
        id,
        firesAt: payload.firesAt,
        fireIntent: payload.fireIntent,
        fireParams: payload.fireParams || {},
        triggerEventKey: payload.triggerEventKey || null,
        revokeOnEvents: payload.revokeOnEvents || [],
        guard: payload.guard || null,
        cronSchedule: payload.cronSchedule || null,
      });
    } else if (intentId === "revoke_timer") {
      if (id) queue.removeById(id);
    }
  }

  /**
   * Прогнать due-таймеры. Возвращает emitted effects (без auto-submit — host
   * решает как их обрабатывать).
   */
  function fireDue(worldForGuards = {}) {
    const now = clock();
    const due = queue.popDue(now);
    if (due.length === 0) return [];

    const emitted = [];

    for (const t of due) {
      const guardOk = evalGuard(t.guard, worldForGuards);

      if (guardOk) {
        emitted.push({
          id: uuid(),
          intent_id: t.fireIntent,
          alpha: "add",
          target: t.fireIntent,
          value: null,
          scope: "account",
          parent_id: t.id,
          status: "proposed",
          context: {
            ...t.fireParams,
            causedByTimer: t.id,
            __witness: {
              basis: `timer "${t.id}" fired`,
              example: `fireIntent: ${t.fireIntent}`,
              causedByTimer: t.id,
            },
          },
          created_at: now,
        });
      }

      emitted.push({
        id: uuid(),
        intent_id: "revoke_timer",
        alpha: "replace",
        target: "ScheduledTimer",
        value: null,
        scope: "account",
        parent_id: t.id,
        status: "proposed",
        context: {
          id: t.id,
          firedAt: now,
          guardEvaluatedTrue: guardOk,
          __witness: {
            basis: `timer "${t.id}" fired, guard=${guardOk}`,
            example: `fireIntent: ${t.fireIntent}`,
            firedAt: now,
            guardEvaluatedTrue: guardOk,
          },
        },
        created_at: now,
      });

      // Cron self-rescheduling — baseline firesAt, не реальный now, чтобы
      // не drift'ить при задержке.
      if (t.cronSchedule) {
        const nextFiresAt = computeNextCronFiresAt(t.cronSchedule, t.firesAt);
        if (nextFiresAt != null) {
          emitted.push({
            id: uuid(),
            intent_id: "schedule_timer",
            alpha: "add",
            target: "ScheduledTimer",
            value: null,
            scope: "account",
            parent_id: t.id,
            status: "proposed",
            context: {
              id: uuid(),
              firesAt: nextFiresAt,
              fireIntent: t.fireIntent,
              fireParams: t.fireParams || {},
              triggerEventKey: t.triggerEventKey,
              cronSchedule: t.cronSchedule,
            },
            created_at: now,
          });
        }
      }

      if (onTimerFired) onTimerFired(t);
    }

    return emitted;
  }

  return {
    insert: (timer) => queue.insert(timer),
    remove: (id) => queue.removeById(id),
    hydrate,
    onEffectConfirmed,
    fireDue,
    queue,
  };
}
