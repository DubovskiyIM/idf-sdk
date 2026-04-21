# @intent-driven/importer-postgres

Postgres schema → IDF ontology.

```js
import { importPostgres } from "@intent-driven/importer-postgres";
const ontology = await importPostgres({ connectionString: process.env.DATABASE_URL });
```

Используется через `@intent-driven/cli`:

```bash
npx @intent-driven/cli import postgres --url $DATABASE_URL --out src/domains/default/ontology.js
```
