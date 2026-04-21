import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  build: {
    // Optional auth-providers — подтягиваются dynamic import'ом в
    // src/auth.js только если VITE_AUTH_PROVIDER="supabase". Без этих
    // externals Rollup пытается pre-resolve и падает если пакет не
    // установлен (что нормально для default scaffold без supabase).
    rollupOptions: {
      external: ["@supabase/supabase-js"],
    },
  },
});
