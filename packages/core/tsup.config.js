import { defineConfig } from "tsup";

// SKIP_DTS=true на CI: DTS-генерация (tsup worker) потребляет >4 GB heap
// на больших пакетах. CI проверяет типы через tsc --noEmit (отдельный шаг).
// Для npm publish DTS собирается локально без флага.
const skipDts = process.env.SKIP_DTS === "true";

export default defineConfig({
  entry: ["src/index.js"],
  format: ["esm", "cjs"],
  dts: !skipDts,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  target: "es2022",
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".cjs" };
  },
});
