/**
 * Движок реактивных правил (event-condition-action) с расширениями v1.5.
 *
 * Базовое API (v1.4):
 *   { id, trigger, action, context }
 *
 * Расширения v1.5:
 *   - aggregation: { everyN } — fire каждый Nй trigger per user
 *     (counter в persistence.ruleState)
 *   - threshold: { lookback, field, condition } — predicate на last N entries
 *   - schedule: "weekly:sun:20:00" | "daily:08:00" — cron-like
 *   - condition: "effect.x > 0.6" — JS expression (whitelisted)
 *
 * Schedule v2 (temporal scheduler):
 *   - { after: "5min" } | { at: "$.readyAt" } — абсолютный или относительный
 *     timer. Триггерится при match trigger, revokeOn — отзыв.
 *
 * trigger — glob: "vote_*" (prefix) или "confirm_delivery" (exact).
 * action — intent_id, чьи conditions служат guard'ом.
 * context — маппинг { key: "effect.<field>" | литерал }.
 */

import { v4 as uuid } from "uuid";
import { resolveFiresAt } from "./scheduleV2.js";

export function matchTrigger(trigger, intentId) {
  if (Array.isArray(trigger)) {
    return trigger.some((t) => matchTrigger(t, intentId));
  }
  if (typeof trigger !== "string") return false;
  if (trigger === "*") return true;
  if (trigger.endsWith("*")) {
    return intentId.startsWith(trigger.slice(0, -1));
  }
  return trigger === intentId;
}

