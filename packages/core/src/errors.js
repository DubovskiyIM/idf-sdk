/**
 * Ошибки ядра IDF.
 *
 * @module errors
 */

/**
 * @typedef {import("./anchoring.js").AnchoringFinding} AnchoringFinding
 */

/**
 * Ошибка конструктивного анкеринга (§15 zazor #1).
 * Выбрасывается из crystallizeV2 в strict-режиме, когда checkAnchoring нашёл
 * структурные misses (неанкерированные entity или effect.target base).
 */
export class AnchoringError extends Error {
  /**
   * @param {AnchoringFinding[]} findings — только error-уровня findings.
   * @param {string} domainId — идентификатор домена для диагностики.
   */
  constructor(findings, domainId) {
    super(`Anchoring failed в домене "${domainId}": ${findings.length} structural misses`);
    this.name = "AnchoringError";
    /** @type {AnchoringFinding[]} */
    this.findings = findings;
    /** @type {string} */
    this.domainId = domainId;
  }
}
