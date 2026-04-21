#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import pc from "picocolors";
import { parseArgs } from "./parse-args.js";
import { scaffold } from "./scaffold.js";
import { detectPackageManager } from "./detect-pm.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, "..");

function printHelp() {
  console.log(`
${pc.bold("create-idf-app")} — scaffold для Intent-Driven Frontend

Usage:
  npx create-idf-app <dir> [options]

Options:
  --ui-kit <name>     mantine | shadcn | apple | antd (default: mantine)
  --template <name>   default (default: default)
  -h, --help          показать эту справку
`);
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(pc.red(err.message));
    printHelp();
    process.exit(1);
  }

  if (opts.showHelp) {
    printHelp();
    return;
  }

  const { targetDir, uiKit, template } = opts;
  const absTarget = path.resolve(process.cwd(), targetDir);
  const templateDir = path.join(PACKAGE_ROOT, "templates", template);
  const projectName = path.basename(absTarget);

  console.log(pc.cyan(`→ Scaffolding ${projectName} (ui-kit: ${uiKit})...`));

  await scaffold({
    templateDir,
    targetDir: absTarget,
    vars: { PROJECT_NAME: projectName, UI_KIT: uiKit },
    fs,
  });

  const pm = detectPackageManager();
  console.log(pc.cyan(`→ Installing dependencies via ${pm}...`));
  await runInstall(pm, absTarget);

  console.log(pc.green(`\n✓ Готово. Дальше:\n`));
  console.log(`  cd ${targetDir}`);
  console.log(`  ${pm} run dev`);
  console.log(`\nDeploy на Vercel: ${pc.bold(`vercel`)} (из директории проекта)\n`);
}

function runInstall(pm, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(pm, ["install"], {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${pm} install exited with ${code}`));
    });
  });
}

main().catch((err) => {
  console.error(pc.red(`Error: ${err.message}`));
  process.exit(1);
});
