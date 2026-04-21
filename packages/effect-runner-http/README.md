# @intent-driven/effect-runner-http

Generic HTTP effect-runner для Intent-Driven Frontend. Преобразует IDF intents в fetch-запросы и делает optimistic fold с rollback'ом.

```js
import { runIntent } from "@intent-driven/effect-runner-http";

const result = await runIntent({
  intent: ontology.intents.createOrder,
  target: ontology.entities.Order,
  params: { title: "New order", total: 100 },
  apiUrl: "http://localhost:4000",
  getAuthToken: () => localStorage.getItem("token"),
});
```

React hook:

```js
import { useHttpEngine } from "@intent-driven/effect-runner-http/react";

function App() {
  const { world, run, drafts } = useHttpEngine({ ontology, apiUrl });
  return <button onClick={() => run("createOrder", { total: 100 })}>Create</button>;
}
```
