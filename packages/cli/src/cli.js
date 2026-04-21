#!/usr/bin/env node
/**
 * @intent-driven/cli — CLI для bootstrap новых доменов IDF.
 *
 * Использование:
 *   idf init <domain-name>          # интерактивный диалог + генерация файлов
 *   idf init <domain-name> -m haiku # с явной моделью (haiku|sonnet|opus)
 *   idf --help
 *   idf --version
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pc from "picocolors";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8"));

function printHelp() {
  console.log(`
${pc.bold("idf")} — Intent-Driven Frontend CLI v${pkg.version}

${pc.bold("USAGE")}
  idf init <domain-name> [options]

${pc.bold("COMMANDS")}
  init <name>              Bootstrap нового домена через LLM-диалог.
                           Создаёт каталог <name>/ с domain.js, seed.js, тестами.
  import postgres [opts]   Postgres schema → ontology.js.
                           Флаги: --url <dsn>, --out <path>, --schema <name>.
                           Можно через переменную DATABASE_URL.

${pc.bold("OPTIONS")}
  -m, --model     LLM-модель: haiku | sonnet | opus  (default: sonnet)
  -o, --out       Каталог для генерации                (default: ./<name>)
  -h, --help      Показать эту справку
  -v, --version   Версия CLI

${pc.bold("ENVIRONMENT")}
  ANTHROPIC_API_KEY   API-ключ Claude. Получить: https://console.anthropic.com/

${pc.bold("EXAMPLES")}
  idf init expense-tracker
  idf init invoicing -m opus -o ./domains/invoicing
  `.trim());
}

function parseArgs(argv) {
  const args = { command: null, name: null, model: "sonnet", out: null };
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === "-h" || a === "--help") { args.command = "help"; return args; }
    if (a === "-v" || a === "--version") { args.command = "version"; return args; }
    if (a === "init") { args.command = "init"; args.name = argv[++i]; }
    else if (a === "-m" || a === "--model") { args.model = argv[++i]; }
    else if (a === "-o" || a === "--out")   { args.out   = argv[++i]; }
    else if (!args.command) { args.command = "unknown"; args.name = a; }
    i++;
  }
  return args;
}

async function main() {
  const raw = process.argv.slice(2);

  // Subcommand "import" — отдельный dispatcher с собственным arg-parsing'ом
  if (raw[0] === "import") {
    const { runImport } = await import("./import.js");
    return runImport(raw.slice(1));
  }

  const args = parseArgs(raw);

  if (!args.command || args.command === "help") { printHelp(); process.exit(0); }
  if (args.command === "version") { console.log(pkg.version); process.exit(0); }

  if (args.command === "init") {
    if (!args.name) {
      console.error(pc.red("Ошибка: укажи имя домена. Пример: idf init expense-tracker"));
      process.exit(1);
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error(pc.red("Ошибка: переменная ANTHROPIC_API_KEY не установлена."));
      console.error(`Получить ключ: ${pc.cyan("https://console.anthropic.com/")}`);
      process.exit(1);
    }
    const validModels = ["haiku", "sonnet", "opus"];
    if (!validModels.includes(args.model)) {
      console.error(pc.red(`Ошибка: неизвестная модель "${args.model}". Допустимые: ${validModels.join(", ")}`));
      process.exit(1);
    }
    const { runInit } = await import("./init.js");
    await runInit({ name: args.name, model: args.model, out: args.out });
    return;
  }

  console.error(pc.red(`Неизвестная команда: ${args.command}`));
  printHelp();
  process.exit(1);
}

main().catch(err => {
  console.error(pc.red("Непредвиденная ошибка:"), err.message);
  if (process.env.IDF_CLI_DEBUG) console.error(err.stack);
  process.exit(1);
});
