// @vitest-environment jsdom
import { afterEach, describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import StatusBadge from "./StatusBadge.jsx";

afterEach(cleanup);

describe("StatusBadge", () => {
  it("status=success — зелёный label Success", () => {
    render(<StatusBadge status="success" />);
    expect(screen.getByText(/success/i)).toBeTruthy();
  });

  it("status=failed — красный label Failed", () => {
    render(<StatusBadge status="failed" />);
    expect(screen.getByText(/failed/i)).toBeTruthy();
  });

  it("custom label override", () => {
    render(<StatusBadge status="running" label="In Progress" />);
    expect(screen.getByText(/in progress/i)).toBeTruthy();
  });

  it("неизвестный status — fallback с capitalize", () => {
    render(<StatusBadge status="weird" />);
    expect(screen.getByText(/weird/i)).toBeTruthy();
  });
});
