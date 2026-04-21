import React from "react";
import { MantineProvider } from "@mantine/core";
import { ProjectionRendererV2, registerUIAdapter } from "@intent-driven/renderer";
import { mantineAdapter } from "@intent-driven/adapter-mantine";
import { crystallizeV2 } from "@intent-driven/core";
import { useHttpEngine } from "@intent-driven/effect-runner-http/react";
import { ontology } from "./domains/default/ontology.js";
import { config } from "./config.js";
import "@mantine/core/styles.css";

registerUIAdapter("mantine", mantineAdapter);

const artifacts = crystallizeV2(ontology);

export function App() {
  const firstProjection = Object.values(artifacts.projections)[0];
  const { world, run, drafts, error } = useHttpEngine({
    ontology,
    apiUrl: config.apiUrl,
  });

  return (
    <MantineProvider>
      <div style={{ padding: 16, fontFamily: "system-ui" }}>
        <h1>{config.projectName}</h1>
        <p>
          UI-kit: <code>{config.uiKit}</code> · API: <code>{config.apiUrl}</code>
        </p>
        {error && (
          <div style={{ padding: 8, background: "#fee", color: "#900", marginBottom: 12 }}>
            Error: {error}
          </div>
        )}
        <ProjectionRendererV2
          artifact={firstProjection}
          world={world}
          uiKit={config.uiKit}
          onIntent={(intentName, params) => run(intentName, params)}
        />
      </div>
    </MantineProvider>
  );
}
