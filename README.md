# A11y Tooltip

A small, dependency-free, TypeScript-first tooltip for concise, non-interactive descriptions.

The core follows the tooltip interaction model: focus or hover reveals the description, `Escape` dismisses it without moving focus, and pointer users can move onto the tooltip without making it disappear.

## Status

Early package foundation (`0.1.0`). The public API is intentionally small while browser and assistive-technology verification is expanded.

## Installation

```bash
npm install a11y-tooltip
```

## Usage

```ts
import { createTooltip } from "a11y-tooltip";
import "a11y-tooltip/styles.css";

const root = document.querySelector("[data-a11y-tooltip]");

if (root instanceof HTMLElement) {
  createTooltip(root);
}
```

The package never auto-initializes on import.

## HTML structure

```html
<span class="a11y-tooltip" data-a11y-tooltip data-a11y-tooltip-placement="top">
  <button class="a11y-tooltip__trigger" data-a11y-tooltip-trigger>
    Shipping
  </button>
  <span class="a11y-tooltip__content" data-a11y-tooltip-content>
    Free standard shipping on orders over €50.
  </span>
</span>
```

Before JavaScript runs, the description remains visible as ordinary text. Initialization progressively enhances it into the floating tooltip, adds `role="tooltip"`, and safely appends the tooltip ID to the trigger's existing `aria-describedby` tokens.

## Options

```ts
createTooltip(root, {
  showDelay: 180,
  hideDelay: 100,
  placement: "top",
  closeOnEscape: true
});
```

Equivalent root attributes:

```html
<span
  data-a11y-tooltip
  data-a11y-tooltip-show-delay="250"
  data-a11y-tooltip-hide-delay="100"
  data-a11y-tooltip-placement="bottom"
  data-a11y-tooltip-close-on-escape="true"
>
```

Invalid dataset values fall back to safe defaults.

## Public API

```ts
import {
  A11yTooltip,
  createTooltip,
  initTooltipsAll,
  dataAttributeAdapter,
  tooltipEvents,
  tooltipSelectors
} from "a11y-tooltip";
```

Each instance exposes `open()`, `close()`, `toggle()`, `destroy()`, and `isOpen`. Duplicate initialization of the same root returns the existing instance.

## Lifecycle events

Lifecycle events bubble from the root:

- `a11y-tooltip:init`
- `a11y-tooltip:ready`
- `a11y-tooltip:before-open` — cancelable
- `a11y-tooltip:open`
- `a11y-tooltip:before-close` — cancelable
- `a11y-tooltip:close`
- `a11y-tooltip:destroy`

Event detail includes the instance and, when relevant, the open/close reason.

## Addons

Addons are opt-in hooks with cleanup support.

```ts
import { createTooltip } from "a11y-tooltip";
import { createSingleOpenAddon } from "a11y-tooltip/addons";

const onlyOneOpen = createSingleOpenAddon();

createTooltip(firstRoot, { addons: [onlyOneOpen] });
createTooltip(secondRoot, { addons: [onlyOneOpen] });
```

Custom addons implement `TooltipAddon` and may return a cleanup callback.

## Adapters

The default adapter resolves `data-a11y-tooltip-trigger` and `data-a11y-tooltip-content`. Design systems can supply a custom `TooltipAdapter` to map different markup without changing the core runtime.

## CSS

The default stylesheet uses BEM classes for styling and `data-*` attributes for JavaScript hooks.

Public custom properties use the `--a11y-tooltip-*` prefix. Private implementation variables use the `--_` prefix and are not part of the theming API.

## Accessibility notes

- Use a real, keyboard-focusable trigger.
- Give the trigger an accessible name independent of the tooltip.
- Tooltip content is descriptive and non-interactive.
- Focus stays on the trigger.
- `Escape` dismisses an open tooltip.
- Hover remains active across the trigger and tooltip.
- Do not hide essential instructions only inside a tooltip.
- Use a popover or dialog when the floating content contains interactive controls.

See [ACCESSIBILITY.md](./ACCESSIBILITY.md) for the verification matrix and known limitations.

## Examples

- `examples/basic/`
- GitHub Pages demo: `docs/` when Pages is configured to serve `/docs` from `main`.

## Docs metadata

```ts
import { docs } from "a11y-tooltip/docs";
```

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
npm run pack:check
```

`npm run build` also refreshes `docs/dist/` so the committed GitHub Pages demo uses the same built runtime as the package.

## License

MIT
