import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.js"],
  format: ["esm", "cjs"],
  // tsup DTS spits на JSX в .jsx (Tiptap types кросс-package); ts-only
  // потребители используют untyped JS, что приемлемо для v0.1.
  // SKIP_DTS=true (CI scaffold-smoke convention) тоже отключит.
  dts: process.env.SKIP_DTS !== "true" && false,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  target: "es2022",
  external: [
    "react",
    "react-dom",
    "antd",
    "@intent-driven/adapter-antd",
    "@tiptap/react",
    "@tiptap/pm",
    "@tiptap/starter-kit",
  ],
  loader: { ".jsx": "jsx" },
  outExtension({ format }) { return { js: format === "esm" ? ".mjs" : ".cjs" }; },
});
