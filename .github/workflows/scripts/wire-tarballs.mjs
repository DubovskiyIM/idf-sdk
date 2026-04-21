#!/usr/bin/env node
/**
 * Заменяет `@intent-driven/*` зависимости в scaffold'енном проекте на
 * `file:/tmp/tgz/<pkg>-<ver>.tgz`, чтобы smoke-CI тестировал текущий
 * monorepo-код, а не published npm-версии.
 *
 * Usage: wire-tarballs.mjs <scaffold-dir>
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TGZ_DIR = "/tmp/tgz";
const scaffoldDir = process.argv[2];
if (!scaffoldDir) {
  console.error("Usage: wire-tarballs.mjs <scaffold-dir>");
  process.exit(1);
}

const tgzFiles = readdirSync(TGZ_DIR).filter((f) => f.endsWith(".tgz"));
const tgzMap = {};
for (const file of tgzFiles) {
  // intent-driven-core-0.49.0.tgz → @intent-driven/core
  const m = file.match(/^intent-driven-(.+?)-\d[\d.]*(-[\w.-]+)?\.tgz$/);
  if (!m) {
    console.warn(`skip unrecognized tgz: ${file}`);
    continue;
  }
  const pkgName = `@intent-driven/${m[1]}`;
  tgzMap[pkgName] = join(TGZ_DIR, file);
}
console.log(`Found ${Object.keys(tgzMap).length} tarballs`);

const pkgJsonPath = join(scaffoldDir, "package.json");
const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));

let changed = 0;
for (const section of ["dependencies", "devDependencies"]) {
  if (!pkg[section]) continue;
  for (const dep of Object.keys(pkg[section])) {
    if (tgzMap[dep]) {
      pkg[section][dep] = `file:${tgzMap[dep]}`;
      changed++;
    }
  }
}

writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`Rewrote ${changed} deps in ${scaffoldDir}/package.json`);
