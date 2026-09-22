# Accessibility evidence

A11y Tooltip implements a concise, non-interactive tooltip pattern. This file records the intended accessibility contract and current automated evidence. It is not a claim that every consuming page is fully WCAG conformant.

## Pattern contract

- The trigger must remain keyboard-focusable and must have an accessible name independent of the tooltip.
- The tooltip is associated with the trigger through `aria-describedby`.
- The tooltip element uses `role="tooltip"`.
- Focus remains on the trigger; the tooltip never receives focus.
- The tooltip opens on keyboard focus and pointer hover.
- `Escape` dismisses an open tooltip without moving focus.
- Pointer users can move from the trigger onto the tooltip without it disappearing because hover state is tracked on the shared root.
- Once dismissed with `Escape`, the tooltip stays dismissed until the current focus/hover activation ends.
- Tooltip content must not contain links, buttons, form controls, or other interactive descendants. Use a popover or dialog pattern for interactive content.

These behaviors align with the WAI-ARIA tooltip pattern and WCAG 2.2 Success Criterion 1.4.13 requirements for dismissible, hoverable, and persistent additional content.

## Automated evidence

Vitest covers semantic initialization, authored `aria-describedby` preservation, focus opening, hover persistence and delay, `Escape` dismissal, bubbling lifecycle events, cancelable before-events, safe option parsing, duplicate initialization, invalid trigger/content rejection, teardown restoration, multi-root initialization, and addon cleanup.

## Automated verification record

- 2026-09-22 — GitHub Actions CI on Node 24 with npm 11 passed dependency installation, `npm run typecheck`, `npm test`, `npm run build`, and `npm run pack:check` for commit `aa9584276a001e2804a1e81952b04421cde7868d`.

## Overflow-only addon

`createOverflowOnlyAddon()` affects only whether the **visual** tooltip is
allowed to open.

- It does not move focus or add keyboard commands.
- It does not create a live region or new announcement.
- It does not remove or rewrite `aria-describedby`.
- It performs no background observation, polling, storage, or network work.
- An unresolved explicit measurement target fails closed by canceling visual
  opening.
- The default logical inline-axis check follows the target's writing mode.

This means screen-reader description semantics remain stable even when the
visual tooltip is suppressed because the visible label already fits.

## CSS Anchor Positioning addon

`createAnchorPositioningAddon()` changes visual positioning only.

- It does not change keyboard commands or focus behavior.
- It does not alter the tooltip role, accessible description relationship, or
  screen-reader announcement model.
- It does not move the tooltip elsewhere in the DOM.
- It installs no observer, polling loop, storage, analytics, or network work.
- Each instance gets a unique generated CSS anchor name; authored inline anchor
  styles are restored during teardown.
- Unsupported browsers retain the existing absolute-position fallback because
  the anchor layout rules are guarded by `@supports`.

The addon can improve tooltip visibility near viewport/containing-block edges,
including at increased zoom, but it does not make the tooltip a top-layer
element and therefore does not bypass every ancestor clipping context.

## Selector adapter factory

`createSelectorAdapter()` changes markup resolution only.

- It adds no keyboard behavior, focus movement, live region, storage, observer,
  analytics, or network work.
- It does not change the tooltip role or accessible-description model.
- The core still validates that the resolved trigger is keyboard-focusable.
- The core still rejects interactive tooltip content.
- Selector resolution is scoped to the supplied root and requires exactly one
  distinct trigger and tooltip `HTMLElement`.
- Invalid, missing, or duplicate matches fail resolution rather than guessing.

Accessibility therefore depends on the same core tooltip contract after the
custom markup has been resolved.

## Diagnostics

The `a11y-tooltip/diagnostics` entry point is developer tooling, not runtime
accessibility behavior.

- Scans are explicit; importing the module does not scan the document.
- Scans are read-only and do not initialize, open, close, repair, or mutate
  tooltips.
- No live regions, focus changes, keyboard shortcuts, storage, analytics, or
  network calls are introduced.
- Findings about accessible names are deliberately phrased as heuristic because
  the scanner does not implement the browser's complete accessible-name
  computation.
- A clean diagnostics result is not evidence of WCAG conformance or verified
  assistive-technology output.

Diagnostics are intended to catch common integration mistakes earlier while the
core tooltip and manual accessibility verification remain the source of truth
for behavior.

## Manual release checks

| Check | Environment | Status |
| --- | --- | --- |
| Trigger name and description announcement | VoiceOver + Safari | Pending |
| Trigger name and description announcement | NVDA + Firefox | Pending |
| Keyboard focus, blur, and `Escape` behavior | Current desktop browsers | Pending |
| Pointer hover from trigger to tooltip at 200–400% zoom | Current desktop browser | Pending |
| Forced-colors presentation | Windows forced colors | Pending |
| Touch behavior for focusable triggers | VoiceOver iOS / TalkBack Android | Pending |

## Anchor positioning regression checks

- In the main demo, focus Prefer left and Prefer right near viewport edges.
  Each tooltip should flip inward, remain visible, and keep the configured
  `--a11y-tooltip-offset` gap without intersecting its trigger.
- Repeat with descriptions taller or wider than their triggers, and check all
  four placements in `examples/anchor-positioning/`.
- Scroll with a tooltip open; it should remain attached to its trigger.
- Press Escape: the tooltip closes and focus stays on the trigger.

## Integration responsibilities and limitations

- Authors must provide a useful accessible name on the trigger. The tooltip is a description, not a replacement label.
- The default CSS uses four simple placements and does not implement viewport collision detection.
- Long or essential instructions should normally remain visible in the page rather than being hidden in a tooltip.
- Disabled native controls are not focusable. If explanatory text is needed for a disabled action, expose it visibly or use an appropriate focusable wrapper pattern after careful review.
- Automated DOM tests cannot prove assistive-technology speech output.
