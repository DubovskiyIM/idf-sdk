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
  external: [
    "react",
    "react-dom",
    "@intent-driven/renderer",
    "lucide-react",
    "@radix-ui/react-dialog",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-select",
    "@radix-ui/react-tabs",
    "@radix-ui/react-avatar",
    "clsx",
    /\.css$/,
  ],
  loader: { ".jsx": "jsx" },
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".cjs" };
  },
});
