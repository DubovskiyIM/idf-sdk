import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

afterEach(cleanup);

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

  it("без creator-intent показывает только EmptyState (no-regression)", () => {
    renderDetail({ intents: {} });
    expect(screen.getByText(/ещё не создан/i)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("non-singleton detail без id — показывает 'Выбери элемент из списка' (no-regression)", () => {
    const projection = { ...WALLET_SINGLETON_PROJECTION, singleton: false, idParam: "walletId" };
    render(
      <ArchetypeDetail
        slots={{}}
        nav={{ outgoing: [] }}
        ctx={{
          world: EMPTY_WORLD, routeParams: {}, viewer: CUSTOMER,
          ontology: WALLET_ONTOLOGY,
          intents: { top_up_wallet_by_card: TOP_UP_INTENT },
          exec: () => {}, navigate: () => {},
        }}
        projection={projection}
      />
    );
    expect(screen.getByText(/выбери элемент/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /пополнить/i })).toBeNull();
  });

  it("creator с particles.conditions на entity-alias — viewer видит CTA на empty-state", () => {
    const intentWithCond = {
      ...TOP_UP_INTENT,
      particles: {
        ...TOP_UP_INTENT.particles,
        conditions: ["wallet.userId = me.id"],
      },
    };
    renderDetail({ intents: { top_up_wallet_by_card: intentWithCond } });
    expect(screen.getByRole("button", { name: /пополнить/i })).toBeTruthy();
  });

  it("permittedFor role-label скрывает CTA от другой роли", () => {
    const intentForExecutor = {
      ...TOP_UP_INTENT,
      permittedFor: "executor",
    };
    renderDetail({
      intents: { top_up_wallet_by_card: intentForExecutor },
      viewer: { ...CUSTOMER, role: "customer" },
    });
    expect(screen.getByText(/ещё не создан/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /пополнить/i })).toBeNull();
  });

  it("permittedFor owner-field (executorId) НЕ фильтрует на empty-state (target нет)", () => {
    const intentWithOwnerField = {
      ...TOP_UP_INTENT,
      permittedFor: "executorId",
    };
    renderDetail({ intents: { top_up_wallet_by_card: intentWithOwnerField } });
    expect(screen.getByRole("button", { name: /пополнить/i })).toBeTruthy();
  });
});
