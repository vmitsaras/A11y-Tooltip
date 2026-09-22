# Overflow-only addon example

Build the package first:

```bash
npm run build:dist
```

Then serve the repository root and open `examples/overflow-only/`.

The example demonstrates `createOverflowOnlyAddon()` with two file-name
buttons:

- one visually clipped trigger, which can open the tooltip;
- one trigger whose text fits, so visual tooltip opening is canceled.

The addon does not change focus, keyboard behavior, or `aria-describedby`.
It measures only when the tooltip attempts to open and installs no observer.
