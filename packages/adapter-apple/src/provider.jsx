import React from "react";
import { registerUIAdapter } from "@intent-driven/renderer";
import { appleAdapter } from "./adapter.jsx";

// theme.css не auto-импортируется: содержит @import "tailwindcss",
// который должен резолвиться через bundler хоста (vite + @tailwindcss/vite).
// Хост явно импортирует: import "@intent-driven/adapter-apple/styles.css".
export function AppleAdapterProvider({ children }) {
  React.useEffect(() => registerUIAdapter(appleAdapter), []);
  return <>{children}</>;
}
