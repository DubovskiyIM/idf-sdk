import { describe, it, expect, afterEach } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import {
  AdapterProvider,
  useAdapter,
  useAdapterComponent,
  useAdapterPick,
  resolveAdapterComponent,
} from "./AdapterProvider.jsx";
import { registerUIAdapter } from "./registry.js";

function capture(hook) {
  const calls = [];
  function Probe(props) {
    calls.push(hook(props));
    return null;
  }
  return { Probe, calls };
}

const adapterA = {
  name: "A",
  parameter: { text: () => "A-text" },
  button:    { primary: () => "A-primary" },
};
const adapterB = {
  name: "B",
  parameter: { text: () => "B-text" },
};

afterEach(() => {
  registerUIAdapter(null);
});

describe("AdapterProvider", () => {
  it("useAdapter возвращает Context-адаптер", () => {
    const { Probe, calls } = capture(() => useAdapter());
    render(
      <AdapterProvider adapter={adapterA}>
        <Probe />
      </AdapterProvider>
    );
    expect(calls[0]).toBe(adapterA);
  });

  it("useAdapter: Context побеждает над global registry", () => {
    registerUIAdapter(adapterB);
    const { Probe, calls } = capture(() => useAdapter());
    render(
      <AdapterProvider adapter={adapterA}>
        <Probe />
      </AdapterProvider>
    );
    expect(calls[0]).toBe(adapterA);
  });

  it("useAdapter: fallback на global когда Provider отсутствует", () => {
    registerUIAdapter(adapterB);
    const { Probe, calls } = capture(() => useAdapter());
    render(<Probe />);
    expect(calls[0]).toBe(adapterB);
  });

  it("useAdapterComponent возвращает компонент из Context", () => {
    const { Probe, calls } = capture(() => useAdapterComponent("parameter", "text"));
    render(
      <AdapterProvider adapter={adapterA}>
        <Probe />
      </AdapterProvider>
    );
    expect(typeof calls[0]).toBe("function");
    expect(calls[0]()).toBe("A-text");
  });

  it("useAdapterPick использует affinity scoring", () => {
    const moneyFn = () => "money";
    moneyFn.affinity = { roles: ["price"] };
    const adapter = {
      name: "score",
      parameter: { text: () => "plain", number: moneyFn },
    };
    const { Probe, calls } = capture(
      () => useAdapterPick("parameter", { type: "text", fieldRole: "price" })
    );
    render(
      <AdapterProvider adapter={adapter}>
        <Probe />
      </AdapterProvider>
    );
    expect(calls[0]).toBe(moneyFn);
  });

  it("resolveAdapterComponent — прямой lookup без Provider", () => {
    const comp = resolveAdapterComponent("parameter", "text", adapterA);
    expect(typeof comp).toBe("function");
    expect(comp()).toBe("A-text");
  });

  it("resolveAdapterComponent: без adapter → fallback на global", () => {
    registerUIAdapter(adapterB);
    const comp = resolveAdapterComponent("parameter", "text");
    expect(comp()).toBe("B-text");
  });
});
