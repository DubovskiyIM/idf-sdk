import React from "react";
import { registerUIAdapter } from "@idf/renderer";
import { appleAdapter } from "./adapter.jsx";
import "./theme.css";

export function AppleAdapterProvider({ children }) {
  React.useEffect(() => registerUIAdapter(appleAdapter), []);
  return <>{children}</>;
}
