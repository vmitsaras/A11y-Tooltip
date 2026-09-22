import { TooltipAddon, TooltipInstance } from "../index.js";
import { n as AnchorPositioningFallback, t as ANCHOR_POSITIONING_FALLBACKS } from "../anchor-positioning-DgxVm0pY.js";
//#region src/addons/overflow-only.d.ts
declare const OVERFLOW_AXES: readonly ["inline", "block", "either"];
type OverflowAxis = (typeof OVERFLOW_AXES)[number];
type OverflowTargetResolver = (instance: TooltipInstance) => HTMLElement | null;
type OverflowTarget = "trigger" | string | OverflowTargetResolver;
interface OverflowOnlyAddonOptions {
  /**
   * Element to measure for clipping.
   *
   * - "trigger" measures the tooltip trigger.
   * - A selector is resolved inside the tooltip root.
   * - A resolver can return any HTMLElement for the current instance.
   */
  target?: OverflowTarget;
  /**
   * Logical axis used for overflow detection.
   *
   * "inline" follows the element's writing mode, so vertical writing modes
   * measure height rather than width.
   */
  axis?: OverflowAxis;
  /**
   * Ignore overflow differences at or below this many CSS pixels.
   */
  tolerance?: number;
}
/**
 * Only allows the visual tooltip to open while the measured target is
 * actually clipped.
 *
 * The addon deliberately does not change focus, keyboard behavior,
 * `aria-describedby`, or screen-reader semantics. It performs one cheap
 * measurement only when an opening is requested; no observer or polling is
 * installed.
 */
declare function createOverflowOnlyAddon(options?: OverflowOnlyAddonOptions): TooltipAddon;
//#endregion
//#region src/addons/anchor-positioning.d.ts
interface AnchorPositioningAddonOptions {
  /**
   * Position-try fallback tactics for the anchor-positioned tooltip.
   *
   * Defaults are placement-aware:
   * - top/bottom prefer flip-block first;
   * - left/right prefer flip-inline first.
   *
   * Pass an empty array to disable fallback attempts.
   */
  fallbacks?: readonly AnchorPositioningFallback[];
}
declare function createAnchorPositioningAddon(options?: AnchorPositioningAddonOptions): TooltipAddon;
//#endregion
//#region src/addons/hint-popover.d.ts
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
declare function createHintPopoverAddon(): TooltipAddon;
//#endregion
//#region src/addons/index.d.ts
declare function defineTooltipAddon<T extends TooltipAddon>(addon: T): T;
declare function createSingleOpenAddon(): TooltipAddon;
//#endregion
export { ANCHOR_POSITIONING_FALLBACKS, type AnchorPositioningAddonOptions, type AnchorPositioningFallback, OVERFLOW_AXES, type OverflowAxis, type OverflowOnlyAddonOptions, type OverflowTarget, type OverflowTargetResolver, createAnchorPositioningAddon, createHintPopoverAddon, createOverflowOnlyAddon, createSingleOpenAddon, defineTooltipAddon };
//# sourceMappingURL=index.d.ts.map