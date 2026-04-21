import { buildSystemPrompt } from "./promptBuilder.js";
import { suggestionsSchema } from "./schema.js";
import { createCache } from "./cache.js";
import { callClaude } from "./subprocess.js";
import { applySuggestions } from "./applySuggestions.js";
import { reviewSuggestions } from "./review.js";

export { applySuggestions, reviewSuggestions, buildSystemPrompt };

/**
 * Обогащает ontology через subprocess к claude CLI.
 *
 * @param {object} ontology
 * @param {object} opts
 *   - opts.cache: { get, set } — custom cache (default: disk-cache)
 *   - opts.subprocess: custom callClaude (для тестов)
 *   - opts.includeExamples: default true
 *   - opts.force: ignore cache
 * @returns {Promise<{ enriched, suggestions, cached }>}
 */
export async function enrich(ontology, opts = {}) {
  const {
    cache = createCache(),
    subprocess = callClaude,
    includeExamples = true,
    force = false,
  } = opts;

  const systemPrompt = buildSystemPrompt({ includeExamples });
  const input = { ontology };
  const cacheKey = systemPrompt + "\n" + JSON.stringify(input);

  let suggestions;
  let cached = false;

  if (!force) {
    const hit = await cache.get(cacheKey);
    if (hit) {
      suggestions = hit;
      cached = true;
    }
  }

  if (!suggestions) {
    suggestions = await subprocess({
      systemPrompt,
      input,
      schema: suggestionsSchema,
    });
    await cache.set(cacheKey, suggestions);
  }

  const enriched = applySuggestions(ontology, suggestions);
  return { enriched, suggestions, cached };
}
