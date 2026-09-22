# Diagnostics example

Build the package first:

```bash
npm run build:dist
```

Then serve the repository root and open `examples/diagnostics/`.

The page contains intentional integration problems and renders the findings from
`scanTooltips()`.

The diagnostics package is explicit and read-only: it does not initialize,
open, close, repair, persist, or report anything automatically.
