import { crystallizeV2, deriveProjections } from "@intent-driven/core";

const artifactsCache = new WeakMap();

/**
 * Кэширует результат crystallizeV2 по ссылке на ontology —
 * serverless cold-start съедает немного, hot — instant.
 * Projections = derived + authored (если есть).
 */
export function getArtifacts(ontology) {
  let cached = artifactsCache.get(ontology);
  if (cached) return cached;

  const intents = ontology.intents ?? {};
  const derived = deriveProjections(intents, ontology);
  const projections = { ...derived, ...(ontology.projections ?? {}) };
  const byId = crystallizeV2(intents, projections, ontology, ontology.name ?? "default");
  cached = { projections: byId };
  artifactsCache.set(ontology, cached);
  return cached;
}

export function normalizeSlug(slug) {
  if (Array.isArray(slug)) return slug.filter(Boolean);
  if (typeof slug === "string") return slug.split("/").filter(Boolean);
  return [];
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  // Fallback: читать raw stream (Vercel serverless обычно сам парсит)
  return {};
}
