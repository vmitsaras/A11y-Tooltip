# Selector adapter example

Build the package first:

```bash
npm run build:dist
```

Then serve the repository root and open `examples/selector-adapter/`.

The example demonstrates `createSelectorAdapter()` against legacy BEM markup
that does not use A11y Tooltip's default data attributes.

The adapter only resolves markup. The core tooltip still owns validation,
`aria-describedby`, `role="tooltip"`, focus/hover behavior, Escape handling,
lifecycle events, and teardown.
