import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { UndoToast } from "./UndoToast.jsx";

afterEach(cleanup);

describe("UndoToast primitive", () => {
  const spec = {
    type: "undoToast",
    intentId: "reject_bid",
    inverseIntentId: "accept_bid",
    windowSec: 5,
    message: "Bid rejected",
  };

  it("не рендерит ничего, если triggered не совпадает с intentId", () => {
    const { container } = render(
      <UndoToast spec={spec} ctx={{}} triggered={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("рендерит toast с message + кнопкой, когда triggered совпадает", () => {
    const { container, getByText } = render(
      <UndoToast spec={spec} ctx={{}} triggered="reject_bid" />
    );
    expect(getByText("Bid rejected")).toBeTruthy();
    expect(getByText("Отменить")).toBeTruthy();
    expect(container.querySelector("[role=\"status\"]")).toBeTruthy();
  });

  it("клик Отменить вызывает ctx.exec(inverseIntentId)", () => {
    const exec = vi.fn();
    const onDismiss = vi.fn();
    const { getByText } = render(
      <UndoToast spec={spec} ctx={{ exec }} triggered="reject_bid" onDismiss={onDismiss} />
    );
    fireEvent.click(getByText("Отменить"));
    expect(exec).toHaveBeenCalledWith("accept_bid", {});
    expect(onDismiss).toHaveBeenCalled();
  });

  it("default message «Действие применено», если spec.message отсутствует", () => {
    const { getByText } = render(
      <UndoToast spec={{ ...spec, message: null }} ctx={{}} triggered="reject_bid" />
    );
    expect(getByText("Действие применено")).toBeTruthy();
  });

  it("windowSec управляет видимым countdown'ом", () => {
    const { getByText } = render(
      <UndoToast spec={{ ...spec, windowSec: 10 }} ctx={{}} triggered="reject_bid" />
    );
    // Начальный counter = windowSec
    expect(getByText("10с")).toBeTruthy();
  });
});
