import { substitute } from "./substitute.js";
import path from "node:path";

export async function scaffold({ templateDir, targetDir, vars, fs }) {
  let targetStat;
  try {
    targetStat = await fs.stat(targetDir);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    targetStat = null;
  }

  if (targetStat?.isDirectory()) {
    const entries = await fs.readdir(targetDir);
    if (entries.length > 0) {
      throw new Error(`Target directory ${targetDir} is not empty`);
    }
  } else {
    await fs.mkdir(targetDir, { recursive: true });
  }

  await copyRecursive(templateDir, targetDir, vars, fs);
}

async function copyRecursive(srcDir, destDir, vars, fs) {
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destName = entry.name.endsWith(".tmpl")
      ? entry.name.slice(0, -".tmpl".length)
      : entry.name;
    const destPath = path.join(destDir, destName);

    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true });
      await copyRecursive(srcPath, destPath, vars, fs);
    } else {
      const content = await fs.readFile(srcPath, "utf8");
      const processed = entry.name.endsWith(".tmpl")
        ? substitute(content, vars)
        : content;
      await fs.writeFile(destPath, processed);
    }
  }
}
