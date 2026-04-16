/**
 * `idf init <name>` — основной flow.
 *
 * 5 шагов диалога с LLM:
 *   1. Описание домена (1-2 предложения)
 *   2. Сущности (LLM предлагает → пользователь правит)
 *   3. Роли
 *   4. Намерения (LLM выводит → пользователь убирает лишние)
 *   5. Подтверждение → генерация файлов
 *
 * После генерации — self-validation: прогон crystallizeV2 на сгенерированный
 * домен, чтобы убедиться что артефакт собирается.
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import { join, resolve } from "node:path";
import pc from "picocolors";
import prompts from "prompts";
import { askLLM, MODEL_IDS } from "./llm.js";
import { renderTemplate } from "./templates/render.js";

export async function runInit({ name, model, out }) {
  const targetDir = resolve(out || `./${name}`);

  // 1) Не перезаписываем существующее (защита от случайного удаления работы)
  if (await pathExists(targetDir)) {
    console.error(pc.red(`Каталог уже существует: ${targetDir}`));
    console.error("Удалите его или выберите другое имя / --out.");
    process.exit(1);
  }

  console.log(pc.bold(`\n🌱 Bootstrap нового домена: ${pc.cyan(name)}`));
  console.log(`Модель: ${pc.dim(MODEL_IDS[model])}\n`);

  // ─── ШАГ 1: описание ─────────────────────────────────────────────────
  const { description } = await prompts({
    type: "text",
    name: "description",
    message: "Опиши домен в 1-2 предложениях:",
    validate: v => v.trim().length >= 10 || "Слишком коротко — добавь контекста",
  });
  if (!description) exitGracefully();

  // ─── ШАГ 2: сущности ─────────────────────────────────────────────────
  console.log(pc.dim("\nЗапрос к Claude — предложить сущности..."));
  const entitiesProposal = await askLLM(model, "entities", { name, description });
  console.log(pc.bold("\nПредложенные сущности:"));
  for (const e of entitiesProposal.entities) {
    console.log(`  ${pc.cyan(e.name)} — ${pc.dim(e.fields.join(", "))}`);
  }
  const { entitiesOk } = await prompts({
    type: "confirm",
    name: "entitiesOk",
    message: "Принять список сущностей?",
    initial: true,
  });
  if (!entitiesOk) {
    console.log(pc.yellow("\nИнтерактивное редактирование сущностей пока не реализовано (v0.2)."));
    console.log("Сейчас — отказ или принять как есть. Выйти?");
    const { exit } = await prompts({ type: "confirm", name: "exit", message: "Выйти?", initial: true });
    if (exit) exitGracefully();
  }
  const entities = entitiesProposal.entities;

  // ─── ШАГ 3: роли ─────────────────────────────────────────────────────
  console.log(pc.dim("\nЗапрос к Claude — предложить роли..."));
  const rolesProposal = await askLLM(model, "roles", { name, description, entities });
  console.log(pc.bold("\nПредложенные роли:"));
  for (const r of rolesProposal.roles) {
    console.log(`  ${pc.cyan(r.id)} (base: ${pc.dim(r.base)}) — ${r.description}`);
  }
  const { rolesOk } = await prompts({
    type: "confirm",
    name: "rolesOk",
    message: "Принять список ролей?",
    initial: true,
  });
  if (!rolesOk) exitGracefully();
  const roles = rolesProposal.roles;

  // ─── ШАГ 4: намерения ────────────────────────────────────────────────
  console.log(pc.dim("\nЗапрос к Claude — вывести намерения..."));
  const intentsProposal = await askLLM(model, "intents", { name, description, entities, roles });
  console.log(pc.bold(`\nПредложенные намерения (${intentsProposal.intents.length}):`));
  for (const i of intentsProposal.intents) {
    console.log(`  ${pc.cyan(i.id)} — ${pc.dim(i.title || "")}`);
  }
  const { intentsKeep } = await prompts({
    type: "multiselect",
    name: "intentsKeep",
    message: "Какие оставить? (пробел — переключить, enter — подтвердить)",
    choices: intentsProposal.intents.map(i => ({ title: i.id, value: i.id, selected: true })),
    instructions: false,
    hint: "↑↓ — навигация, space — toggle, a — все, enter — готово",
  });
  if (!intentsKeep || intentsKeep.length === 0) exitGracefully();
  const intents = intentsProposal.intents.filter(i => intentsKeep.includes(i.id));

  // ─── ШАГ 5: генерация ────────────────────────────────────────────────
  console.log(pc.bold("\n📝 Генерирую файлы..."));
  await mkdir(targetDir, { recursive: true });
  await mkdir(join(targetDir, "test"), { recursive: true });

  const ctx = { name, description, entities, roles, intents };
  const files = [
    { path: "domain.js",                    template: "domain.js.tmpl"            },
    { path: "seed.js",                      template: "seed.js.tmpl"              },
    { path: "test/crystallize.test.js",     template: "crystallize.test.js.tmpl"  },
    { path: "package.json",                 template: "package.json.tmpl"         },
    { path: "README.md",                    template: "README.md.tmpl"            },
  ];

  for (const f of files) {
    const content = await renderTemplate(f.template, ctx);
    await writeFile(join(targetDir, f.path), content, "utf8");
    console.log(`  ${pc.green("✓")} ${f.path}`);
  }

  // ─── Self-validation ─────────────────────────────────────────────────
  console.log(pc.bold("\n🔍 Валидация артефакта..."));
  try {
    const { validateGenerated } = await import("./validate.js");
    const result = await validateGenerated(targetDir);
    console.log(`  ${pc.green("✓")} crystallizeV2 → артефакт собран (${result.projectionsCount} проекций)`);
    console.log(`  ${pc.green("✓")} intentAlgebra → ${result.relationsCount} связей вычислено`);
  } catch (err) {
    console.log(`  ${pc.yellow("⚠")} ${err.message}`);
    console.log(pc.dim("    (домен сгенерирован, но требует ручной правки)"));
  }

  // ─── Next steps ──────────────────────────────────────────────────────
  console.log(pc.bold(pc.green(`\n✨ Готово!  ${name} создан в ${targetDir}\n`)));
  console.log("Дальше:");
  console.log(`  ${pc.cyan(`cd ${name}`)}`);
  console.log(`  ${pc.cyan("npm install")}`);
  console.log(`  ${pc.cyan("npm test")}`);
  console.log(`\nПодключение к прототипу IDF: см. ${pc.cyan("README.md")}\n`);
}

async function pathExists(p) {
  try { await access(p); return true; }
  catch { return false; }
}

function exitGracefully() {
  console.log(pc.yellow("\nОтменено пользователем."));
  process.exit(0);
}
