# @intent-driven/importer-openapi

OpenAPI 3.x spec → IDF ontology.

```js
import { importOpenApi, parseSpec } from "@intent-driven/importer-openapi";
import fs from "node:fs/promises";

const spec = parseSpec(await fs.readFile("openapi.yaml", "utf8"));
const ontology = importOpenApi(spec);
```

Через CLI:

```bash
idf import openapi --file openapi.yaml --out src/domains/default/ontology.js
```
