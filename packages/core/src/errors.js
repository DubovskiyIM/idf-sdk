/**
 * Ошибки ядра IDF.
 */

export class AnchoringError extends Error {
  constructor(findings, domainId) {
    super(`Anchoring failed в домене "${domainId}": ${findings.length} structural misses`);
    this.name = "AnchoringError";
    this.findings = findings;
    this.domainId = domainId;
  }
}
