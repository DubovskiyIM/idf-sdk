// @vitest-environment jsdom
//
// G-K-14 (Keycloak dogfood, 2026-04-23): admin-style 2-column layout
// с persistent sidebar tree и body, переключаемым через onSelect.
// Closes требование «дерево слева всегда видимо, клик переключает
// проекцию справа» (Keycloak / Gravitino / Argo / Grafana use-case).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import AdminShell from "./AdminShell.jsx";

afterEach(cleanup);

const sampleTree = [
  {
    id: "realm_list",
    label: "Realms",
    projectionId: "realm_list",
    children: [
      { id: "realm:r_master", label: "master", projectionId: "realm_detail", params: { realmId: "r_master" } },
      {
        id: "realm:r_customer",
        label: "customer-app",
        projectionId: "realm_detail",
        params: { realmId: "r_customer" },
        children: [
          { id: "user_list:r_customer", label: "Users", projectionId: "user_list", params: { realmId: "r_customer" } },
          { id: "group_list:r_customer", label: "Groups", projectionId: "group_list", params: { realmId: "r_customer" } },
        ],
      },
    ],
  },
  { id: "events", label: "Events", projectionId: "event_list" },
];

describe("AdminShell — layout", () => {
  it("рендерит aside (sidebar) и main (body) регионы", () => {
    render(<AdminShell tree={sampleTree} body={<div>BODY</div>} />);
    expect(screen.getByText("BODY")).toBeTruthy();
    expect(screen.getByText("Realms")).toBeTruthy();
    expect(screen.getByText("Events")).toBeTruthy();
  });

  it("показывает все root-узлы tree в sidebar", () => {
    render(<AdminShell tree={sampleTree} body={null} />);
    expect(screen.getByText("Realms")).toBeTruthy();
    expect(screen.getByText("Events")).toBeTruthy();
  });

  it("раскрывает дочерние узлы при наличии children", () => {
    render(<AdminShell tree={sampleTree} body={null} expanded={["realm_list"]} />);
    expect(screen.getByText("master")).toBeTruthy();
    expect(screen.getByText("customer-app")).toBeTruthy();
  });

  it("expanded по умолчанию свёрнут — children не видны", () => {
    render(<AdminShell tree={sampleTree} body={null} />);
    expect(screen.queryByText("master")).toBeNull();
    expect(screen.queryByText("customer-app")).toBeNull();
  });
});

describe("AdminShell — interaction", () => {
  it("click на root-узел вызывает onSelect c projectionId+params", () => {
    const onSelect = vi.fn();
    render(<AdminShell tree={sampleTree} body={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Events"));
    expect(onSelect).toHaveBeenCalledWith({
      projectionId: "event_list",
      params: undefined,
      node: expect.objectContaining({ id: "events", label: "Events" }),
    });
  });

  it("click на child-узел (deep) вызывает onSelect с правильными params", () => {
    const onSelect = vi.fn();
    render(<AdminShell tree={sampleTree} body={null} onSelect={onSelect} expanded={["realm_list", "realm:r_customer"]} />);
    fireEvent.click(screen.getByText("Users"));
    expect(onSelect).toHaveBeenCalledWith({
      projectionId: "user_list",
      params: { realmId: "r_customer" },
      node: expect.objectContaining({ id: "user_list:r_customer" }),
    });
  });

  it("click на узел с children toggle expansion (без onExpand)", () => {
    const { container } = render(<AdminShell tree={sampleTree} body={null} />);
    expect(screen.queryByText("master")).toBeNull();
    fireEvent.click(screen.getByLabelText("expand-realm_list"));
    expect(screen.getByText("master")).toBeTruthy();
  });

  it("currentNodeId — selected node визуально отмечен (data-active)", () => {
    const { container } = render(<AdminShell tree={sampleTree} body={null} currentNodeId="events" />);
    const activeNode = container.querySelector('[data-active="true"]');
    expect(activeNode).toBeTruthy();
    expect(activeNode.textContent).toContain("Events");
  });
});

describe("AdminShell — empty / edge cases", () => {
  it("не падает если tree пустой", () => {
    render(<AdminShell tree={[]} body={<div>BODY</div>} />);
    expect(screen.getByText("BODY")).toBeTruthy();
  });

  it("не падает если body=null", () => {
    render(<AdminShell tree={sampleTree} body={null} />);
    expect(screen.getByText("Realms")).toBeTruthy();
  });
});
