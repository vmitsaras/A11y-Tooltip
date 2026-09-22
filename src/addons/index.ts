import type {
  TooltipAddon,
  TooltipInstance
} from "../index.js";

export function defineTooltipAddon<T extends TooltipAddon>(addon: T): T {
  return Object.freeze(addon);
}

export function createSingleOpenAddon(): TooltipAddon {
  let current: TooltipInstance | null = null;

  return defineTooltipAddon({
    name: "single-open",
    setup(instance) {
      const handleOpen = (): void => {
        if (current && current !== instance) {
          current.close("api");
        }

        current = instance;
      };

      const handleClose = (): void => {
        if (current === instance) {
          current = null;
        }
      };

      instance.root.addEventListener("a11y-tooltip:open", handleOpen);
      instance.root.addEventListener("a11y-tooltip:close", handleClose);

      return () => {
        instance.root.removeEventListener("a11y-tooltip:open", handleOpen);
        instance.root.removeEventListener("a11y-tooltip:close", handleClose);

        if (current === instance) {
          current = null;
        }
      };
    }
  });
}

export {
  createOverflowOnlyAddon,
  OVERFLOW_AXES
} from "./overflow-only.js";

export type {
  OverflowAxis,
  OverflowOnlyAddonOptions,
  OverflowTarget,
  OverflowTargetResolver
} from "./overflow-only.js";

export {
  ANCHOR_POSITIONING_FALLBACKS,
  createAnchorPositioningAddon
} from "./anchor-positioning.js";

export type {
  AnchorPositioningAddonOptions,
  AnchorPositioningFallback
} from "./anchor-positioning.js";

export {
  createHintPopoverAddon
} from "./hint-popover.js";
