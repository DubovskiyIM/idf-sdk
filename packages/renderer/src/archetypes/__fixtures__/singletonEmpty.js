/**
 * Fixture для singleton empty-state тестов.
 * Minimal Wallet ontology + top_up intent + customer viewer.
 */
export const WALLET_ONTOLOGY = {
  entities: {
    Wallet: {
      kind: "internal",
      fields: {
        id: { type: "id" },
        userId: { type: "entityRef", entity: "User" },
        balance: { type: "number" },
      },
      ownerField: "userId",
    },
    User: {
      kind: "internal",
      fields: {
        id: { type: "id" },
        name: { type: "text" },
        role: { type: "text" },
      },
    },
  },
};

export const TOP_UP_INTENT = {
  id: "top_up_wallet_by_card",
  name: "Пополнить баланс",
  α: "add",
  irreversibility: "medium",
  control: "formModal",
  parameters: [
    { name: "amount", type: "number", required: true, label: "Сумма" },
  ],
  particles: {
    entities: ["wallet: Wallet"],
    effects: [
      { α: "replace", target: "wallet.balance" },
      { α: "add", target: "transactions", σ: "account" },
    ],
  },
};

export const UNVERIFIED_INTENT = {
  id: "activate_profile",
  α: "add",
  particles: {
    conditions: ["user.verified = true"],
    effects: [
      { α: "add", target: "profiles", σ: "account" },
    ],
  },
};

export const WALLET_SINGLETON_PROJECTION = {
  name: "Мой кошелёк",
  kind: "detail",
  mainEntity: "Wallet",
  singleton: true,
};

export const CUSTOMER = { id: "user-1", name: "Customer", role: "customer" };
export const EMPTY_WORLD = { wallets: [], users: [CUSTOMER] };
