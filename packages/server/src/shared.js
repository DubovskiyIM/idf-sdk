import { crystallizeV2, deriveProjections, normalizeProjections } from "@intent-driven/core";

const artifactsCache = new WeakMap();

/**
 * Кэширует projections + crystallizeV2 артефакты по ссылке на ontology —
 * serverless cold-start съедает немного, hot — instant.
 *
 * Возвращает `projections` — это **raw projection map** (derived + authored,
 * нормализованный через archetype → kind по §12.1). Materializer'ы
 * ожидают именно raw shape (с witnesses как string[]), а не crystallizeV2
 * artifact (где witnesses — pattern-bank metadata).
 */
export function getArtifacts(ontology) {
  let cached = artifactsCache.get(ontology);
  if (cached) return cached;

  const intents = ontology.intents ?? {};
  const derived = deriveProjections(intents, ontology);
  const rawProjections = normalizeProjections({ ...derived, ...(ontology.projections ?? {}) });
  // Crystallize вызывается ради side-effects валидации (anchoring) +
  // future API; результат не используется handler'ами.
  crystallizeV2(intents, rawProjections, ontology, ontology.name ?? "default");
  cached = { projections: rawProjections };
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
