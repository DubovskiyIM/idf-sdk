// PatternPreviewOverlay.test.jsx
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PatternPreviewOverlay from "./PatternPreviewOverlay.jsx";

describe("PatternPreviewOverlay — preview (default)", () => {
  it("renders dashed border + badge with patternId", () => {
    const html = renderToStaticMarkup(
      <PatternPreviewOverlay patternId="subcollections">
        <div>child</div>
      </PatternPreviewOverlay>,
    );
    expect(html).toContain("pattern: subcollections");
    expect(html).toContain("dashed");
    expect(html).toContain("child");
  });
});

describe("PatternPreviewOverlay — xray", () => {
  it("renders xray label + popover with witness requirements", () => {
    const html = renderToStaticMarkup(
      <PatternPreviewOverlay
        mode="xray"
        patternId="subcollections"
        attribution={{ action: "added", path: "sections[2]" }}
        witness={{
          requirements: [
            { kind: "has-fk", ok: true, spec: { fk: "dealId" } },
            { kind: "no-existing", ok: true },
          ],
        }}
      >
        <div>child</div>
      </PatternPreviewOverlay>,
    );
    expect(html).toContain("xray: subcollections");
    expect(html).toContain("has-fk");
    expect(html).toContain("data-pattern-overlay=\"xray\"");
  });

  it("renders Open in Graph3D link when graphLink prop given", () => {
    const html = renderToStaticMarkup(
      <PatternPreviewOverlay
        mode="xray"
        patternId="subcollections"
        attribution={{ action: "added", path: "sections[0]" }}
        graphLink="/studio#graph/focus?domain=freelance&pattern=subcollections"
      >
        <div />
      </PatternPreviewOverlay>,
    );
    expect(html).toContain("Open in Graph3D");
    expect(html).toContain("freelance");
  });
});
