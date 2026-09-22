//#region src/index.d.ts
declare const TOOLTIP_PLACEMENTS: readonly ["top", "right", "bottom", "left"];
type TooltipPlacement = (typeof TOOLTIP_PLACEMENTS)[number];
type TooltipOpenReason = "api" | "focus" | "hover";
type TooltipCloseReason = "api" | "blur" | "destroy" | "escape" | "leave" | "platform";
interface TooltipElements {
  trigger: HTMLElement;
  tooltip: HTMLElement;
}
interface TooltipAdapter {
  readonly name: string;
  resolve(root: HTMLElement): TooltipElements | null;
}
interface TooltipAddon {
  readonly name: string;
  setup(instance: TooltipInstance): void | (() => void);
}
interface TooltipOptions {
  showDelay?: number | string;
  hideDelay?: number | string;
  placement?: TooltipPlacement | string;
  closeOnEscape?: boolean | string;
  adapter?: TooltipAdapter;
  addons?: readonly TooltipAddon[];
}
interface ResolvedTooltipOptions {
  showDelay: number;
  hideDelay: number;
  placement: TooltipPlacement;
  closeOnEscape: boolean;
  adapter: TooltipAdapter;
  addons: readonly TooltipAddon[];
}
interface TooltipInstance {
  readonly root: HTMLElement;
  readonly trigger: HTMLElement;
  readonly tooltip: HTMLElement;
  readonly options: Readonly<ResolvedTooltipOptions>;
  readonly isOpen: boolean;
  open(reason?: TooltipOpenReason): boolean;
  close(reason?: TooltipCloseReason): boolean;
  toggle(): boolean;
  destroy(): void;
}
interface TooltipLifecycleDetail {
  instance: TooltipInstance;
  reason?: TooltipOpenReason | TooltipCloseReason;
}
declare const dataAttributeAdapter: TooltipAdapter;
declare class A11yTooltip implements TooltipInstance {
  private static readonly instances;
  readonly root: HTMLElement;
  readonly trigger: HTMLElement;
  readonly tooltip: HTMLElement;
  readonly options: Readonly<ResolvedTooltipOptions>;
  private openState;
  private hovering;
  private focused;
  private dismissedDuringActivation;
  private destroyed;
  private showTimer;
  private hideTimer;
  private addonCleanups;
  private originalHidden;
  private originalRole;
  private originalPlacement;
  private originalDescribedBy;
  private generatedTooltipId;
  constructor(root: HTMLElement, options?: TooltipOptions);
  get isOpen(): boolean;
  static get(root: HTMLElement): A11yTooltip | undefined;
  static optionsFromDataset(root: HTMLElement): TooltipOptions;
  private init;
  open(reason?: TooltipOpenReason): boolean;
  close(reason?: TooltipCloseReason): boolean;
  toggle(): boolean;
  destroy(): void;
  private setupAddons;
  private handleMouseEnter;
  private handleMouseLeave;
  private handleFocus;
  private handleBlur;
  private handleDocumentKeyDown;
  private scheduleOpen;
  private scheduleClose;
  private clearShowTimer;
  private clearHideTimer;
  private dispatch;
}
declare function createTooltip(root: HTMLElement, options?: TooltipOptions): TooltipInstance;
declare function initTooltipsAll(options?: TooltipOptions, scope?: ParentNode): TooltipInstance[];
declare const tooltipSelectors: Readonly<{
  root: "[data-a11y-tooltip]";
  trigger: "[data-a11y-tooltip-trigger]";
  tooltip: "[data-a11y-tooltip-content]";
}>;
declare const tooltipEvents: Readonly<{
  init: "a11y-tooltip:init";
  ready: "a11y-tooltip:ready";
  beforeOpen: "a11y-tooltip:before-open";
  open: "a11y-tooltip:open";
  beforeClose: "a11y-tooltip:before-close";
  close: "a11y-tooltip:close";
  destroy: "a11y-tooltip:destroy";
}>;
//#endregion
export { A11yTooltip, ResolvedTooltipOptions, TOOLTIP_PLACEMENTS, TooltipAdapter, TooltipAddon, TooltipCloseReason, TooltipElements, TooltipInstance, TooltipLifecycleDetail, TooltipOpenReason, TooltipOptions, TooltipPlacement, createTooltip, dataAttributeAdapter, initTooltipsAll, tooltipEvents, tooltipSelectors };
//# sourceMappingURL=index.d.ts.map