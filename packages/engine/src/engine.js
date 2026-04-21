/**
 * createEngine — orchestrator над validator + ruleEngine + timeEngine.
 *
 * Единственная точка wire-up'а: host передаёт domain + persistence + callbacks,
 * получает объект с async submit / tick / hydrate / foldWorld / dispose.
 *
 * См. docs/superpowers/specs/2026-04-21-intent-driven-engine-design.md
 */

import { v4 as uuid } from "uuid";
import { createValidator } from "./validator.js";
import { createRuleEngine } from "./ruleEngine.js";
import { createTimeEngine } from "./timeEngine.js";

const DEFAULT_MAX_RULE_DEPTH = 10;

/**
 * @param {Object} opts
 * @param {Object} opts.domain — { INTENTS, ONTOLOGY, validateIntentConditions? }
 * @param {import('./persistence/types.js').Persistence} opts.persistence
 * @param {() => number} [opts.clock]
 * @param {{ info: Function, warn: Function, error: Function }} [opts.logger]
 * @param {Object} [opts.callbacks]
 * @param {(effect: Object) => void} [opts.callbacks.onEffectConfirmed]
 * @param {(effect: Object, meta: { reason: string, cascaded: string[] }) => void} [opts.callbacks.onEffectRejected]
 * @param {(timer: Object) => void} [opts.callbacks.onTimerFired]
 * @param {(rule: Object, effect: Object) => void} [opts.callbacks.onRuleTriggered]
 * @param {number} [opts.maxRuleDepth]
 */
export function createEngine({
  domain,
  persistence,
  clock = () => Date.now(),
  logger = noopLogger(),
  callbacks = {},
  maxRuleDepth = DEFAULT_MAX_RULE_DEPTH,
} = {}) {
  if (!domain?.ONTOLOGY || !domain?.INTENTS) {
    throw new Error("createEngine: domain must include ONTOLOGY and INTENTS");
  }
  if (!persistence) {
    throw new Error("createEngine: persistence is required");
  }

  const validator = createValidator({
    persistence,
    ontology: domain.ONTOLOGY,
    validateIntentConditions: domain.validateIntentConditions || (() => ({ ok: true })),
    clock,
  });

  const ruleEngine = createRuleEngine({
    persistence,
    rules: domain.ONTOLOGY.rules || [],
    intents: domain.INTENTS,
    clock,
    validateIntentConditions: domain.validateIntentConditions || (() => ({ ok: true })),
    onRuleTriggered: callbacks.onRuleTriggered,
  });

  const timeEngine = createTimeEngine({
    persistence,
    clock,
    onTimerFired: callbacks.onTimerFired,
  });

  async function submit(effect, { viewer } = {}, _depth = 0) {
    if (_depth > maxRuleDepth) {
      logger.warn?.(`[engine] rule depth overflow at ${effect?.intent_id} (depth=${_depth})`);
      callbacks.onEffectRejected?.(effect, { reason: "rule-depth-overflow", cascaded: [] });
      return { status: "rejected", reason: "rule-depth-overflow" };
    }

    const normalized = {
      ...effect,
      id: effect.id || uuid(),
      status: effect.status || "proposed",
      created_at: effect.created_at != null ? effect.created_at : clock(),
    };

    const result = await validator.submit(normalized, { viewer });

    if (result.status === "confirmed") {
      callbacks.onEffectConfirmed?.(normalized);

      // Rule reactions (синхронные rules + scheduleV2)
      const world = await validator.foldWorld();
      try {
        const derived = await ruleEngine.react(normalized, world);
        for (const d of derived) {
          await submit(d, { viewer }, _depth + 1);
        }
      } catch (err) {
        logger.warn?.(`[engine] ruleEngine.react failed: ${err?.message}`);
      }

      try {
        const scheduled = ruleEngine.reactScheduleV2(normalized, world);
        for (const s of scheduled) {
          await submit(s, { viewer }, _depth + 1);
        }
      } catch (err) {
        logger.warn?.(`[engine] ruleEngine.reactScheduleV2 failed: ${err?.message}`);
      }

      // timeEngine реагирует на schedule_timer / revoke_timer
      timeEngine.onEffectConfirmed(normalized);
    } else if (result.status === "rejected") {
      callbacks.onEffectRejected?.(normalized, {
        reason: result.reason,
        cascaded: result.cascaded || [],
      });
    }

    return result;
  }

  async function tick() {
    const world = await validator.foldWorld();
    const emitted = timeEngine.fireDue(world);
    for (const ef of emitted) {
      await submit(ef);
    }
    return emitted;
  }

  async function hydrate() {
    await timeEngine.hydrate();
  }

  async function foldWorld() {
    return await validator.foldWorld();
  }

  async function dispose() {
    // stateless factory — noop. Hook для будущих disposables (таймеров и т.д.).
  }

  return { submit, tick, hydrate, foldWorld, dispose };
}

function noopLogger() {
  return { info() {}, warn() {}, error() {} };
}
