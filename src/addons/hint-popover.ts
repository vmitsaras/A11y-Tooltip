import {
  tooltipEvents,
  type TooltipAddon,
  type TooltipInstance,
  type TooltipLifecycleDetail
} from "../index.js";
import { supportsAnchorPositioning } from "../internal/anchor-positioning.js";
import { setupAnchorPositioning } from "./anchor-positioning.js";

const ROOT_ATTRIBUTE = "data-a11y-tooltip-hint-popover";

interface HintPopoverElement extends HTMLElement {
  popover: string | null;
  showPopover(options?: { source?: HTMLElement }): void;
  hidePopover(): void;
}

interface PopoverToggleEvent extends Event {
  readonly newState: "open" | "closed";
}

function supportsHintPopover(
  element: HTMLElement
): element is HintPopoverElement {
  const view = element.ownerDocument.defaultView;

  if (!view) {
    return false;
  }

  const prototype = view.HTMLElement.prototype as HintPopoverElement;

  if (
    !Object.hasOwn(prototype, "popover") ||
    typeof prototype.showPopover !== "function" ||
    typeof prototype.hidePopover !== "function"
  ) {
    return false;
  }

  const probe = element.ownerDocument.createElement(
    "div"
  ) as HintPopoverElement;

  probe.setAttribute("popover", "hint");

  return probe.popover === "hint";
}

function isPopoverOpen(element: HTMLElement): boolean {
  try {
    return element.matches(":popover-open");
  } catch {
    return false;
  }
}

function isOwnLifecycleEvent(
  event: Event,
  instance: TooltipInstance
): boolean {
  const detail = (
    event as CustomEvent<TooltipLifecycleDetail>
  ).detail;

  return detail?.instance === instance;
}

/**
 * Progressively renders an A11y Tooltip as a native `popover="hint"`
 * when the browser supports the hint state.
 *
 * A11yTooltip remains authoritative for opening. Native platform closes
 * (light dismiss, Escape/close requests, or another hint taking precedence)
 * are synchronized back into the core with the "platform" close reason.
 *
 * The addon also reuses the package's CSS Anchor Positioning setup so the
 * top-layer tooltip remains attached to its trigger.
 */
export function createHintPopoverAddon(): TooltipAddon {
  return Object.freeze({
    name: "hint-popover",

    setup(instance: TooltipInstance) {
      const { root, tooltip, trigger } = instance;

      if (
        !supportsHintPopover(tooltip) ||
        !supportsAnchorPositioning(tooltip)
      ) {
        return;
      }

      const originalPopover = tooltip.getAttribute("popover");
      const originalRootAttribute =
        root.getAttribute(ROOT_ATTRIBUTE);

      const cleanupAnchorPositioning =
        setupAnchorPositioning(instance);

      let cleaningUp = false;

      const handleBeforeToggle = (event: Event): void => {
        const toggleEvent = event as PopoverToggleEvent;

        if (
          toggleEvent.newState === "open" &&
          !instance.isOpen
        ) {
          event.preventDefault();
        }
      };

      const handleToggle = (event: Event): void => {
        if (cleaningUp) {
          return;
        }

        const toggleEvent = event as PopoverToggleEvent;

        if (
          toggleEvent.newState === "closed" &&
          instance.isOpen
        ) {
          instance.close("platform");
        }
      };

      const handleCoreOpen = (event: Event): void => {
        if (
          !isOwnLifecycleEvent(event, instance) ||
          isPopoverOpen(tooltip)
        ) {
          return;
        }

        try {
          tooltip.showPopover({
            source: trigger
          });
        } catch {
          instance.close("platform");
        }
      };

      const handleCoreClose = (event: Event): void => {
        if (
          !isOwnLifecycleEvent(event, instance) ||
          !isPopoverOpen(tooltip)
        ) {
          return;
        }

        try {
          tooltip.hidePopover();
        } catch {
          // The core has already closed. Browser-level tests guard against
          // native/core state drift for supported implementations.
        }
      };

      tooltip.addEventListener(
        "beforetoggle",
        handleBeforeToggle
      );

      tooltip.addEventListener(
        "toggle",
        handleToggle
      );

      root.addEventListener(
        tooltipEvents.open,
        handleCoreOpen
      );

      root.addEventListener(
        tooltipEvents.close,
        handleCoreClose
      );

      root.setAttribute(ROOT_ATTRIBUTE, "");
      tooltip.setAttribute("popover", "hint");

      return () => {
        cleaningUp = true;

        root.removeEventListener(
          tooltipEvents.open,
          handleCoreOpen
        );

        root.removeEventListener(
          tooltipEvents.close,
          handleCoreClose
        );

        tooltip.removeEventListener(
          "beforetoggle",
          handleBeforeToggle
        );

        tooltip.removeEventListener(
          "toggle",
          handleToggle
        );

        if (isPopoverOpen(tooltip)) {
          try {
            tooltip.hidePopover();
          } catch {
            // Cleanup continues so authored state is still restored.
          }
        }

        if (originalPopover === null) {
          tooltip.removeAttribute("popover");
        } else {
          tooltip.setAttribute(
            "popover",
            originalPopover
          );
        }

        if (originalRootAttribute === null) {
          root.removeAttribute(ROOT_ATTRIBUTE);
        } else {
          root.setAttribute(
            ROOT_ATTRIBUTE,
            originalRootAttribute
          );
        }

        cleanupAnchorPositioning();
      };
    }
  });
}
