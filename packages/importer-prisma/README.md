# @intent-driven/importer-prisma

Prisma schema (`.prisma`) → IDF ontology.

```js
import { importPrisma } from "@intent-driven/importer-prisma";
import fs from "node:fs/promises";

const source = await fs.readFile("schema.prisma", "utf8");
const ontology = importPrisma(source);
```

Через CLI:

```bash
idf import prisma --file prisma/schema.prisma --out src/domains/default/ontology.js
```
