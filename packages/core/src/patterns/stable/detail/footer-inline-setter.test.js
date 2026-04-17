import { describe, it, expect } from "vitest";
import footerInlineSetter from "./footer-inline-setter.js";

const ontology = {
  entities: {
    Poll: {
      fields: {
        title: { type: "text" },
        deadline: { type: "datetime" },
      },
    },
  },
};

// Helper — intent-фабрика с единственным replace-эффектом на поле mainEntity.
function makeSingleParamReplaceIntent(id, field = "deadline") {
  return {
    id,
    name: id,
    parameters: [{ name: field, type: "datetime" }],
    particles: {
      effects: [{ α: "replace", target: `poll.${field}`, value: { $param: field } }],
      conditions: [{ $eq: [{ $field: "poll.status" }, "open"] }],
    },
  };
}

function makeToolbarItem(intentId, parameters = [{ name: "deadline", control: "datetime" }]) {
  return { type: "intentButton", intentId, parameters };
}

describe("footer-inline-setter.structure.apply", () => {
  it("перемещает single-param replace intent из toolbar в footer", () => {
    const intent = makeSingleParamReplaceIntent("set_deadline");
    const slots = {
      toolbar: [makeToolbarItem("set_deadline")],
      footer: [],
    };
    const result = footerInlineSetter.structure.apply(slots, {
      projection: { mainEntity: "Poll" },
      intents: [intent],
      ontology,
    });
    expect(result.footer).toHaveLength(1);
    expect(result.footer[0]).toEqual({
      intentId: "set_deadline",
      label: "set_deadline",
      conditions: intent.particles.conditions,
      parameters: [{ name: "deadline", control: "datetime" }],
    });
    expect(result.toolbar).toHaveLength(0);
  });

  it("idempotent: если footer уже содержит intent с таким id — no-op", () => {
    const intent = makeSingleParamReplaceIntent("set_deadline");
    const existing = {
      intentId: "set_deadline",
      label: "Установить дедлайн",
      conditions: [],
      parameters: [{ name: "deadline" }],
    };
    const slots = {
      toolbar: [makeToolbarItem("set_deadline")],
      footer: [existing],
    };
    const result = footerInlineSetter.structure.apply(slots, {
      projection: { mainEntity: "Poll" },
      intents: [intent],
      ontology,
    });
    expect(result).toBe(slots);
    expect(result.footer).toHaveLength(1);
    expect(result.footer[0]).toBe(existing);
    expect(result.toolbar).toHaveLength(1);
  });

  it("respects author-override: footer уже имеет запись (projection.footerIntents) → не дублирует", () => {
    // Автор объявил intent через projection.footerIntents; detail-ассамблёр
    // уже положил его в footer. Pattern должен быть no-op.
    const intent = makeSingleParamReplaceIntent("set_deadline");
    const authoredFooterItem = {
      intentId: "set_deadline",
      label: "set_deadline",
      icon: "clock",
      conditions: [],
      parameters: [{ name: "deadline", control: "datetime" }],
    };
    const slots = {
      toolbar: [],
      footer: [authoredFooterItem],
    };
    const result = footerInlineSetter.structure.apply(slots, {
      projection: { mainEntity: "Poll" },
      intents: [intent],
      ontology,
    });
    expect(result).toBe(slots);
    expect(result.footer).toHaveLength(1);
    expect(result.footer[0]).toBe(authoredFooterItem);
  });

  it("не мутирует входной slots (Object.freeze)", () => {
    const intent = makeSingleParamReplaceIntent("set_deadline");
    const toolbar = [makeToolbarItem("set_deadline")];
    const footer = [];
    Object.freeze(toolbar);
    Object.freeze(footer);
    const slots = { toolbar, footer, header: [] };
    Object.freeze(slots);
    expect(() =>
      footerInlineSetter.structure.apply(slots, {
        projection: { mainEntity: "Poll" },
        intents: [intent],
        ontology,
      })
    ).not.toThrow();
    expect(slots.toolbar).toBe(toolbar);
    expect(slots.footer).toBe(footer);
    expect(toolbar).toHaveLength(1);
    expect(footer).toHaveLength(0);
  });

  it("не трогает intents с nested target (entity.sub.field)", () => {
    const nested = {
      id: "set_nested",
      name: "set_nested",
      particles: {
        effects: [{ α: "replace", target: "poll.settings.deadline" }],
      },
    };
    const slots = {
      toolbar: [makeToolbarItem("set_nested")],
      footer: [],
    };
    const result = footerInlineSetter.structure.apply(slots, {
      projection: { mainEntity: "Poll" },
      intents: [nested],
      ontology,
    });
    expect(result).toBe(slots);
    expect(result.footer).toHaveLength(0);
    expect(result.toolbar).toHaveLength(1);
  });

  it("не трогает intents с не-replace эффектом", () => {
    const removeIntent = {
      id: "clear_deadline",
      name: "clear_deadline",
      parameters: [{ name: "deadline" }],
      particles: {
        effects: [{ α: "remove", target: "poll.deadline" }],
      },
    };
    const slots = {
      toolbar: [makeToolbarItem("clear_deadline")],
      footer: [],
    };
    const result = footerInlineSetter.structure.apply(slots, {
      projection: { mainEntity: "Poll" },
      intents: [removeIntent],
      ontology,
    });
    expect(result).toBe(slots);
    expect(result.footer).toHaveLength(0);
    expect(result.toolbar).toHaveLength(1);
  });

  it("добавляет в footer даже если toolbar пуст (intent отфильтрован ownership'ом)", () => {
    const intent = makeSingleParamReplaceIntent("set_deadline");
    const slots = {
      toolbar: [], // intent не дошёл до toolbar (filtered)
      footer: [],
    };
    const result = footerInlineSetter.structure.apply(slots, {
      projection: { mainEntity: "Poll" },
      intents: [intent],
      ontology,
    });
    expect(result.footer).toHaveLength(1);
    expect(result.footer[0].intentId).toBe("set_deadline");
    // Toolbar остаётся пустым — нечего было изымать.
    expect(result.toolbar).toHaveLength(0);
  });

  it("сохраняет остальные toolbar/footer элементы и другие слоты", () => {
    const setter = makeSingleParamReplaceIntent("set_deadline");
    const otherIntent = {
      id: "open_details",
      name: "open_details",
      parameters: [],
      particles: { effects: [] },
    };
    const slots = {
      toolbar: [
        makeToolbarItem("set_deadline"),
        { type: "intentButton", intentId: "open_details" },
      ],
      footer: [
        { intentId: "set_note", label: "set_note", conditions: [], parameters: [] },
      ],
      header: [{ type: "title" }],
      body: { type: "list" },
    };
    const result = footerInlineSetter.structure.apply(slots, {
      projection: { mainEntity: "Poll" },
      intents: [setter, otherIntent],
      ontology,
    });
    // toolbar: сохранён open_details, удалён set_deadline
    expect(result.toolbar).toHaveLength(1);
    expect(result.toolbar[0].intentId).toBe("open_details");
    // footer: authored set_note + новый set_deadline
    expect(result.footer).toHaveLength(2);
    expect(result.footer[0].intentId).toBe("set_note");
    expect(result.footer[1].intentId).toBe("set_deadline");
    // остальные слоты не трогаем по ссылке
    expect(result.header).toBe(slots.header);
    expect(result.body).toBe(slots.body);
  });

  it("пропускает intent без id (нормализация explainMatch могла его потерять)", () => {
    const noId = {
      name: "set_deadline",
      parameters: [{ name: "deadline" }],
      particles: {
        effects: [{ α: "replace", target: "poll.deadline" }],
      },
    };
    const slots = {
      toolbar: [{ type: "intentButton", intentId: undefined }],
      footer: [],
    };
    const result = footerInlineSetter.structure.apply(slots, {
      projection: { mainEntity: "Poll" },
      intents: [noId],
      ontology,
    });
    expect(result).toBe(slots);
  });
});
