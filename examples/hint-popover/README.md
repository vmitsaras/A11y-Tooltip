# Native hint popover addon example

Build the package first:

```bash
npm run build:dist
```

Then serve the repository root and open `examples/hint-popover/`.

The example demonstrates `createHintPopoverAddon()` with:

- a tooltip inside an `overflow: hidden` container;
- two hints that exercise the browser's native hint stack;
- a tooltip inside an already-open `popover="auto"`;
- an outside area for light-dismiss behavior.

The addon activates only when both native `popover="hint"` and the CSS Anchor
Positioning features used by A11y Tooltip are supported. Otherwise the ordinary
tooltip implementation remains in place.
