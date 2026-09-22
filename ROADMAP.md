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
- [ ] CI verification on GitHub
- [ ] Manual VoiceOver/Safari check
- [ ] Manual NVDA/Firefox check
- [ ] Manual zoom/large-pointer hover check
- [ ] Manual Windows forced-colors check

## v0.2 — Verification and diagnostics

Only after v0.1 runtime behavior is stable:

- add focused browser-level integration tests if unit DOM coverage proves insufficient;
- consider a read-only diagnostics helper for common integration mistakes;
- record manual assistive-technology evidence in `ACCESSIBILITY.md`.

## Future candidates

These are deliberately not part of the core MVP:

- viewport collision/flip positioning;
- an optional positioning adapter built on a browser API once project browser targets justify it;
- framework-specific wrappers maintained outside the core runtime;
- additional coordination addons where repeated real integrations demonstrate need.

Interactive popovers, dialogs, menus, and rich help bubbles remain separate patterns rather than tooltip features.
