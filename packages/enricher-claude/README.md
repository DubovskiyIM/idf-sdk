# @intent-driven/enricher-claude

AI-обогащение IDF ontology через subprocess к локально установленному `claude` CLI.

```js
import { enrich } from "@intent-driven/enricher-claude";

const { enriched, suggestions, cached } = await enrich(rawOntology);
```

Subprocess использует залогиненную `claude` CLI установленную у user'а. Для non-interactive:
`claude -p --bare --append-system-prompt ... --json-schema ...`.

Через CLI:

```bash
idf enrich --in src/domains/default/ontology.js
idf import postgres --url $DATABASE_URL --enrich
```
