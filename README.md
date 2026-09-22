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

Event detail includes the instance and, when relevant, the open/close reason. Close reasons include `platform` when a native rendering addon is dismissed by the browser.

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

## Overflow-only addon

Use `createOverflowOnlyAddon()` when the floating tooltip should appear only
if a label or other measured target is actually clipped.

```ts
import { createTooltip } from "a11y-tooltip";
import { createOverflowOnlyAddon } from "a11y-tooltip/addons";

createTooltip(root, {
  addons: [
    createOverflowOnlyAddon()
  ]
});
```

By default the addon measures the trigger on the logical inline axis. It can
also measure a descendant selector or a resolver result:

```ts
createOverflowOnlyAddon({
  target: "[data-overflow-target]",
  axis: "either",
  tolerance: 1
});
```

Options:

- `target`: `"trigger"` (default), a selector resolved inside the tooltip
  root, or a resolver returning an `HTMLElement`.
- `axis`: `"inline"` (default), `"block"`, or `"either"`. Inline/block
  follow the target's writing mode.
- `tolerance`: non-negative CSS-pixel difference to ignore when comparing
  scroll size with client size.

The addon performs a fresh measurement only when an opening is requested, so
responsive changes are picked up on the next focus/hover attempt without a
`ResizeObserver`. If an explicit target cannot be resolved, visual opening is
safely canceled.

The addon gates only the **visual open state**. It does not change focus,
keyboard behavior, `role="tooltip"`, or `aria-describedby`; assistive
technology can therefore retain the authored description even when the visual
label is not clipped.

## CSS Anchor Positioning addon

Use `createAnchorPositioningAddon()` to progressively enhance the package's
four placements with native CSS Anchor Positioning and
`position-try-fallbacks`.

```ts
import { createTooltip } from "a11y-tooltip";
import {
  createAnchorPositioningAddon
} from "a11y-tooltip/addons";

createTooltip(root, {
  addons: [
    createAnchorPositioningAddon()
  ]
});
```

The addon creates a unique anchor association for each tooltip instance. Its
default fallback order is placement-aware:

- `top` / `bottom`: `flip-block` first;
- `left` / `right`: `flip-inline` first;
- then a secondary axis flip and a combined block/inline flip.

Custom fallback tactics are optional:

```ts
createAnchorPositioningAddon({
  fallbacks: [
    "flip-start",
    "flip-block"
  ]
});
```

Pass `fallbacks: []` to keep Anchor Positioning but disable automatic
position-try fallback attempts.

The default stylesheet activates anchor-based layout only inside an
`@supports` rule. Browsers without the required Anchor Positioning features
therefore retain the existing absolute-position CSS unchanged. Enhanced tooltips
use fixed positioning and span the cross axis so fallback placements have room
for descriptions larger than the trigger, while preserving the configured offset.

The addon:

- adds no runtime dependency;
- does not reparent the tooltip;
- does not move focus or change keyboard behavior;
- does not change `role="tooltip"` or `aria-describedby`;
- restores authored `anchor-name`, `position-anchor`,
  `position-try-fallbacks`, and its root state attribute in `destroy()`.

This improves edge placement but is not a top-layer solution. Ancestor
`overflow: hidden` / `clip` constraints may still require a different
overlay architecture.

## Native hint popover addon

`createHintPopoverAddon()` is an experimental rendering bridge that promotes
the existing tooltip into the browser top layer using `popover="hint"`.

```ts
import { createTooltip } from "a11y-tooltip";
import {
  createHintPopoverAddon
} from "a11y-tooltip/addons";

createTooltip(root, {
  addons: [
    createHintPopoverAddon()
  ]
});
```

A11y Tooltip remains authoritative for opening, delays, focus/hover activation,
ARIA, and lifecycle events. Native platform closes — including light dismiss,
close requests, and another hint taking precedence — synchronize back into the
core with the `"platform"` close reason.

The addon activates only when the browser supports both the native
`popover="hint"` state and the CSS Anchor Positioning features used by the
package. Otherwise it performs no enhancement and the ordinary tooltip
continues unchanged.

The bridge:

- calls `showPopover({ source: trigger })` only after the core has opened;
- blocks direct native opening while the core is closed;
- synchronizes native closing back to `instance.close("platform")`;
- reuses the existing Anchor Positioning implementation;
- enters the top layer without reparenting the DOM;
- restores the authored `popover` attribute and anchor styles in
  `destroy()`;
- does not add `popovertarget`, click-to-toggle behavior, interactive tooltip
  content, or new accessibility relationships.

If custom Anchor Positioning fallbacks are needed, place
`createAnchorPositioningAddon({...})` before `createHintPopoverAddon()` in
the addon list so the explicit positioning configuration becomes the shared
setup.

```ts
createTooltip(root, {
  addons: [
    createAnchorPositioningAddon({
      fallbacks: ["flip-start", "flip-block"]
    }),
    createHintPopoverAddon()
  ]
});
```

Because native popovers introduce a second browser-managed state system, this
addon is covered by real Chromium, Firefox, and WebKit tests in addition to the
DOM unit suite.

## Adapters

The default adapter resolves `data-a11y-tooltip-trigger` and `data-a11y-tooltip-content`. Design systems can supply a custom `TooltipAdapter` to map different markup without changing the core runtime.

## Selector adapter factory

Use `createSelectorAdapter()` when an existing design system, CMS, or legacy
component already has suitable markup but uses different selectors.

```ts
import { createTooltip } from "a11y-tooltip";
import {
  createSelectorAdapter
} from "a11y-tooltip/adapters";

const adapter = createSelectorAdapter({
  name: "field-help",
  trigger: ".field__help-trigger",
  tooltip: ".field__help"
});

createTooltip(root, { adapter });
```

