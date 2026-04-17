// Минимальная фикстура sales: listing_detail + seller_profile.
// listing_detail: apply через convention listingId найдёт Bid, Order,
// Watchlist, Message — 4 sub-entity, explicit только Bid. Expected gap.
// seller_profile: mainEntity=User, explicit использует sellerId/targetUserId —
// non-convention. Apply найдёт только Watchlist (userId). Expected gap.

export const ontology = {
  entities: {
    User: {
      ownerField: "id",
      fields: {
        id: { type: "text" },
        name: { type: "text" },
        bio: { type: "text" },
      },
    },
    Listing: {
      ownerField: "sellerId",
      fields: {
        id: { type: "text" },
        sellerId: { type: "text" },
        title: { type: "text" },
        status: { type: "select" },
      },
    },
    Bid: {
      ownerField: "bidderId",
      fields: {
        id: { type: "text" },
        listingId: { type: "text" },
        bidderId: { type: "text" },
        amount: { type: "number" },
        status: { type: "select" },
      },
    },
    Order: {
      ownerField: "buyerId",
      fields: {
        id: { type: "text" },
        listingId: { type: "text" },
        sellerId: { type: "text" },
        buyerId: { type: "text" },
        status: { type: "select" },
      },
    },
    Review: {
      ownerField: "authorId",
      fields: {
        id: { type: "text" },
        orderId: { type: "text" },
        authorId: { type: "text" },
        targetUserId: { type: "text" },
        rating: { type: "number" },
      },
    },
    Watchlist: {
      ownerField: "userId",
      fields: {
        id: { type: "text" },
        userId: { type: "text" },
        listingId: { type: "text" },
      },
    },
    Message: {
      ownerField: "senderId",
      fields: {
        id: { type: "text" },
        senderId: { type: "text" },
        recipientId: { type: "text" },
        listingId: { type: "text" },
        orderId: { type: "text" },
      },
    },
  },
};

export const intents = [
  {
    id: "place_bid",
    creates: "Bid",
    particles: { effects: [{ α: "add", target: "bids" }] },
  },
  {
    id: "add_to_watchlist",
    creates: "Watchlist",
    particles: { effects: [{ α: "add", target: "watchlists" }] },
  },
];

export const projections = {
  listing_detail: {
    name: "Лот",
    kind: "detail",
    mainEntity: "Listing",
    idParam: "listingId",
    entities: ["Listing", "Bid"],
    witnesses: ["title", "status"],
    __originalSectionIds: ["bids"],
  },
  seller_profile: {
    name: "Профиль продавца",
    kind: "detail",
    mainEntity: "User",
    idParam: "userId",
    entities: ["User", "Review", "Listing"],
    witnesses: ["name", "bio"],
    // Оригинальные subCollections использовали sellerId (Listing) и
    // targetUserId (Review) — non-convention foreign keys.
    __originalSectionIds: ["listings", "reviews"],
  },
};
