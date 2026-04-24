// @vitest-environment jsdom
//
// G-K-12 renderer follow-up: FormModal должен dispatch'нуться на
// Wizard primitive когда spec.bodyOverride.type === "wizard".
// Без этого core PR #275 (passthrough authored bodyOverride) не имеет
// render effect — modal продолжает рендерить flat parameters list.
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import FormModal from "./FormModal.jsx";

afterEach(cleanup);

const wizardSpec = {
  type: "formModal",
  key: "overlay_updateRealm",
  intentId: "updateRealm",
  title: "Обновить realm",
  parameters: [
    { name: "realmId", type: "text", required: true },
  ],
  bodyOverride: {
    type: "wizard",
    steps: [
      {
        id: "basic",
        title: "Основное",
        fields: [
          { name: "displayName", type: "text", label: "Display Name" },
        ],
      },
      {
        id: "tokens",
        title: "Токены",
        fields: [
          { name: "accessTokenLifespan", type: "number", label: "Token TTL" },
        ],
      },
    ],
  },
};

const flatSpec = {
  type: "formModal",
  key: "overlay_updateUser",
  intentId: "updateUser",
  title: "Обновить user",
  parameters: [
    { name: "userId", type: "text", required: true },
    { name: "username", type: "text", label: "Имя", editable: true },
  ],
};

describe("G-K-12: FormModal dispatch на Wizard primitive при bodyOverride", () => {
  it("без bodyOverride — рендерит flat parameters list (старое поведение)", () => {
    render(<FormModal spec={flatSpec} ctx={{ exec: () => {} }} overlayContext={{}} onClose={() => {}} />);
    // Title visible
    expect(screen.getByText("Обновить user")).toBeTruthy();
    // Wizard step titles НЕ должны быть
    expect(screen.queryByText("Основное")).toBeNull();
    expect(screen.queryByText("Токены")).toBeNull();
  });

  it("bodyOverride.type:'wizard' — рендерит Wizard primitive со steps", () => {
    render(<FormModal spec={wizardSpec} ctx={{ exec: () => {} }} overlayContext={{}} onClose={() => {}} />);
    // ModalShell title
    expect(screen.getByText("Обновить realm")).toBeTruthy();
    // Wizard рендерит первый step (Основное) + breadcrumb всех steps
    expect(screen.getByText("Основное")).toBeTruthy();
    // Token step появляется в breadcrumb (но содержимое только active step)
    expect(screen.getAllByText("Токены").length).toBeGreaterThanOrEqual(1);
  });

  it("bodyOverride.type:'tabbedForm' — рендерит TabbedForm-like UI (или fallback на flat)", () => {
    const tabbedSpec = {
      ...flatSpec,
      bodyOverride: {
        type: "tabbedForm",
        tabs: [
          { id: "general", title: "General", fields: [{ name: "username" }] },
          { id: "security", title: "Security", fields: [{ name: "enabled" }] },
        ],
      },
    };
    render(<FormModal spec={tabbedSpec} ctx={{ exec: () => {} }} overlayContext={{}} onClose={() => {}} />);
    // Title visible
    expect(screen.getByText("Обновить user")).toBeTruthy();
    // Tabs visible (titles)
    expect(screen.getByText("General")).toBeTruthy();
    expect(screen.getByText("Security")).toBeTruthy();
  });

  it("неизвестный bodyOverride.type — fallback на flat parameters", () => {
    const unknownSpec = {
      ...flatSpec,
      bodyOverride: { type: "unknownPrimitive", x: 1 },
    };
    render(<FormModal spec={unknownSpec} ctx={{ exec: () => {} }} overlayContext={{}} onClose={() => {}} />);
    expect(screen.getByText("Обновить user")).toBeTruthy();
  });
});
