// Минимальная фикстура delivery-домена: order_detail + cart (mainEntity=Order).
// Expected gap: apply через convention orderId найдёт OrderItem, Delivery,
// Payment, Review — 4 sub-entity, но explicit subCollections декларирует
// только OrderItem.

export const ontology = {
  entities: {
    Order: {
      ownerField: "customerId",
      fields: {
        id: { type: "text" },
        customerId: { type: "text" },
        merchantId: { type: "text" },
        status: { type: "select" },
        totalAmount: { type: "number" },
      },
    },
    OrderItem: {
      ownerField: "orderId",
      fields: {
        id: { type: "text" },
        orderId: { type: "text" },
        menuItemId: { type: "text" },
        quantity: { type: "number" },
      },
    },
    Delivery: {
      ownerField: "courierId",
      fields: {
        id: { type: "text" },
        orderId: { type: "text" },
        courierId: { type: "text" },
        status: { type: "select" },
      },
    },
    Payment: {
      ownerField: "customerId",
      fields: {
        id: { type: "text" },
        orderId: { type: "text" },
        customerId: { type: "text" },
        amount: { type: "number" },
      },
    },
    Review: {
      ownerField: "customerId",
      fields: {
        id: { type: "text" },
        customerId: { type: "text" },
        orderId: { type: "text" },
        rating: { type: "number" },
      },
    },
  },
};

export const intents = [
  {
    id: "add_order_item",
    creates: "OrderItem",
    particles: { effects: [{ α: "add", target: "orderitems" }] },
  },
  {
    id: "place_order",
    particles: { effects: [{ α: "replace", target: "order.status" }] },
  },
];

export const projections = {
  order_detail: {
    name: "Заказ",
    kind: "detail",
    mainEntity: "Order",
    entities: ["Order", "OrderItem", "Delivery"],
    idParam: "orderId",
    witnesses: ["status", "totalAmount"],
    __originalSectionIds: ["orderitems"],
  },
  cart: {
    name: "Корзина",
    kind: "detail",
    mainEntity: "Order",
    entities: ["Order", "OrderItem", "MenuItem"],
    filter: "item.status === 'draft'",
    witnesses: ["totalAmount", "status"],
    __originalSectionIds: ["orderitems"],
  },
};
