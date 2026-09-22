# AGENTS.md

This repository is a standalone accessibility plugin package.

## Core rules

- TypeScript-first, ESM-only, framework-agnostic.
- No runtime dependencies unless a concrete requirement justifies one.
- Do not auto-initialize on module import.
- Prefer semantic HTML and progressive enhancement.
- The authored description must remain meaningful when JavaScript does not initialize.
- Keep defaults, selectors, classes, attributes, and event names frozen.
- Normalize all public and `data-*` options before use.
- Reuse duplicate root initialization through `WeakMap`.
- Bind listeners once and remove every listener/timer in `destroy()`.
- Dispatch bubbling lifecycle events; `before-open` and `before-close` remain cancelable.
- Preserve authored attributes and restore them in `destroy()`.

## Tooltip accessibility contract

- The trigger is keyboard-focusable and independently accessible by name.
- The tooltip is descriptive, not interactive.
- Use `aria-describedby` from trigger to tooltip.
- Tooltip content uses `role="tooltip"` only while enhanced.
- Show on focus and hover.
- Keep hover active while the pointer moves over the tooltip.
- `Escape` dismisses without moving focus.
- After Escape, do not immediately reopen during the same hover/focus activation.
- Do not add click-to-toggle behavior to the tooltip core.
- Interactive floating content belongs in a popover/dialog component.

## CSS

- BEM classes for styling.
- `data-*` attributes for JavaScript hooks.
- Public custom properties use the `--a11y-tooltip-*` prefix.
- Private implementation variables use `--_` and remain scoped to `.a11y-tooltip`.
- Do not require animation for state understanding.
- Maintain usable forced-colors behavior.

## Extension architecture

- Core markup resolution is replaceable via `TooltipAdapter`.
- Optional cross-instance/application behavior belongs in `TooltipAddon`.
- Addons must return cleanup functions for listeners or external state they create.
- Do not expand the core API when an addon or adapter can solve the integration cleanly.

## Verification

Run `npm run typecheck`, `npm test`, `npm run build`, and `npm run pack:check` for behavior changes. Tests must cover observable interaction, cleanup, authored-state restoration, keyboard behavior, hover persistence, and lifecycle events.

Do not claim assistive-technology output is verified unless a manual session actually occurred.
