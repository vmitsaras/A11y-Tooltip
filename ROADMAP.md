# Roadmap

## v0.1 — Core package foundation

- [x] TypeScript-first ESM runtime
- [x] Frozen defaults and shared constants
- [x] Safe dataset option normalization
- [x] Duplicate initialization protection with `WeakMap`
- [x] Focus + hover activation
- [x] Hoverable tooltip region
- [x] `Escape` dismissal without focus movement
- [x] Persistent dismissal for the current activation
- [x] `aria-describedby` preservation
- [x] Authored-state restoration in `destroy()`
- [x] Bubbling lifecycle events with cancelable before-events
- [x] Adapter contract for custom markup
- [x] Addon contract + optional single-open addon
- [x] BEM CSS with public/private custom properties
- [x] Progressive no-JavaScript fallback
- [x] Unit interaction tests
- [x] Package metadata, docs metadata, Changesets
- [x] Basic example
- [x] `docs/` GitHub Pages demo
- [x] CI verification on GitHub
- [ ] Manual VoiceOver/Safari check
- [ ] Manual NVDA/Firefox check
- [ ] Manual zoom/large-pointer hover check
- [ ] Manual Windows forced-colors check

## v0.2 — Verification, focused addons, and diagnostics

- [x] ADDON-210 — Overflow-only tooltip via `createOverflowOnlyAddon()`
- [x] ADDON-240 — CSS Anchor Positioning via `createAnchorPositioningAddon()`
- [x] ADAPTER-220 — Selector adapter factory via `createSelectorAdapter()`
- [x] DIAG-230 — Read-only integration diagnostics via `scanTooltipRoot()` and `scanTooltips()`
- [x] ADDON-260 — Native `popover="hint"` bridge via `createHintPopoverAddon()` (experimental)
  - [x] 260A — `platform` close reason + required dismissal invariant
  - [x] 260B — exact hint + Anchor Positioning feature detection
  - [x] 260C — core → native synchronization
  - [x] 260D — native → core synchronization
  - [x] 260E — shared Anchor Positioning setup
  - [x] 260F — Chromium / Firefox / WebKit state-matrix tests
  - [x] 260G — clipping + existing auto-popover example
  - [ ] 260H — manual VoiceOver / NVDA / mobile AT verification

Only after v0.1 runtime behavior is stable:

- add focused browser-level integration tests if unit DOM coverage proves insufficient;
- record manual assistive-technology evidence in `ACCESSIBILITY.md`.

## Future candidates

These are deliberately not part of the core MVP:

- richer viewport-placement strategies only if the native anchor-positioning addon proves insufficient;
- framework-specific wrappers maintained outside the core runtime;
- additional coordination addons where repeated real integrations demonstrate need.

Interactive popovers, dialogs, menus, and rich help bubbles remain separate patterns rather than tooltip features.
