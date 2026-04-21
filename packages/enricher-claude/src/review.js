import prompts from "prompts";
import pc from "picocolors";

/**
 * Interactive review suggestions. В зависимости от user'а:
 * - "applyAll" — возвращает все suggestions as-is.
 * - "reviewEach" — перебирает каждый и спрашивает accept/reject.
 * - "skip" — возвращает empty-suggestions (no-op).
 */
export async function reviewSuggestions(suggestions, { nonInteractive = false } = {}) {
  const counts = countSuggestions(suggestions);
  if (counts.total === 0) {
    console.log(pc.dim("Нет suggestions для применения."));
    return suggestions;
  }

  printSummary(counts);

  if (nonInteractive) return suggestions;

  const { action } = await prompts({
    type: "select",
    name: "action",
    message: "Что делать с suggestions?",
    choices: [
      { title: "Применить все", value: "applyAll" },
      { title: "Просмотреть по одной", value: "reviewEach" },
      { title: "Пропустить всё", value: "skip" },
    ],
    initial: 0,
  });

  if (action === "skip" || action === undefined) return emptySuggestions();
  if (action === "applyAll") return suggestions;
  return reviewEach(suggestions);
}

async function reviewEach(suggestions) {
  const accepted = emptySuggestions();

  for (const category of Object.keys(accepted)) {
    for (const item of suggestions[category] ?? []) {
      const label = formatItem(category, item);
      const { yes } = await prompts({
        type: "confirm",
        name: "yes",
        message: label,
        initial: true,
      });
      if (yes) accepted[category].push(item);
    }
  }
  return accepted;
}

function formatItem(category, item) {
  switch (category) {
    case "namedIntents":
      return `intent ${pc.cyan(item.name)} (target ${item.target}) — ${item.reason}`;
    case "absorbHints":
      return `absorb ${pc.cyan(item.child)} → ${item.parent} — ${item.reason}`;
    case "additionalRoles":
      return `${item.entity}.${pc.cyan(item.field)} role=${item.role} — ${item.reason}`;
    case "baseRoles":
      return `base-role ${pc.cyan(item.role)} — ${item.reason}`;
    default:
      return JSON.stringify(item);
  }
}

function countSuggestions(s) {
  const each = {
    namedIntents: (s.namedIntents ?? []).length,
    absorbHints: (s.absorbHints ?? []).length,
    additionalRoles: (s.additionalRoles ?? []).length,
    baseRoles: (s.baseRoles ?? []).length,
  };
  return { each, total: Object.values(each).reduce((a, b) => a + b, 0) };
}

function printSummary({ each, total }) {
  console.log(pc.bold(`\nClaude предложил ${total} suggestions:`));
  for (const [k, v] of Object.entries(each)) {
    if (v > 0) console.log(`  ${pc.cyan(k)}: ${v}`);
  }
  console.log("");
}

function emptySuggestions() {
  return {
    namedIntents: [],
    absorbHints: [],
    additionalRoles: [],
    baseRoles: [],
  };
}
