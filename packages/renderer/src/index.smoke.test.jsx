import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  ProjectionRendererV2,
  registerUIAdapter,
  getAdaptedComponent,
  archetypes,
  controls,
  primitives,
  Chart,
  validateArtifact,
} from "./index.js";

describe("@idf/renderer public API", () => {
  it("exports ProjectionRendererV2", () => {
    expect(typeof ProjectionRendererV2).toBe("function");
  });

  it("exports adapter registry functions", () => {
    expect(typeof registerUIAdapter).toBe("function");
    expect(typeof getAdaptedComponent).toBe("function");
  });

  it("exports 7 archetypes via namespace", () => {
    expect(archetypes.ArchetypeFeed).toBeDefined();
    expect(archetypes.ArchetypeCatalog).toBeDefined();
    expect(archetypes.ArchetypeDetail).toBeDefined();
    expect(archetypes.ArchetypeForm).toBeDefined();
    expect(archetypes.ArchetypeCanvas).toBeDefined();
    expect(archetypes.ArchetypeDashboard).toBeDefined();
    expect(archetypes.ArchetypeWizard).toBeDefined();
  });

  it("exports controls namespace", () => {
    expect(controls.Composer).toBeDefined();
    expect(controls.FormModal).toBeDefined();
    expect(controls.IntentButton).toBeDefined();
  });

  it("exports Chart primitive", () => {
    expect(typeof Chart).toBe("function");
  });

  it("validateArtifact rejects missing archetype", () => {
    const r = validateArtifact({ projection: "x", slots: {} });
    expect(r.ok).toBe(false);
  });

  it("ProjectionRendererV2 renders placeholder when no artifact", () => {
    const { container } = render(<ProjectionRendererV2 />);
    expect(container.textContent).toMatch(/Нет артефакта/);
  });
});
