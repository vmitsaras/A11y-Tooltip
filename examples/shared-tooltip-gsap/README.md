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

const reducedMotion = matchMedia(
  "(prefers-reduced-motion: reduce)"
);

let previousState = null;

toolbar.addEventListener(
  sharedTooltipEvents.beforeRetarget,
  (event) => {
    if (
      event.detail.controller !== controller ||
      reducedMotion.matches
    ) {
      previousState = null;
      return;
    }

    previousState = Flip.getState(
      controller.tooltip,
      {
        simple: true,
        kill: false
      }
    );

    Flip.killFlipsOf(
      controller.tooltip,
      false
    );
  }
);

toolbar.addEventListener(
  sharedTooltipEvents.retarget,
  (event) => {
    if (
      event.detail.controller !== controller ||
      !previousState
    ) {
      return;
    }

    const state = previousState;
    previousState = null;

    Flip.from(state, {
      targets: controller.tooltip,
      duration: 0.22,
      ease: "power2.out",
      simple: true,
      scale: false
    });
  }
);
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
