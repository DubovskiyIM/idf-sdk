/**
 * `idf import <source> [options]` — импорт schema в IDF-ontology.
 *
 * Сейчас поддерживается только `postgres`. В будущем — `openapi`, `prisma`.
 */
import fs from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";

export async function runImport(argv) {
  const source = argv[0];
  if (!source) {
    console.error(pc.red("Source обязателен. Пример: idf import postgres --url $DATABASE_URL"));
    process.exit(1);
  }

  const flags = parseFlags(argv.slice(1));

  switch (source) {
    case "postgres":
      return runPostgres(flags);
    default:
      console.error(pc.red(`Unknown import source: ${source}. Поддерживается: postgres`));
      process.exit(1);
  }
}

async function runPostgres(flags) {
  const url = flags.url ?? process.env.DATABASE_URL;
  if (!url) {
    console.error(pc.red("--url не указан и DATABASE_URL не установлен"));
    process.exit(1);
  }
  const out = flags.out ?? "src/domains/default/ontology.js";

  console.log(pc.cyan(`→ Reading schema from ${redactUrl(url)}...`));
  const { importPostgres, serialize } = await import("@intent-driven/importer-postgres");
  let ontology = await importPostgres({ connectionString: url, schema: flags.schema });

  const entityCount = Object.keys(ontology.entities).length;
  const baseIntents = Object.keys(ontology.intents).length;
  console.log(pc.green(`✓ Raw ontology: ${entityCount} entities, ${baseIntents} intents`));

  if (flags.enrich !== undefined) {
    console.log(pc.cyan("→ Запускаю enrich через claude CLI..."));
    const { enrich, applySuggestions } = await import("@intent-driven/enricher-claude");
    const { suggestions, cached } = await enrich(ontology);
    if (cached) console.log(pc.dim("  (из cache)"));
    ontology = applySuggestions(ontology, suggestions);
    const delta = Object.keys(ontology.intents).length - baseIntents;
    console.log(pc.green(`✓ Enriched: +${delta} intents`));
  }

  const src = serialize(ontology, { header: true });
  const absOut = path.resolve(process.cwd(), out);
  await fs.mkdir(path.dirname(absOut), { recursive: true });
  await fs.writeFile(absOut, src);

  console.log(pc.cyan(`  → ${out}`));
}

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) flags[a.slice(2)] = argv[++i];
  }
  return flags;
}

function redactUrl(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return url;
  }
}
