# Shared Tooltip + GSAP Flip

This optional integration example keeps `a11y-tooltip` dependency-free while
showing how an application that already uses GSAP can animate shared-tooltip
retargeting with the Flip plugin.

Build the package first:

```bash
npm run build:dist
```

Then serve the repository root and open:

```text
examples/shared-tooltip-gsap/
```

The page loads GSAP 3.15.0 and Flip from jsDelivr for demonstration only.
Neither package is added to A11y Tooltip's runtime or development dependencies.

## npm integration

In an application that already uses GSAP:

```ts
import gsap from "gsap";
import Flip from "gsap/Flip";
import { attachSharedGsapMotion } from "./motion.js";

import {
  createSharedTooltip,
  sharedTooltipEvents
} from "a11y-tooltip/shared";

gsap.registerPlugin(Flip);

const controller = createSharedTooltip(toolbar, {
  triggers: "[data-tooltip-text]",
  getContent(trigger) {
    return trigger.dataset.tooltipText ?? "";
  },

  // Important: do not run the built-in WAAPI driver at the same time.
  motion: "none"
});

// Copy motion.js from this example into your application.
const detachMotion = attachSharedGsapMotion(
  controller, gsap, Flip, sharedTooltipEvents
);

// When replacing the integration (destroy also detaches it automatically):
// detachMotion();
```

## Why lifecycle integration instead of a package option?

GSAP remains an application concern. The Shared Tooltip Controller continues to
own:

- active-trigger state;
- text updates;
- `aria-describedby` ownership when enabled;
- Anchor Positioning;
- native hint-popover source synchronization;
- Escape and close behavior.

GSAP observes the already-public `before-retarget` and `retarget` events and
animates only the visual transition.

Use `motion: "move"` for the built-in zero-dependency WAAPI FLIP driver. Use
this integration when the consuming application already depends on GSAP and
wants GSAP's Flip interruption/size-transition behavior.

## Anchor positioning and interruptions

The helper captures the current visual state, completes the interrupted Flip to
restore its inline styles, and holds the tooltip in place for two animation
frames before measuring the new CSS anchor. Measuring synchronously can include
Chrome's stale anchor scroll adjustment and send the tooltip off screen.
Closing, destroying, detaching, or enabling reduced motion cancels the pending
frames and restores the animation styles. The helper assumes the standard
tooltip CSS (no authored individual `translate` override). Both demos use this helper; the pages
build copies it to `docs/shared-gsap-motion.js`.

## Real animation regression tests

The ordinary integration tests stub GSAP to check lifecycle wiring offline.
To check actual painted geometry, download the pinned scripts to a temporary
folder and run the separate suite:

```sh
mkdir -p /tmp/a11y-tooltip-gsap-test
curl -fsSL https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js -o /tmp/a11y-tooltip-gsap-test/gsap.min.js
curl -fsSL https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/Flip.min.js -o /tmp/a11y-tooltip-gsap-test/Flip.min.js
GSAP_TEST_ASSETS_DIR=/tmp/a11y-tooltip-gsap-test npx playwright test test/browser/gsap-motion.real.spec.ts --project=chromium
```

Without `GSAP_TEST_ASSETS_DIR`, that suite explicitly skips rather than treating
stubbed animation calls as evidence of smooth motion.
