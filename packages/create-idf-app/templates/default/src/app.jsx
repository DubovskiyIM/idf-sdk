import React, { useEffect, useState } from "react";
import { MantineProvider } from "@mantine/core";
import { ProjectionRendererV2, registerUIAdapter } from "@intent-driven/renderer";
import { mantineAdapter } from "@intent-driven/adapter-mantine";
import { crystallizeV2 } from "@intent-driven/core";
import { useHttpEngine } from "@intent-driven/effect-runner-http/react";
import { useAuth } from "@intent-driven/auth/react";
import { ontology } from "./domains/default/ontology.js";
import { config } from "./config.js";
import { createAuthProvider } from "./auth.js";
import "@mantine/core/styles.css";

registerUIAdapter("mantine", mantineAdapter);

const artifacts = crystallizeV2(ontology);

export function App() {
  const [authProvider, setAuthProvider] = useState(null);

  useEffect(() => {
    createAuthProvider().then(setAuthProvider);
  }, []);

  const { user, signIn, signOut, loading: authLoading } = useAuth(authProvider);
  const firstProjection = Object.values(artifacts.projections)[0];
  const { world, run, error } = useHttpEngine({
    ontology,
    apiUrl: config.apiUrl,
    authProvider,
  });

  return (
    <MantineProvider>
      <div style={{ padding: 16, fontFamily: "system-ui" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h1>{config.projectName}</h1>
          {authProvider && (
            <div style={{ fontSize: 13 }}>
              {authLoading ? (
                "…"
              ) : user ? (
                <>
                  <span>{user.email ?? user.id}</span>
                  <button onClick={signOut} style={{ marginLeft: 8 }}>Sign out</button>
                </>
              ) : (
                <button onClick={() => {
                  const email = prompt("Email");
                  const password = prompt("Password");
                  if (email && password) signIn({ email, password }).catch((e) => alert(e.message));
                }}>Sign in</button>
              )}
            </div>
          )}
        </header>
        <p style={{ color: "#888", fontSize: 12 }}>
          UI: <code>{config.uiKit}</code> · API: <code>{config.apiUrl}</code> · Auth: <code>{config.authProvider}</code>
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
