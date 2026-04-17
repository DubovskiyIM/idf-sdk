/**
 * Falsification tests — проверка shouldMatch/shouldNotMatch для всех 10 stable-паттернов.
 * Domain fixtures — минимальные inline-данные из реальных доменов.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createRegistry, loadStablePatterns } from "./registry.js";

const DOMAINS = {
  planning: {
    ontology: {
      entities: {
        Poll: {
          fields: { id: { type: "text" }, title: { type: "text" }, status: { type: "select", options: ["draft", "open", "closed", "resolved", "cancelled"] }, deadline: { type: "datetime" } },
          statuses: ["draft", "open", "closed", "resolved", "cancelled"],
          ownerField: "organizerId",
        },
        TimeOption: { fields: { id: { type: "text" }, pollId: { type: "text" }, date: { type: "datetime" } } },
        Participant: { fields: { id: { type: "text" }, pollId: { type: "text" }, name: { type: "text" } } },
        Vote: { fields: { id: { type: "text" }, pollId: { type: "text" }, participantId: { type: "text" } } },
      },
    },
    intents: {
      create_poll: { creates: "Poll(draft)", particles: { confirmation: "click", entities: ["poll: Poll"], effects: [{ α: "add", target: "polls" }] } },
      open_poll: { particles: { entities: ["poll: Poll"], effects: [{ α: "replace", target: "poll.status", value: "open" }] } },
      close_poll: { particles: { entities: ["poll: Poll"], effects: [{ α: "replace", target: "poll.status", value: "closed" }] } },
      resolve_poll: { particles: { entities: ["poll: Poll"], effects: [{ α: "replace", target: "poll.status", value: "resolved" }] } },
      cancel_poll: { irreversibility: "high", particles: { entities: ["poll: Poll"], effects: [{ α: "replace", target: "poll.status", value: "cancelled" }] } },
      add_time_option: { creates: "TimeOption", particles: { entities: ["o: TimeOption", "poll: Poll"], effects: [{ α: "add", target: "options" }] } },
      invite_participant: { creates: "Participant", particles: { entities: ["p: Participant", "poll: Poll"], effects: [{ α: "add", target: "participants" }] } },
      vote_yes: { creates: "Vote(yes)", particles: { confirmation: "click", entities: ["v: Vote", "poll: Poll"], effects: [{ α: "add", target: "votes" }] } },
      vote_no: { creates: "Vote(no)", particles: { confirmation: "click", entities: ["v: Vote", "poll: Poll"], effects: [{ α: "add", target: "votes" }] } },
      vote_maybe: { creates: "Vote(maybe)", particles: { confirmation: "click", entities: ["v: Vote", "poll: Poll"], effects: [{ α: "add", target: "votes" }] } },
      set_deadline: { parameters: [{ name: "deadline", type: "datetime" }], particles: { entities: ["poll: Poll"], effects: [{ α: "replace", target: "poll.deadline" }] } },
    },
    projections: {
      my_polls: { kind: "catalog", mainEntity: "Poll" },
      poll_overview: { kind: "detail", mainEntity: "Poll", idParam: "pollId" },
    },
  },
  invest: {
    ontology: {
      entities: {
        Portfolio: {
          ownerField: "userId",
          fields: { id: { type: "text" }, name: { type: "text" }, totalValue: { type: "number", fieldRole: "money" }, pnl: { type: "number", fieldRole: "money" }, targetStocks: { type: "number", fieldRole: "percentage" }, riskProfile: { type: "select", options: ["conservative", "balanced", "aggressive"] } },
        },
        Position: { fields: { id: { type: "text" }, portfolioId: { type: "text" }, quantity: { type: "number" } } },
        Transaction: { fields: { id: { type: "text" }, portfolioId: { type: "text" }, total: { type: "number", fieldRole: "money" } } },
        Goal: { ownerField: "userId", fields: { id: { type: "text" }, name: { type: "text" } } },
      },
      roles: {
        agent: { base: "agent", preapproval: { entity: "AgentPreapproval" } },
        advisor: { base: "owner", scope: { User: { via: "assignments", viewerField: "advisorId" } } },
      },
    },
    intents: {
      create_portfolio: { creates: "Portfolio", heroCreate: true, particles: { entities: ["p: Portfolio"], effects: [{ α: "add", target: "portfolios" }] } },
      create_goal: { creates: "Goal", heroCreate: true, particles: { entities: ["g: Goal"], effects: [{ α: "add", target: "goals" }] } },
      rename_portfolio: { particles: { entities: ["p: Portfolio"], effects: [{ α: "replace", target: "portfolio.name" }] } },
      archive_portfolio: { irreversibility: "high", particles: { entities: ["p: Portfolio"], effects: [{ α: "remove", target: "portfolios" }] } },
      set_target_allocation: { parameters: [{ name: "stocks" }, { name: "bonds" }, { name: "crypto" }, { name: "exotic" }], particles: { entities: ["p: Portfolio"], effects: [{ α: "replace", target: "portfolio.targetStocks" }] } },
    },
    projections: {
      portfolios_root: { kind: "catalog", mainEntity: "Portfolio" },
      goals_root: { kind: "catalog", mainEntity: "Goal" },
      portfolio_detail: { kind: "detail", mainEntity: "Portfolio", idParam: "portfolioId" },
    },
  },
  messenger: {
    ontology: {
      entities: {
        Conversation: { fields: { id: { type: "text" }, title: { type: "text" } } },
        Message: { fields: { id: { type: "text" }, content: { type: "textarea" }, senderId: { type: "text" } } },
      },
    },
    intents: {
      send_message: { creates: "Message", particles: { confirmation: "enter", entities: ["msg: Message"], effects: [{ α: "add", target: "messages" }] } },
      pin_message: { antagonist: "unpin_message", particles: { entities: ["msg: Message"], effects: [{ α: "replace", target: "message.pinned" }] } },
      unpin_message: { antagonist: "pin_message", particles: { entities: ["msg: Message"], effects: [{ α: "replace", target: "message.pinned" }] } },
      search_conversations: { particles: { entities: [], witnesses: ["query", "results"], effects: [] } },
    },
    projections: {
      conversations_list: { kind: "catalog", mainEntity: "Conversation" },
      chat_view: { kind: "feed", mainEntity: "Message" },
    },
  },
  sales: {
    ontology: {
      entities: {
        Listing: { fields: { id: { type: "text" }, title: { type: "text" }, images: { type: "multiImage" }, currentPrice: { type: "number", fieldRole: "money" }, status: { type: "select", options: ["draft", "active", "sold", "cancelled"] } } },
        Bid: { fields: { id: { type: "text" }, listingId: { type: "text" }, amount: { type: "number", fieldRole: "money" } } },
      },
    },
    intents: {
      create_listing: { creates: "Listing(draft)", particles: { confirmation: "enter", entities: ["l: Listing"], effects: [{ α: "add", target: "listings" }] } },
    },
    projections: {
      listing_feed: { kind: "catalog", mainEntity: "Listing" },
      listing_detail: { kind: "detail", mainEntity: "Listing", idParam: "listingId" },
    },
  },
};

function intentsFor(domain, projId) {
  const d = DOMAINS[domain];
  const proj = d.projections[projId];
  return Object.entries(d.intents)
    .filter(([, i]) => {
      const entities = (i.particles?.entities || []).map(e => e.split(":").pop().trim().replace(/\[\]$/, ""));
      // Включаем intent если: нет mainEntity, entity matches, ИЛИ entities пустые (projection-level utilities)
      return !proj.mainEntity || entities.includes(proj.mainEntity) || entities.length === 0;
    })
    .map(([id, i]) => ({ id, ...i }));
}

function match(domain, projId, registry) {
  const d = DOMAINS[domain];
  return registry.matchPatterns(intentsFor(domain, projId), d.ontology, d.projections[projId]);
}

describe("Pattern Bank Falsification", () => {
  let registry;
  beforeAll(() => {
    registry = createRegistry();
    loadStablePatterns(registry);
  });

  it("13 stable patterns loaded", () => {
    expect(registry.getAllPatterns("stable").length).toBe(13);
  });

  // ─── hero-create ───
  describe("hero-create", () => {
    it("shouldMatch: invest/goals_root", () => {
      expect(match("invest", "goals_root", registry).some(p => p.id === "hero-create")).toBe(true);
    });
    it("shouldNotMatch: invest/portfolio_detail", () => {
      expect(match("invest", "portfolio_detail", registry).some(p => p.id === "hero-create")).toBe(false);
    });
  });

  // ─── phase-aware-primary-cta ───
  describe("phase-aware-primary-cta", () => {
    it("shouldMatch: planning/poll_overview", () => {
      expect(match("planning", "poll_overview", registry).some(p => p.id === "phase-aware-primary-cta")).toBe(true);
    });
    it("shouldNotMatch: invest/portfolio_detail", () => {
      expect(match("invest", "portfolio_detail", registry).some(p => p.id === "phase-aware-primary-cta")).toBe(false);
    });
  });

  // ─── subcollections ───
  describe("subcollections", () => {
    it("shouldMatch: planning/poll_overview", () => {
      expect(match("planning", "poll_overview", registry).some(p => p.id === "subcollections")).toBe(true);
    });
    it("shouldMatch: invest/portfolio_detail", () => {
      expect(match("invest", "portfolio_detail", registry).some(p => p.id === "subcollections")).toBe(true);
    });
    it("shouldNotMatch: invest/portfolios_root", () => {
      expect(match("invest", "portfolios_root", registry).some(p => p.id === "subcollections")).toBe(false);
    });
  });

  // ─── irreversible-confirm ───
  describe("irreversible-confirm", () => {
    it("shouldMatch: planning/poll_overview", () => {
      expect(match("planning", "poll_overview", registry).some(p => p.id === "irreversible-confirm")).toBe(true);
    });
    it("shouldMatch: invest/portfolio_detail", () => {
      expect(match("invest", "portfolio_detail", registry).some(p => p.id === "irreversible-confirm")).toBe(true);
    });
    it("shouldNotMatch: invest/goals_root", () => {
      expect(match("invest", "goals_root", registry).some(p => p.id === "irreversible-confirm")).toBe(false);
    });
  });

  // ─── grid-card-layout ───
  describe("grid-card-layout", () => {
    it("shouldMatch: invest/portfolios_root", () => {
      expect(match("invest", "portfolios_root", registry).some(p => p.id === "grid-card-layout")).toBe(true);
    });
    it("shouldMatch: sales/listing_feed", () => {
      expect(match("sales", "listing_feed", registry).some(p => p.id === "grid-card-layout")).toBe(true);
    });
    it("shouldNotMatch: planning/my_polls", () => {
      expect(match("planning", "my_polls", registry).some(p => p.id === "grid-card-layout")).toBe(false);
    });
  });

  // ─── inline-search ───
  describe("inline-search", () => {
    it("shouldMatch: messenger/conversations_list", () => {
      expect(match("messenger", "conversations_list", registry).some(p => p.id === "inline-search")).toBe(true);
    });
    it("shouldNotMatch: invest/portfolios_root", () => {
      expect(match("invest", "portfolios_root", registry).some(p => p.id === "inline-search")).toBe(false);
    });
  });

  // ─── composer-entry ───
  describe("composer-entry", () => {
    it("shouldMatch: messenger/chat_view", () => {
      expect(match("messenger", "chat_view", registry).some(p => p.id === "composer-entry")).toBe(true);
    });
    it("shouldNotMatch: planning/my_polls", () => {
      expect(match("planning", "my_polls", registry).some(p => p.id === "composer-entry")).toBe(false);
    });
  });

  // ─── antagonist-toggle ───
  describe("antagonist-toggle", () => {
    it("shouldMatch: messenger/chat_view", () => {
      expect(match("messenger", "chat_view", registry).some(p => p.id === "antagonist-toggle")).toBe(true);
    });
    it("shouldNotMatch: invest/portfolios_root", () => {
      expect(match("invest", "portfolios_root", registry).some(p => p.id === "antagonist-toggle")).toBe(false);
    });
  });

  // ─── vote-group ───
  describe("vote-group", () => {
    it("shouldMatch: planning/poll_overview", () => {
      expect(match("planning", "poll_overview", registry).some(p => p.id === "vote-group")).toBe(true);
    });
    it("shouldNotMatch: invest/portfolio_detail", () => {
      expect(match("invest", "portfolio_detail", registry).some(p => p.id === "vote-group")).toBe(false);
    });
  });

  // ─── footer-inline-setter ───
  describe("footer-inline-setter", () => {
    it("shouldMatch: planning/poll_overview", () => {
      expect(match("planning", "poll_overview", registry).some(p => p.id === "footer-inline-setter")).toBe(true);
    });
    it("shouldNotMatch: invest/portfolio_detail", () => {
      expect(match("invest", "portfolio_detail", registry).some(p => p.id === "footer-inline-setter")).toBe(false);
    });
  });

  // ─── hierarchy-tree-nav (Gravitino) ───
  describe("hierarchy-tree-nav", () => {
    it("shouldMatch: workflow/workflow_detail (3-level: Workflow→Node→NodeResult)", () => {
      // Добавляем workflow domain inline
      const wfOntology = {
        entities: {
          Workflow: { fields: { id: { type: "text" }, name: { type: "text" } } },
          Node: { fields: { id: { type: "text" }, workflowId: { type: "text" }, type: { type: "select" } } },
          Edge: { fields: { id: { type: "text" }, workflowId: { type: "text" } } },
          NodeResult: { fields: { id: { type: "text" }, nodeId: { type: "text" }, status: { type: "select" } } },
        },
      };
      const intents = [{ id: "view", particles: { entities: ["w: Workflow"], effects: [] } }];
      const matched = registry.matchPatterns(intents, wfOntology, { kind: "detail", mainEntity: "Workflow" });
      expect(matched.some(p => p.id === "hierarchy-tree-nav")).toBe(true);
    });
    it("shouldNotMatch: messenger/chat_view (flat)", () => {
      expect(match("messenger", "chat_view", registry).some(p => p.id === "hierarchy-tree-nav")).toBe(false);
    });
  });

  // ─── discriminator-wizard (Gravitino) ───
  describe("discriminator-wizard", () => {
    it("shouldNotMatch: planning/my_polls (Poll нет discriminator)", () => {
      expect(match("planning", "my_polls", registry).some(p => p.id === "discriminator-wizard")).toBe(false);
    });
    it("shouldMatch: catalog with type select ≥2", () => {
      const ontology = {
        entities: {
          Catalog: { fields: { name: { type: "text" }, type: { type: "select", options: ["relational", "messaging", "fileset"] } } },
        },
      };
      const intents = [{ id: "create_catalog", creates: "Catalog", particles: { entities: ["c: Catalog"], effects: [{ α: "add", target: "catalogs" }] } }];
      const matched = registry.matchPatterns(intents, ontology, { kind: "catalog", mainEntity: "Catalog" });
      expect(matched.some(p => p.id === "discriminator-wizard")).toBe(true);
    });
  });

  // ─── m2m-attach-dialog (Gravitino) ───
  describe("m2m-attach-dialog", () => {
    it("shouldMatch: invest/portfolio_detail (advisor scope via assignments)", () => {
      expect(match("invest", "portfolio_detail", registry).some(p => p.id === "m2m-attach-dialog")).toBe(true);
    });
    it("shouldNotMatch: planning/poll_overview (1:N, не m2m)", () => {
      expect(match("planning", "poll_overview", registry).some(p => p.id === "m2m-attach-dialog")).toBe(false);
    });
  });
});
