# @idf/adapter-mantine

Mantine UI adapter for `@idf/renderer`.

## Usage

```jsx
import { MantineAdapterProvider } from "@idf/adapter-mantine";

<MantineAdapterProvider>
  <App />
</MantineAdapterProvider>
```

CSS files `@mantine/core/styles.css` and `@mantine/dates/styles.css` are imported automatically by the provider.
