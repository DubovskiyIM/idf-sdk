/**
 * `idf enrich --in <ontology.js> [--out <path>] [--force] [--no-review]`
 *
 * Загружает ontology, обогащает через claude CLI, пишет обратно.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import pc from "picocolors";

export async function runEnrich(argv) {
  const flags = parseFlags(argv);
  const inPath = flags.in;
  if (!inPath) {
    console.error(pc.red("--in <ontology.js> обязателен"));
    process.exit(1);
  }

  const outPath = flags.out ?? inPath;
  const nonInteractive = flags["no-review"] === "true" || flags["no-review"] === "";
  const force = flags.force === "true" || flags.force === "";

  const absIn = path.resolve(process.cwd(), inPath);

  console.log(pc.cyan(`→ Загружаю ontology из ${inPath}...`));
  const mod = await import(pathToFileURL(absIn).href);
  const ontology = mod.ontology;
  if (!ontology) {
    console.error(pc.red(`В ${inPath} нет export const ontology`));
    process.exit(1);
  }

  const { enrich, reviewSuggestions, applySuggestions } = await import("@intent-driven/enricher-claude");
  const { serialize } = await import("@intent-driven/importer-postgres");

  console.log(pc.cyan("→ Запускаю claude subprocess..."));
  const { suggestions, cached } = await enrich(ontology, { force });
  if (cached) console.log(pc.dim("  (из cache)"));

  const accepted = await reviewSuggestions(suggestions, { nonInteractive });
  const enriched = applySuggestions(ontology, accepted);

  const src = serialize(enriched, { header: true });
  const absOut = path.resolve(process.cwd(), outPath);
  await fs.mkdir(path.dirname(absOut), { recursive: true });
  await fs.writeFile(absOut, src);

  const intentDiff = Object.keys(enriched.intents).length - Object.keys(ontology.intents).length;
  console.log(pc.green(`✓ Enriched: +${intentDiff} intents, написано в ${outPath}`));
}

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        flags[key] = "true";
      } else {
        flags[key] = next;
        i++;
      }
    }
  }
  return flags;
}
