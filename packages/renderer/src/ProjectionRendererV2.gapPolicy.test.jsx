// @vitest-environment jsdom
//
// Reader integrations Step 2 — pixels gap policy observability.
// ProjectionRendererV2 декларирует pixels gap policy и сообщает
// наблюдённый canonical gap-set через onGapsObserved-callback.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import ProjectionRendererV2 from "./ProjectionRendererV2.jsx";
import { DEFAULT_READER_POLICIES, detectReaderEquivalenceDrift } from "@intent-driven/core";

afterEach(cleanup);

const minimalArtifact = {
  projection: "test_list",
  archetype: "catalog",
  mainEntity: "Task",
  slots: {
    header: [], toolbar: [], hero: [],
    body: { type: "list", items: [] },
    context: [], fab: [], overlay: [],
  },
  nav: { outgoing: [], incoming: [] },
};

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

const fullWorld = {
  Task: [{ id: "t1", title: "Hi", priority: "high", status: "open" }],
};

const legacyWorld = {
  Task: [{ id: "t1", title: "Hi", status: "open" }], // missing priority
};

describe("ProjectionRendererV2 — pixels gap policy observability", () => {
  it("calls onGapsObserved with default pixels policy and empty cells on full world", () => {
    const onGapsObserved = vi.fn();
    render(
      <ProjectionRendererV2
        artifact={minimalArtifact}
        world={fullWorld}
        ontology={ontology}
        onGapsObserved={onGapsObserved}
        exec={() => {}}
      />,
    );
    expect(onGapsObserved).toHaveBeenCalled();
    const call = onGapsObserved.mock.calls[0][0];
    expect(call.reader).toBe("pixels");
    expect(call.policy).toEqual(DEFAULT_READER_POLICIES.pixels);
    expect(call.gapCells).toEqual([]);
  });

  it("reports gapCells on legacy world (missing priority field)", () => {
    const onGapsObserved = vi.fn();
    render(
      <ProjectionRendererV2
        artifact={minimalArtifact}
        world={legacyWorld}
        ontology={ontology}
        onGapsObserved={onGapsObserved}
        exec={() => {}}
      />,
    );
    const call = onGapsObserved.mock.calls.at(-1)[0];
    expect(call.gapCells).toHaveLength(1);
    expect(call.gapCells[0]).toMatchObject({
      entity: "Task",
      entityId: "t1",
      field: "priority",
      kind: "missingField",
    });
  });

  it("respects gapPolicy override prop", () => {
    const onGapsObserved = vi.fn();
    const customPolicy = {
      missingField: "error",
      unknownEnumValue: "error",
      removedEntityRef: "error",
    };
    render(
      <ProjectionRendererV2
        artifact={minimalArtifact}
        world={fullWorld}
        ontology={ontology}
        gapPolicy={customPolicy}
        onGapsObserved={onGapsObserved}
        exec={() => {}}
      />,
    );
    const call = onGapsObserved.mock.calls[0][0];
    expect(call.policy).toEqual(customPolicy);
  });

  it("does not throw when ontology not provided", () => {
    const onGapsObserved = vi.fn();
    expect(() =>
      render(
        <ProjectionRendererV2
          artifact={minimalArtifact}
          world={fullWorld}
          onGapsObserved={onGapsObserved}
          exec={() => {}}
        />,
      ),
    ).not.toThrow();
    const call = onGapsObserved.mock.calls[0][0];
    expect(call.gapCells).toEqual([]);
  });

  it("does not call callback if onGapsObserved prop omitted", () => {
    expect(() =>
      render(
        <ProjectionRendererV2
          artifact={minimalArtifact}
          world={fullWorld}
          ontology={ontology}
          exec={() => {}}
        />,
      ),
    ).not.toThrow();
  });

  it("integrates with detectReaderEquivalenceDrift", () => {
    const calls = [];
    const onGapsObserved = (obs) => calls.push(obs);
    render(
      <ProjectionRendererV2
        artifact={minimalArtifact}
        world={legacyWorld}
        ontology={ontology}
        onGapsObserved={onGapsObserved}
        exec={() => {}}
      />,
    );

    // Симулируем второй reader (например voice), который видит тот же gap
    const voiceObs = { reader: "voice", gapCells: calls[0].gapCells };
    const pixelsObs = { reader: "pixels", gapCells: calls[0].gapCells };

    const report = detectReaderEquivalenceDrift(legacyWorld, ontology, [pixelsObs, voiceObs]);
    expect(report.equivalent).toBe(true);
  });
});
