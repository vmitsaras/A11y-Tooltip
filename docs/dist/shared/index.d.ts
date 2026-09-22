import { TooltipPlacement } from "../index.js";
import { n as AnchorPositioningFallback } from "../anchor-positioning-DgxVm0pY.js";
//#region src/shared/index.d.ts
declare const sharedTooltipEvents: Readonly<{
  init: "a11y-tooltip-shared:init";
  ready: "a11y-tooltip-shared:ready";
  beforeOpen: "a11y-tooltip-shared:before-open";
  open: "a11y-tooltip-shared:open";
  beforeRetarget: "a11y-tooltip-shared:before-retarget";
  retarget: "a11y-tooltip-shared:retarget";
  beforeClose: "a11y-tooltip-shared:before-close";
  close: "a11y-tooltip-shared:close";
  destroy: "a11y-tooltip-shared:destroy";
}>;
type SharedTooltipOpenReason = "api" | "focus" | "hover";
type SharedTooltipCloseReason = "api" | "blur" | "content-empty" | "destroy" | "escape" | "leave" | "platform" | "trigger-removed";
type SharedTooltipReason = SharedTooltipOpenReason | SharedTooltipCloseReason;
type SharedTooltipPositionFallback = AnchorPositioningFallback;
declare const SHARED_TOOLTIP_RENDER_MODES: readonly ["anchored", "hint-popover"];
type SharedTooltipRenderMode = (typeof SHARED_TOOLTIP_RENDER_MODES)[number];
declare const SHARED_TOOLTIP_SEMANTICS: readonly ["visual-only", "describedby"];
type SharedTooltipSemantics = (typeof SHARED_TOOLTIP_SEMANTICS)[number];
declare const SHARED_TOOLTIP_MOTIONS: readonly ["none", "move"];
type SharedTooltipMotion = (typeof SHARED_TOOLTIP_MOTIONS)[number];
interface SharedTooltipOptions {
  /**
   * Selector for delegated tooltip triggers inside the controller container.
   */
  triggers: string;
  /**
   * Returns visual tooltip text for a trigger.
   *
   * The controller always assigns the result with textContent. Empty content
   * prevents opening.
   */
  getContent(trigger: HTMLElement): string | null | undefined;
  /**
   * Optional authored tooltip element. When omitted, one visual-only tooltip
   * element is generated and appended to document.body.
   */
  tooltip?: HTMLElement;
  showDelay?: number;
  hideDelay?: number;
  placement?: TooltipPlacement;
  /**
   * CSS Anchor Positioning fallback tactics. Defaults are placement-aware.
   */
  fallbacks?: readonly SharedTooltipPositionFallback[];
  /**
   * Experimental rendering mode. "hint-popover" enters the top layer when
   * both popover="hint" and the required Anchor Positioning features exist.
   * Unsupported browsers fall back to anchored rendering.
   */
  renderMode?: SharedTooltipRenderMode;
  /**
   * Experimental semantics mode. "describedby" temporarily appends the
   * shared tooltip id to only the active trigger's aria-describedby tokens.
   * The default remains visual-only.
   */
  semantics?: SharedTooltipSemantics;
  /**
   * Retarget motion. "move" uses a zero-dependency WAAPI FLIP animation
   * between the current visual position and the new anchored position.
   * The default is "none".
   */
  motion?: SharedTooltipMotion;
  /**
   * Retarget animation duration in milliseconds. Defaults to 180.
   */
  motionDuration?: number;
  /**
   * WAAPI easing string used by motion="move".
   */
  motionEasing?: string;
}
interface SharedTooltipController {
  readonly container: HTMLElement;
  readonly tooltip: HTMLElement;
  readonly activeTrigger: HTMLElement | null;
  readonly isOpen: boolean;
  readonly renderMode: SharedTooltipRenderMode;
  readonly semantics: SharedTooltipSemantics;
  readonly motion: SharedTooltipMotion;
  readonly usesNativeHint: boolean;
  showFor(trigger: HTMLElement, reason?: SharedTooltipOpenReason): boolean;
  close(reason?: SharedTooltipCloseReason): boolean;
  refresh(): boolean;
  destroy(): void;
}
interface SharedTooltipLifecycleDetail {
  controller: SharedTooltipController;
  trigger?: HTMLElement;
  previousTrigger?: HTMLElement;
  reason?: SharedTooltipReason;
}
declare function createSharedTooltip(container: HTMLElement, options: SharedTooltipOptions): SharedTooltipController;
declare const sharedTooltipSelectors: Readonly<{
  root: "[data-a11y-shared-tooltip]";
  content: "[data-a11y-shared-tooltip-content]";
}>;
//#endregion
export { SHARED_TOOLTIP_MOTIONS, SHARED_TOOLTIP_RENDER_MODES, SHARED_TOOLTIP_SEMANTICS, SharedTooltipCloseReason, SharedTooltipController, SharedTooltipLifecycleDetail, SharedTooltipMotion, SharedTooltipOpenReason, SharedTooltipOptions, SharedTooltipPositionFallback, SharedTooltipReason, SharedTooltipRenderMode, SharedTooltipSemantics, createSharedTooltip, sharedTooltipEvents, sharedTooltipSelectors };
//# sourceMappingURL=index.d.ts.map