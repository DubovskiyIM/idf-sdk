const VALID_UI_KITS = ["mantine", "shadcn", "apple", "antd"];
const VALID_TEMPLATES = ["default"];

export function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    return { showHelp: true };
  }

  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      flags[key] = argv[++i];
    } else {
      positional.push(a);
    }
  }

  const targetDir = positional[0];
  if (!targetDir) throw new Error("targetDir обязателен");

  const uiKit = flags["ui-kit"] ?? "mantine";
  if (!VALID_UI_KITS.includes(uiKit)) {
    throw new Error(`Unknown ui-kit: ${uiKit} (допустимы: ${VALID_UI_KITS.join(", ")})`);
  }

  const template = flags.template ?? "default";
  if (!VALID_TEMPLATES.includes(template)) {
    throw new Error(`Unknown template: ${template}`);
  }

  return { targetDir, uiKit, template, showHelp: false };
}
