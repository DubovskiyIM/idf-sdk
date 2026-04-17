// Минимальная фикстура invest-домена для snapshot-теста
// subcollections.structure.apply. Копируем только сущности/интенты/проекцию,
// необходимые для portfolio_detail (ref: ~/WebstormProjects/idf/src/domains/invest/).

export const ontology = {
  entities: {
    User: {
      ownerField: "id",
      fields: { id: { type: "text" }, name: { type: "text" } },
    },
    Portfolio: {
      ownerField: "userId",
      fields: {
        id: { type: "text" },
        userId: { type: "text" },
        name: { type: "text" },
        baseCurrency: { type: "select" },
      },
    },
    Position: {
      ownerField: "userId",
      fields: {
        id: { type: "text" },
        portfolioId: { type: "text" },
        userId: { type: "text" },
        assetId: { type: "text" },
        quantity: { type: "number" },
      },
    },
    Transaction: {
      ownerField: "userId",
      fields: {
        id: { type: "text" },
        portfolioId: { type: "text" },
        userId: { type: "text" },
        assetId: { type: "text" },
        α: { type: "select" },
        quantity: { type: "number" },
      },
    },
    // Asset: reference, не sub-entity. Нет portfolioId — не должна попасть в sections.
    Asset: {
      kind: "reference",
      fields: {
        id: { type: "text" },
        ticker: { type: "text" },
        name: { type: "text" },
      },
    },
    // Goal принадлежит User, не Portfolio — не попадает в sub-entities для Portfolio.
    Goal: {
      ownerField: "userId",
      fields: {
        id: { type: "text" },
        userId: { type: "text" },
        linkedPortfolioId: { type: "text" }, // не "portfolioId" — не по convention
      },
    },
  },
};

export const intents = [
  {
    id: "buy_asset",
    creates: "Transaction",
    particles: { effects: [{ α: "add", target: "transactions" }] },
  },
  {
    id: "sell_asset",
    creates: "Transaction",
    particles: { effects: [{ α: "add", target: "transactions" }] },
  },
  {
    id: "set_stop_loss",
    particles: { effects: [{ α: "replace", target: "position.stopLoss" }] },
  },
];

// Проекция без subCollections — apply должен сам вывести из онтологии.
export const projections = {
  portfolio_detail: {
    name: "Портфель",
    kind: "detail",
    mainEntity: "Portfolio",
    idParam: "portfolioId",
    entities: ["Portfolio"],
    witnesses: ["name", "baseCurrency"],
    // Оригинальные subCollections: positions + transactions
    __originalSectionIds: ["positions", "transactions"],
  },
};
