#!/usr/bin/env node
/**
 * Прямой вызов `scaffold()` из @intent-driven/create-idf-app, минуя
 * auto-install в cli.js. CI сам ставит deps после wire-tarballs.mjs,
 * чтобы монорепо-код тестировался, а не published npm-версии.
 *
 * Usage: scaffold-direct.mjs <target-dir> <ui-kit>
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [, , targetDir, uiKit = "mantine"] = process.argv;
if (!targetDir) {
  console.error("Usage: scaffold-direct.mjs <target-dir> <ui-kit>");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .github/workflows/scripts/ → three up to repo root
const repoRoot = path.resolve(__dirname, "../../..");
const { scaffold } = await import(
  path.join(repoRoot, "packages/create-idf-app/src/scaffold.js")
);
const { buildVars } = await import(
  path.join(repoRoot, "packages/create-idf-app/src/ui-kit-vars.js")
);
const templateDir = path.join(
  repoRoot,
  "packages/create-idf-app/templates/default"
);
const projectName = path.basename(path.resolve(targetDir));

await scaffold({
  templateDir,
  targetDir: path.resolve(targetDir),
  vars: buildVars({ projectName, uiKit }),
  fs,
});

console.log(`✓ scaffolded ${projectName} (ui-kit=${uiKit}) in ${targetDir}`);
