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

## Manual release checks

| Check | Environment | Status |
| --- | --- | --- |
| Trigger name and description announcement | VoiceOver + Safari | Pending |
| Trigger name and description announcement | NVDA + Firefox | Pending |
| Keyboard focus, blur, and `Escape` behavior | Current desktop browsers | Pending |
| Pointer hover from trigger to tooltip at 200–400% zoom | Current desktop browser | Pending |
| Forced-colors presentation | Windows forced colors | Pending |
| Touch behavior for focusable triggers | VoiceOver iOS / TalkBack Android | Pending |

## Integration responsibilities and limitations

- Authors must provide a useful accessible name on the trigger. The tooltip is a description, not a replacement label.
- The default CSS uses four simple placements and does not implement viewport collision detection.
- Long or essential instructions should normally remain visible in the page rather than being hidden in a tooltip.
- Disabled native controls are not focusable. If explanatory text is needed for a disabled action, expose it visibly or use an appropriate focusable wrapper pattern after careful review.
- Automated DOM tests cannot prove assistive-technology speech output.