The factory is intentionally strict:

- `name`, `trigger`, and `tooltip` must be non-empty strings;
- selectors are scoped to the supplied tooltip root;
- each selector must resolve to exactly one `HTMLElement`;
- trigger and tooltip must resolve to different elements;
- invalid selectors, missing matches, duplicates, or non-HTMLElement matches
  resolve as `null`, allowing the core tooltip to surface its normal adapter
  resolution error with the configured adapter name.

The adapter maps markup only. It does not change the verified tooltip contract:
the core still validates keyboard focusability and non-interactive content,
adds `aria-describedby` and `role="tooltip"`, manages focus/hover/Escape,
dispatches lifecycle events, and restores authored state on `destroy()`.

This makes the plugin easier to adopt in legacy BEM components, CMS templates,
third-party design systems, and custom-element light DOM without coupling the
core runtime to any one markup convention.

## Diagnostics

The optional `a11y-tooltip/diagnostics` entry point provides explicit,
read-only integration checks. Nothing scans automatically.

```ts
import {
  scanTooltipRoot,
  scanTooltips
} from "a11y-tooltip/diagnostics";

const findings = scanTooltips();

for (const finding of findings) {
  console.warn(
    finding.code,
    finding.severity,
    finding.message
  );
}
```

For custom design-system markup, pass the same adapter and a root selector:

```ts
scanTooltips({
  rootSelector: ".field-help",
  adapter: createSelectorAdapter({
    name: "field-help",
    trigger: ".field-help__trigger",
    tooltip: ".field-help__copy"
  })
});
```

Current diagnostics include:

- missing or duplicate default trigger/tooltip hooks;
- adapter resolution failures or thrown adapter errors;
- keyboard-inaccessible triggers;
- triggers with no **obvious** accessible-name source;
- native `title` conflicts that can create a second tooltip;
- empty tooltip content;
- interactive tooltip content;
- duplicate tooltip IDs;
- broken `aria-describedby` references;
- initialized tooltips that lost their description relationship;
- authored tooltips hidden before enhancement;
- nested tooltip roots.

The name check is intentionally heuristic. It does not implement the browser's
full accessible-name computation and must not be treated as assistive-technology
verification.

The diagnostics API does not initialize, open, close, repair, persist, send,
or mutate anything. It returns frozen finding records so applications, demos,
tests, or developer tooling can decide how to present them.

## Shared tooltip controller

For dense toolbars, tables, and editor interfaces, `a11y-tooltip/shared`
provides one visual tooltip for many already-accessibly-named controls.

```ts
import {
  createSharedTooltip
} from "a11y-tooltip/shared";

const controller = createSharedTooltip(toolbar, {
  triggers: "[data-tooltip-text]",

  getContent(trigger) {
    return trigger.dataset.tooltipText ?? "";
  },

  placement: "bottom"
});
```

A typical trigger already exposes its purpose independently:

```html
<button
  aria-label="Bold"
  data-tooltip-text="Bold"
>
  …
</button>
```

The controller deliberately does **not** add or move `aria-describedby`.
Its shared tooltip is visual-only and remains `aria-hidden="true"`, avoiding a
single mutable description node becoming the semantic description for many
inactive controls.

The controller uses delegated `focusin` / `focusout` and pointer events, so
new matching triggers work without reinitialization or a `MutationObserver`.
Keyboard focus has priority over pointer hover. Once open, moving between
triggers retargets the same tooltip instead of closing and reopening it.

The public controller exposes:

- `activeTrigger`;
- `isOpen`;
- `showFor(trigger, reason?)`;
- `close(reason?)`;
- `refresh()`;
- `destroy()`.

Shared lifecycle events use the separate `a11y-tooltip-shared:*` namespace,
including `before-retarget` / `retarget` for visible trigger changes.

Positioning uses CSS Anchor Positioning when available and a fixed viewport
fallback otherwise. Authored `anchor-name`, tooltip attributes, inline styles,
and generated DOM are restored during teardown.

Do not use the shared controller as the source of a control's accessible name,
error message, validation requirement, destructive-action consequence, or
other essential instructions. Those need persistent accessible content.

Two experimental opt-ins are now available without changing the default:

```ts
createSharedTooltip(toolbar, {
  triggers: "[data-tooltip-text]",
  getContent(trigger) {
    return trigger.dataset.tooltipText ?? "";
  },
  renderMode: "hint-popover",
  semantics: "describedby"
});
```

- `renderMode: "hint-popover"` uses native `popover="hint"` when exact hint
  support and the required Anchor Positioning features are present. Unsupported
  browsers fall back to anchored rendering. Native light dismiss and other
  platform closes synchronize back into the controller with the
  `"platform"` close reason.
- Retargeting an already-open native hint performs a synchronous hide/show pair
  with the new trigger as `showPopover({ source })`, leaving the final state
  open before the browser gets a rendering opportunity.
- `semantics: "describedby"` temporarily appends the shared tooltip ID to only
  the active trigger's existing `aria-describedby` tokens, restores the prior
  attribute exactly on retarget/close, and removes `aria-hidden` from the
  tooltip while that mode is configured.
- The controller rejects duplicate authored tooltip IDs in describedby mode.

The describedby mode is still experimental. Cross-browser accessibility-tree
tests verify the computed description relationship, but those tests do not
prove screen-reader announcement timing. Manual NVDA, JAWS, VoiceOver, and
TalkBack verification remains required before treating this mode as a default
semantic strategy.

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
- `examples/overflow-only/`
- `examples/anchor-positioning/`
- `examples/selector-adapter/`
- `examples/diagnostics/`
- `examples/hint-popover/`
- `examples/shared-tooltip/`
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
