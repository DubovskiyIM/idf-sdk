/**
 * @typedef {Object} Effect
 * @property {string} id
 * @property {string} intent_id
 * @property {"add"|"replace"|"remove"|"batch"} alpha
 * @property {string} target
 * @property {*} [value]
 * @property {string} [scope]
 * @property {string|null} [parent_id]
 * @property {"proposed"|"confirmed"|"rejected"} status
 * @property {number} [ttl]
 * @property {Object} [context]
 * @property {number} created_at
 * @property {number|null} [resolved_at]
 */

/**
 * @typedef {Object} RuleState
 * @property {number} counter
 * @property {number|null} lastFiredAt
 */

/**
 * @typedef {Object} RuleStateStore
 * @property {(ruleId: string, userId: string) => Promise<RuleState>} get
 * @property {(ruleId: string, userId: string, state: Partial<RuleState>) => Promise<void>} set
 */

/**
 * @typedef {Object} EffectsFilter
 * @property {"proposed"|"confirmed"|"rejected"} [status]
 * @property {number} [since]
 */

/**
 * @typedef {Object} UpdateStatusOpts
 * @property {string} [reason]
 * @property {number} [resolvedAt]
 */

/**
 * @typedef {Object} Persistence
 * @property {(effect: Effect) => Promise<void>} appendEffect
 * @property {(filter?: EffectsFilter) => Promise<Effect[]>} readEffects
 * @property {(id: string, status: "confirmed"|"rejected", opts?: UpdateStatusOpts) => Promise<void>} updateStatus
 * @property {RuleStateStore} ruleState
 */

// Re-export для IntelliSense в consumer'ах.
export const TYPES_VERSION = "0.1.0";
