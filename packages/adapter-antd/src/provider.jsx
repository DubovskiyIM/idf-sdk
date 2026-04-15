import React from "react";
import { ConfigProvider } from "antd";
import { registerUIAdapter } from "@intent-driven/renderer";
import { antdAdapter } from "./adapter.jsx";

export function AntdAdapterProvider({ children, theme }) {
  React.useEffect(() => registerUIAdapter(antdAdapter), []);
  return <ConfigProvider theme={theme}>{children}</ConfigProvider>;
}