export function resolveContext(mapping, storedContext) {
  const result = {};
  for (const [key, value] of Object.entries(mapping || {})) {
    if (typeof value === "string" && value.startsWith("effect.")) {
      const field = value.slice("effect.".length);
      result[key] = storedContext[field];
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function buildActionEffect(actionIntentId, intent, resolvedContext, ruleId, clock = () => Date.now()) {
  const effects = intent.particles?.effects || [];
  const id = uuid();
  const now = clock();

  const contextWithWitness = ruleId
    ? {
        ...resolvedContext,
        __witness: {
          basis: `rule "${ruleId}" fired`,
          example: `action: ${actionIntentId}`,
          ruleId,
        },
      }
    : resolvedContext;

  if (effects.length === 1) {
    const ef = effects[0];
    return {
      id,
      intent_id: actionIntentId,
      alpha: ef.α || ef.alpha,
      target: ef.target,
      value: ef.value,
      scope: ef.σ || ef.scope || "account",
      context: contextWithWitness,
      status: "proposed",
      created_at: now,
    };
  }

  const base = effects[0]?.target?.split(".")[0] || actionIntentId;
  return {
    id,
    intent_id: actionIntentId,
    alpha: "batch",
    target: base,
    value: effects.map((ef) => ({
      alpha: ef.α || ef.alpha,
      target: ef.target,
      value: ef.value,
      context: contextWithWitness,
      scope: ef.σ || ef.scope || "account",
    })),
    scope: "account",
    context: contextWithWitness,
    status: "proposed",
    created_at: now,
  };
}

// ───── Guards / evaluators ─────

export function evaluateCondition(condition, values) {
  if (!condition) return false;
  const [op, target] = condition.split(":");
  switch (op) {
    case "all_equal":
      return values.every((v) => v === target || v === Number(target));
    case "equals": {
      const t = isNaN(Number(target)) ? target : Number(target);
      return values[0] === t;
    }
    case "gt":
      return Number(values[0]) > Number(target);
    case "lt":
      return Number(values[0]) < Number(target);
    default:
      return false;
  }
}

export function evaluateRuleCondition(conditionExpr, effectContext) {
  if (!conditionExpr) return true;
  const safeExpr = conditionExpr.replace(/effect\.(\w+)/g, (_, field) => {
    const val = effectContext?.[field];
    return JSON.stringify(val ?? null);
  });
  const Math2 = {
    abs: Math.abs, min: Math.min, max: Math.max,
    floor: Math.floor, ceil: Math.ceil, round: Math.round,
  };
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("Math", `"use strict"; return (${safeExpr});`);
    return Boolean(fn(Math2));
  } catch {
    return false;
  }
}

export function parseSchedule(scheduleStr) {
  if (!scheduleStr) return null;
  const parts = scheduleStr.split(":");
  if (parts[0] === "weekly") {
    const dayMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    return {
      period: "weekly",
      day: dayMap[parts[1]?.toLowerCase()] ?? 0,
      hour: Number(parts[2] || 0),
      minute: Number(parts[3] || 0),
    };
  }
  if (parts[0] === "daily") {
    return {
      period: "daily",
      hour: Number(parts[1] || 0),
      minute: Number(parts[2] || 0),
    };
  }
  return null;
}

export function shouldFireSchedule(schedule, now = new Date(), lastFiredAt = 0, nowMs) {
  if (!schedule) return false;
  const { period, day, hour, minute } = schedule;
  if (period === "weekly" && now.getDay() !== day) return false;
  if (now.getHours() !== hour) return false;
  if (now.getMinutes() < minute || now.getMinutes() >= minute + 5) return false;
  const refMs = nowMs != null ? nowMs : (typeof now.getTime === "function" ? now.getTime() : Date.now());
  return refMs - lastFiredAt > 4 * 60 * 1000;
}

export function cronToFirstFiresAt(parsed, nowMs) {
  if (!parsed) return null;
  const now = new Date(nowMs);
  const target = new Date(now);
  target.setUTCSeconds(0, 0);
  target.setUTCHours(parsed.hour, parsed.minute);
  if (parsed.period === "daily") {
    if (target.getTime() <= nowMs) target.setUTCDate(target.getUTCDate() + 1);
    return target.getTime();
  }
  if (parsed.period === "weekly") {
    let daysAhead = (parsed.day - target.getUTCDay() + 7) % 7;
    if (daysAhead === 0 && target.getTime() <= nowMs) daysAhead = 7;
    target.setUTCDate(target.getUTCDate() + daysAhead);
    return target.getTime();
  }
  return null;
}

// ───── Factory ─────

/**
 * @param {Object} opts
 * @param {import('./persistence/types.js').Persistence} opts.persistence
 * @param {Array} [opts.rules] — ontology.rules по умолчанию; можно переопределить в react()
 * @param {Object} [opts.intents] — intents domain'а; если не задан, берётся из react args
 * @param {() => number} [opts.clock]
 * @param {(intent: Object, ctx: Object, world: Object) => { ok: boolean, reason?: string }} [opts.validateIntentConditions]
 * @param {(rule: Object, effect: Object) => void} [opts.onRuleTriggered]
 */
export function createRuleEngine({
  persistence,
  rules = [],
  intents = {},
  clock = () => Date.now(),
  validateIntentConditions = () => ({ ok: true }),
  onRuleTriggered,
} = {}) {
  if (!persistence) throw new Error("createRuleEngine: persistence is required");

  async function shouldFireAggregation(rule, userId) {
    if (!rule.aggregation) return true;
    const { everyN } = rule.aggregation;
    if (!everyN) return true;
    const prev = await persistence.ruleState.get(rule.id, userId);
    const counter = (prev.counter || 0) + 1;
    await persistence.ruleState.set(rule.id, userId, { counter, lastFiredAt: clock() });
    return counter % everyN === 0;
  }

  function shouldFireThreshold(rule, world, userId) {
    if (!rule.threshold) return true;
    const { lookback, field, condition, collection = "moodEntries" } = rule.threshold;
    const list = world?.[collection] || [];
    const userEntries = list
      .filter((e) => e.userId === userId)
      .sort((a, b) => (b.loggedAt || b.createdAt || 0) - (a.loggedAt || a.createdAt || 0))
      .slice(0, lookback);
    if (userEntries.length < lookback) return false;
    return evaluateCondition(condition, userEntries.map((e) => e[field]));
  }

  /**
   * React на эффект: проверить все rules с matching trigger, применить
   * guards (aggregation/threshold/condition), построить derived effects.
   *
   * @param {Object} effect — confirmed effect
   * @param {Object} world — текущий folded world
   * @returns {Promise<Object[]>} — derived effects (proposed)
   */
  async function react(effect, world = {}) {
    const storedCtx = typeof effect.context === "string" && effect.context !== ""
      ? JSON.parse(effect.context)
      : (effect.context || {});

    const matched = rules.filter((rule) => matchTrigger(rule.trigger, effect.intent_id));
    if (matched.length === 0) return [];

    const derived = [];

    for (const rule of matched) {
      // Schedule-only rules (v1 cron) — firing through periodic tick, not reactive.
      if (rule.schedule && !rule.trigger) continue;

      const intent = intents[rule.action];
      if (!intent) continue;

      const resolvedCtx = resolveContext(rule.context || {}, storedCtx);
      const userId = resolvedCtx.userId || storedCtx.userId || "default";

      if (!(await shouldFireAggregation(rule, userId))) continue;
      if (!shouldFireThreshold(rule, world, userId)) continue;
      if (!evaluateRuleCondition(rule.condition, storedCtx)) continue;

      const mockEffect = {
        intent_id: rule.action,
        target: intent.particles?.effects?.[0]?.target || rule.action,
        context: resolvedCtx,
      };
      const validation = validateIntentConditions(mockEffect, resolvedCtx, world);
      if (!validation.ok && validation.valid !== true) continue;

      const derivedEffect = buildActionEffect(rule.action, intent, resolvedCtx, rule.id, clock);
      derived.push(derivedEffect);
      if (onRuleTriggered) onRuleTriggered(rule, effect);
    }

    return derived;
  }

  /**
   * Schedule v2 — для эффекта генерирует schedule_timer / revoke_timer
   * эффекты согласно rules[].after / .at / .revokeOn.
   *
   * @param {Object} effect — confirmed effect
   * @param {Object} world — current folded world (для активных таймеров)
   * @returns {Object[]} — timer-эффекты (proposed) к последующему submit'у
   */
  function reactScheduleV2(effect, world = {}) {
    const nowMs = clock();
    const payload = typeof effect.context === "string" && effect.context !== ""
      ? JSON.parse(effect.context)
      : (effect.context || {});

    const out = [];

    // 1) trigger match → schedule_timer
    for (const rule of rules) {
      if (!matchTrigger(rule.trigger, effect.intent_id)) continue;
      if (!rule.after && !rule.at) continue;
      const firesAt = resolveFiresAt(rule, payload, nowMs);
      if (firesAt == null) continue;
      const fireParams = resolveParams(rule.params, payload);
      const triggerEventKey = `${rule.id}:${rule.trigger}`;
      const timerId = uuid();
      out.push({
        id: uuid(),
        intent_id: "schedule_timer",
        alpha: "add",
        target: "ScheduledTimer",
        value: null,
        scope: "account",
        parent_id: null,
        status: "proposed",
        context: {
          id: timerId,
          firesAt,
          fireIntent: rule.fireIntent,
          fireParams,
          triggerEventKey,
          revokeOnEvents: rule.revokeOn || [],
          guard: rule.guard || null,
        },
        created_at: nowMs,
      });
    }

    // 2) revokeOn match → revoke active timers
    const activeTimers = (world.scheduledTimers || []).filter((t) => t.active && t.firedAt == null);
    for (const rule of rules) {
      if (!rule.revokeOn || !rule.revokeOn.includes(effect.intent_id)) continue;
      const triggerEventKey = `${rule.id}:${rule.trigger}`;
      const matching = activeTimers.filter((t) => t.triggerEventKey === triggerEventKey);
      for (const t of matching) {
        out.push({
          id: uuid(),
          intent_id: "revoke_timer",
          alpha: "replace",
          target: "ScheduledTimer",
          value: null,
          scope: "account",
          parent_id: t.id,
          status: "proposed",
          context: { id: t.id, reason: "revokedByEvent", revokedBy: effect.intent_id },
          created_at: nowMs,
        });
      }
    }

    return out;
  }

  return { react, reactScheduleV2 };
}

function resolveParams(params, payload) {
  if (!params) return {};
  const out = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string" && v.startsWith("$.")) {
      const path = v.slice(2).split(".");
      let cur = payload;
      for (const p of path) cur = cur?.[p];
      out[k] = cur;
    } else {
      out[k] = v;
    }
  }
  return out;
}
