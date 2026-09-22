---
"a11y-tooltip": patch
---

Fix a one-frame flash when moving the shared tooltip between CSS-anchored triggers on a scrolled page. Use fixed-position layout offsets during the pending animation hold so stale anchor scroll adjustments cannot move the tooltip off screen.
