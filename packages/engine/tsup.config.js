import { defineConfig } from "tsup";

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
