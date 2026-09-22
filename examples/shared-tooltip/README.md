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

Experimental modes:

- `?render=hint` requests native `popover="hint"` rendering with anchored
  fallback when unsupported.
- `?semantics=describedby` enables dynamic active-trigger-only
  `aria-describedby` ownership.
- Combine both with
  `?render=hint&semantics=describedby`.

The describedby mode is intentionally experimental until manual assistive-
technology verification covers focus entry, rapid retargeting, Escape
dismissal, and touch exploration.

Motion demo:

- `?motion=move` enables native WAAPI FLIP retarget motion.
- `?motion=move&motionDuration=600` slows the motion for inspection.
- Combine with the experimental modes, for example
  `?render=hint&semantics=describedby&motion=move`.

Motion affects retarget travel only. Content and accessibility state update
immediately, and reduced-motion preferences disable the travel animation.
