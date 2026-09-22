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
- [x] CTRL-300 — Shared Tooltip Controller via `createSharedTooltip()`
  - [x] 300A — public controller contract + frozen defaults
  - [x] 300B — delegated focus/pointer trigger engine
  - [x] 300C — focus-over-hover state machine + per-trigger dismissal
  - [x] 300D — one generated/authored visual tooltip + teardown restoration
  - [x] 300E — retarget without close/open flicker
  - [x] 300F — dynamic Anchor Positioning + viewport fallback
  - [x] 300G — dedicated shared lifecycle events
  - [x] 300H — unit state-matrix coverage
  - [x] 300I — Chromium / Firefox / WebKit dense-interface coverage
  - [x] 300J — read-only shared integration diagnostics
  - [x] 300K — dense toolbar + dynamic-trigger example
  - [x] 300L — package/docs/accessibility integration
- [x] CTRL-320 — Shared native `popover="hint"` renderer (experimental)
  - [x] 320A — shared native hint utilities
  - [x] 320B — exact feature detection + anchored fallback
  - [x] 320C — core/native open-close synchronization
  - [x] 320D — synchronous source retargeting
  - [x] 320E — auto-popover coexistence + direct-open protection
  - [x] 320F — Chromium / Firefox / WebKit verification
- [x] CTRL-340 — Dynamic shared `aria-describedby` mode (experimental)
  - [x] 340A — active-trigger-only relationship ownership
  - [x] 340B — authored token preservation/restoration
  - [x] 340C — generated unique shared tooltip IDs
  - [x] 340D — browser accessible-description verification
  - [x] 340E — diagnostics for stale/duplicate relationships
  - [ ] 340F — manual NVDA / JAWS / VoiceOver / TalkBack verification
- [x] CTRL-360 — Shared Tooltip Motion via native WAAPI FLIP
  - [x] 360A — opt-in motion contract (`none` / `move`)
  - [x] 360B — zero-dependency WAAPI FLIP retarget driver
  - [x] 360C — interrupted retargets continue from current visual geometry
  - [x] 360D — `prefers-reduced-motion` disables travel
  - [x] 360E — anchored renderer integration
  - [x] 360F — native hint top-layer integration
  - [x] 360G — position-only motion with immediate variable-size/content updates
  - [x] 360H — Chromium / Firefox / WebKit rapid-retarget browser coverage
  - [ ] 360I — optional GSAP Flip integration example
  - [ ] 360J — experimental View Transition integration

Only after v0.1 runtime behavior is stable:

- add focused browser-level integration tests if unit DOM coverage proves insufficient;
- record manual assistive-technology evidence in `ACCESSIBILITY.md`.

## Future candidates

These are deliberately not part of the core MVP:


- richer viewport-placement strategies only if the native anchor-positioning addon proves insufficient;
- framework-specific wrappers maintained outside the core runtime;
- additional coordination addons where repeated real integrations demonstrate need.

Interactive popovers, dialogs, menus, and rich help bubbles remain separate patterns rather than tooltip features.
