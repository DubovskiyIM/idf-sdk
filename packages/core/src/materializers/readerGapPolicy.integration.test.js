import { describe, it, expect } from "vitest";
import { materializeAsVoice } from "./voiceMaterializer.js";
import { materializeAsDocument } from "./documentMaterializer.js";
import {
  DEFAULT_READER_POLICIES,
  getReaderPolicy,
} from "../readerGapPolicy.js";
import { detectReaderEquivalenceDrift } from "../driftDetector.js";

const ontology = {
  name: "tasks",
  entities: {
    Task: {
      fields: {
        title: { type: "string" },
        priority: { type: "string" },
        status: { type: "enum", values: ["open", "done"] },
      },
    },
  },
};

const projection = { id: "tasks_list", name: "Задачи", kind: "catalog", entity: "Task" };

const fullWorld = {
  Task: [{ id: "t1", title: "Hi", priority: "high", status: "open" }],
};

const legacyWorld = {
  // priority поле отсутствует — legacy effect, эмиттенный до того как priority появилось
  Task: [{ id: "t1", title: "Hi", status: "open" }],
};

describe("voiceMaterializer — gap-policy integration (Phase 4/5)", () => {
  it("declares voice gap policy in meta", () => {
    const out = materializeAsVoice(projection, fullWorld, { id: "u1" }, { ontology });
    expect(out.meta.gapPolicy).toEqual(DEFAULT_READER_POLICIES.voice);
  });

  it("reports empty gapsObserved on full world", () => {
    const out = materializeAsVoice(projection, fullWorld, { id: "u1" }, { ontology });
    expect(out.meta.gapsObserved).toEqual([]);
  });

  it("reports gapsObserved on legacy world (missing priority)", () => {
    const out = materializeAsVoice(projection, legacyWorld, { id: "u1" }, { ontology });
    expect(out.meta.gapsObserved).toHaveLength(1);
    expect(out.meta.gapsObserved[0]).toMatchObject({ entity: "Task", entityId: "t1", field: "priority", kind: "missingField" });
  });

  it("supports gapPolicy override via opts", () => {
    const customPolicy = { missingField: "placeholder", unknownEnumValue: "passthrough", removedEntityRef: "broken-link" };
    const out = materializeAsVoice(projection, fullWorld, { id: "u1" }, { ontology, gapPolicy: customPolicy });
    expect(out.meta.gapPolicy).toEqual(customPolicy);
  });

  it("falls back gracefully when ontology has no entities", () => {
    const out = materializeAsVoice(projection, fullWorld, { id: "u1" }, { ontology: {} });
    expect(out.meta.gapsObserved).toEqual([]);
    expect(out.meta.gapPolicy).toBeDefined();
  });
});

describe("documentMaterializer — gap-policy integration (Phase 4/5)", () => {
  it("declares document gap policy in meta", () => {
    const out = materializeAsDocument(projection, fullWorld, { id: "u1" }, { ontology });
    expect(out.meta.gapPolicy).toEqual(DEFAULT_READER_POLICIES.document);
  });

  it("reports empty gapsObserved on full world", () => {
    const out = materializeAsDocument(projection, fullWorld, { id: "u1" }, { ontology });
    expect(out.meta.gapsObserved).toEqual([]);
  });

  it("reports gapsObserved on legacy world", () => {
    const out = materializeAsDocument(projection, legacyWorld, { id: "u1" }, { ontology });
    expect(out.meta.gapsObserved).toHaveLength(1);
    expect(out.meta.gapsObserved[0].kind).toBe("missingField");
  });

  it("supports gapPolicy override via opts", () => {
    const customPolicy = { missingField: "error", unknownEnumValue: "error", removedEntityRef: "error" };
    const out = materializeAsDocument(projection, fullWorld, { id: "u1" }, { ontology, gapPolicy: customPolicy });
    expect(out.meta.gapPolicy).toEqual(customPolicy);
  });
});

describe("integration with detectReaderEquivalenceDrift", () => {
  it("voice + document outputs feed Layer 4 detector", () => {
    const voice = materializeAsVoice(projection, legacyWorld, { id: "u1" }, { ontology });
    const document = materializeAsDocument(projection, legacyWorld, { id: "u1" }, { ontology });

    const observations = [
      { reader: "voice", gapCells: voice.meta.gapsObserved },
      { reader: "document", gapCells: document.meta.gapsObserved },
    ];

    const report = detectReaderEquivalenceDrift(legacyWorld, ontology, observations);
    // Both readers see the same gap → equivalent
    expect(report.equivalent).toBe(true);
    expect(report.summary.perReaderGapCount).toEqual({ voice: 1, document: 1 });
  });

  it("drift detected when one reader's policy filters out gap (synthetic)", () => {
    const voice = materializeAsVoice(projection, legacyWorld, { id: "u1" }, { ontology });
    // Симулируем багнутый document, который скрывает gap
    const document = materializeAsDocument(projection, legacyWorld, { id: "u1" }, { ontology });
    document.meta.gapsObserved = [];

    const observations = [
      { reader: "voice", gapCells: voice.meta.gapsObserved },
      { reader: "document", gapCells: document.meta.gapsObserved },
    ];

    const report = detectReaderEquivalenceDrift(legacyWorld, ontology, observations);
    expect(report.equivalent).toBe(false);
    expect(report.events[0].agreeing).toEqual(["voice"]);
    expect(report.events[0].disagreeing).toEqual(["document"]);
  });
});
