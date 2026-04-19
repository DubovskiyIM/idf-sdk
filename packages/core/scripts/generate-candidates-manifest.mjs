#!/usr/bin/env node
/**
 * Генерирует packages/core/src/patterns/candidate/manifest.js —
 * единый импорт всех JSON из candidate/bank/*.json с агрегацией дубликатов
 * по id (несколько файлов одного паттерна из разных batch'ей объединяются
 * в один запись с sources=[...]).
 *
 * Запускать после добавления новых кандидатов:
 *   node packages/core/scripts/generate-candidates-manifest.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK_DIR = join(__dirname, "..", "src", "patterns", "candidate", "bank");
const OUT_FILE = join(__dirname, "..", "src", "patterns", "candidate", "manifest.js");

const files = readdirSync(BANK_DIR).filter(f => f.endsWith(".json")).sort();

const byId = new Map();
for (const file of files) {
  const raw = JSON.parse(readFileSync(join(BANK_DIR, file), "utf-8"));
  if (!raw.id) continue;
  if (!byId.has(raw.id)) {
    byId.set(raw.id, { pattern: raw, sources: [] });
  }
  const entry = byId.get(raw.id);
  // source-info: имя файла (batch/source префикс) + structure.slot + source[0].source
  const primarySource = raw.rationale?.evidence?.[0]?.source;
  entry.sources.push({
    file,
    slot: raw.structure?.slot,
    primarySource,
    description: raw.structure?.description?.slice(0, 140),
  });
}

const candidates = [...byId.values()].map(({ pattern, sources }) => ({
  ...pattern,
  status: "candidate",
  sources,
}));

const lines = [];
lines.push("// AUTO-GENERATED from candidate/bank/*.json by");
lines.push("// packages/core/scripts/generate-candidates-manifest.mjs — не редактируйте вручную.");
lines.push("// Для обновления: pnpm -F @intent-driven/core generate:candidates");
lines.push("");
lines.push("export const CANDIDATE_PATTERNS = " + JSON.stringify(candidates, null, 2) + ";");
lines.push("");
writeFileSync(OUT_FILE, lines.join("\n"));

console.log(`Generated ${OUT_FILE}`);
console.log(`  Files processed: ${files.length}`);
console.log(`  Unique ids:      ${candidates.length}`);
const dups = [...byId.entries()].filter(([, e]) => e.sources.length > 1);
if (dups.length) {
  console.log(`  Duplicates merged:`);
  for (const [id, entry] of dups) {
    console.log(`    ${id}: ${entry.sources.length} sources`);
  }
}
