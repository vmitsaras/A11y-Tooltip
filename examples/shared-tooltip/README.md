# Shared tooltip controller example

Build the package first:

```bash
npm run build:dist
```

Then serve the repository root and open `examples/shared-tooltip/`.

The page creates many already-accessibly-named controls and connects them to one
visual-only shared tooltip through `createSharedTooltip()`.

Use `?count=500` to exercise the upper demo density used by the browser tests.

The controller:

- uses delegated focus/pointer events;
- keeps keyboard focus higher priority than pointer hover;
- retargets an open tooltip without hide/show flicker;
- supports triggers inserted after initialization without a MutationObserver;
- does not add or move `aria-describedby`;
- keeps the shared visual tooltip hidden from assistive technology with
  `aria-hidden="true"`.
