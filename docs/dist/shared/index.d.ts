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
type SharedTooltipCloseReason = "api" | "blur" | "content-empty" | "destroy" | "escape" | "leave" | "trigger-removed";
type SharedTooltipReason = SharedTooltipOpenReason | SharedTooltipCloseReason;
type SharedTooltipPositionFallback = AnchorPositioningFallback;
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
}
interface SharedTooltipController {
  readonly container: HTMLElement;
  readonly tooltip: HTMLElement;
  readonly activeTrigger: HTMLElement | null;
  readonly isOpen: boolean;
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
export { SharedTooltipCloseReason, SharedTooltipController, SharedTooltipLifecycleDetail, SharedTooltipOpenReason, SharedTooltipOptions, SharedTooltipPositionFallback, SharedTooltipReason, createSharedTooltip, sharedTooltipEvents, sharedTooltipSelectors };
//# sourceMappingURL=index.d.ts.map