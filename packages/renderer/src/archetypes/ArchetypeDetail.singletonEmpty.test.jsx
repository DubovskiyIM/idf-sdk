import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ArchetypeDetail from "./ArchetypeDetail.jsx";
import {
  WALLET_ONTOLOGY, TOP_UP_INTENT, WALLET_SINGLETON_PROJECTION,
  CUSTOMER, EMPTY_WORLD,
} from "./__fixtures__/singletonEmpty.js";

function renderDetail({ intents, viewer = CUSTOMER, world = EMPTY_WORLD } = {}) {
  const ctx = {
    world,
    routeParams: {},
    viewer,
    ontology: WALLET_ONTOLOGY,
    intents: intents || { top_up_wallet_by_card: TOP_UP_INTENT },
    exec: () => {},
    navigate: () => {},
  };
  return render(
    <ArchetypeDetail
      slots={{}}
      nav={{ outgoing: [] }}
      ctx={ctx}
      projection={WALLET_SINGLETON_PROJECTION}
    />
  );
}

describe("ArchetypeDetail — singleton empty-state creator", () => {
  it("рендерит CTA creator-intent под EmptyState когда target отсутствует", () => {
    renderDetail();
    expect(screen.getByText(/ещё не создан/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /пополнить баланс/i })).toBeTruthy();
  });
});
