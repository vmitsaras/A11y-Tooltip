const COMPONENT_NAME = "a11y-tooltip";

const DEFAULT_SELECTORS = Object.freeze({
  root: "[data-a11y-tooltip]",
  trigger: "[data-a11y-tooltip-trigger]",
  tooltip: "[data-a11y-tooltip-content]"
});

const CLASSES = Object.freeze({
  initialized: "is-initialized",
  open: "is-open"
});

const ATTRIBUTES = Object.freeze({
  describedBy: "aria-describedby",
  role: "role",
  tooltipRole: "tooltip",
  placement: "data-placement"
});

const EVENTS = Object.freeze({
  init: `${COMPONENT_NAME}:init`,
  ready: `${COMPONENT_NAME}:ready`,
  beforeOpen: `${COMPONENT_NAME}:before-open`,
  open: `${COMPONENT_NAME}:open`,
  beforeClose: `${COMPONENT_NAME}:before-close`,
  close: `${COMPONENT_NAME}:close`,
  destroy: `${COMPONENT_NAME}:destroy`
});

export const TOOLTIP_PLACEMENTS = Object.freeze([
  "top",
  "right",
  "bottom",
  "left"
] as const);

export type TooltipPlacement = (typeof TOOLTIP_PLACEMENTS)[number];

export type TooltipOpenReason = "api" | "focus" | "hover";
export type TooltipCloseReason =
  | "api"
  | "blur"
  | "destroy"
  | "escape"
  | "leave";

export interface TooltipElements {
  trigger: HTMLElement;
  tooltip: HTMLElement;
}

export interface TooltipAdapter {
  readonly name: string;
  resolve(root: HTMLElement): TooltipElements | null;
}

export interface TooltipAddon {
  readonly name: string;
  setup(instance: TooltipInstance): void | (() => void);
}

export interface TooltipOptions {
  showDelay?: number | string;
  hideDelay?: number | string;
  placement?: TooltipPlacement | string;
  closeOnEscape?: boolean | string;
  adapter?: TooltipAdapter;
  addons?: readonly TooltipAddon[];
}

export interface ResolvedTooltipOptions {
  showDelay: number;
  hideDelay: number;
  placement: TooltipPlacement;
  closeOnEscape: boolean;
  adapter: TooltipAdapter;
  addons: readonly TooltipAddon[];
}

export interface TooltipInstance {
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

export interface TooltipLifecycleDetail {
  instance: TooltipInstance;
  reason?: TooltipOpenReason | TooltipCloseReason;
}

const INTERACTIVE_CONTENT_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

let generatedId = 0;

export const dataAttributeAdapter: TooltipAdapter = Object.freeze({
  name: "data-attributes",
  resolve(root: HTMLElement): TooltipElements | null {
    const trigger = root.querySelector(DEFAULT_SELECTORS.trigger);
    const tooltip = root.querySelector(DEFAULT_SELECTORS.tooltip);

    if (!(trigger instanceof HTMLElement) || !(tooltip instanceof HTMLElement)) {
      return null;
    }

    return { trigger, tooltip };
  }
});

const EMPTY_ADDONS = Object.freeze([]) as readonly TooltipAddon[];

const DEFAULT_OPTIONS: Readonly<ResolvedTooltipOptions> = Object.freeze({
  showDelay: 180,
  hideDelay: 100,
  placement: "top",
  closeOnEscape: true,
  adapter: dataAttributeAdapter,
  addons: EMPTY_ADDONS
});

function toSafeBoolean(
  value: boolean | string | undefined,
  fallback: boolean
): boolean {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return fallback;
}

function toSafeInteger(
  value: number | string | undefined,
  fallback: number,
  { min = 0, max = 5000 }: { min?: number; max?: number } = {}
): number {
  if (value === "" || value === undefined) return fallback;

  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return fallback;
  }

  return Math.trunc(parsed);
}

function toPlacement(
  value: TooltipPlacement | string | undefined,
  fallback: TooltipPlacement
): TooltipPlacement {
  return TOOLTIP_PLACEMENTS.includes(value as TooltipPlacement)
    ? (value as TooltipPlacement)
    : fallback;
}

function isKeyboardFocusable(element: HTMLElement): boolean {
  if ("disabled" in element && Boolean((element as HTMLButtonElement).disabled)) {
    return false;
  }

  return element.tabIndex >= 0;
}

function tokenize(value: string | null): string[] {
  return String(value ?? "")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

function uniqueTokens(tokens: readonly string[]): string[] {
  return Array.from(new Set(tokens));
}

function optionsFromDataset(root: HTMLElement): TooltipOptions {
  return {
    showDelay: root.dataset.a11yTooltipShowDelay,
    hideDelay: root.dataset.a11yTooltipHideDelay,
    placement: root.dataset.a11yTooltipPlacement,
    closeOnEscape: root.dataset.a11yTooltipCloseOnEscape
  };
}

function normalizeOptions(options: TooltipOptions): ResolvedTooltipOptions {
  const addons = Array.isArray(options.addons)
    ? Object.freeze([...options.addons])
    : EMPTY_ADDONS;

  return {
    showDelay: toSafeInteger(options.showDelay, DEFAULT_OPTIONS.showDelay),
    hideDelay: toSafeInteger(options.hideDelay, DEFAULT_OPTIONS.hideDelay),
    placement: toPlacement(options.placement, DEFAULT_OPTIONS.placement),
    closeOnEscape: toSafeBoolean(
      options.closeOnEscape,
      DEFAULT_OPTIONS.closeOnEscape
    ),
    adapter: options.adapter ?? DEFAULT_OPTIONS.adapter,
    addons
  };
}

function ensureTooltipId(tooltip: HTMLElement): {
  id: string;
  generated: boolean;
} {
  if (tooltip.id.trim().length > 0) {
    return { id: tooltip.id, generated: false };
  }

  generatedId += 1;
  tooltip.id = `${COMPONENT_NAME}-${generatedId}`;

  return { id: tooltip.id, generated: true };
}

export class A11yTooltip implements TooltipInstance {
  private static readonly instances = new WeakMap<HTMLElement, A11yTooltip>();

  readonly root!: HTMLElement;
  readonly trigger!: HTMLElement;
  readonly tooltip!: HTMLElement;
  readonly options!: Readonly<ResolvedTooltipOptions>;

  private openState = false;
  private hovering = false;
  private focused = false;
  private dismissedDuringActivation = false;
  private destroyed = false;
  private showTimer: number | null = null;
  private hideTimer: number | null = null;
  private addonCleanups: Array<() => void> = [];

  private originalHidden: HTMLElement["hidden"] = false;
  private originalRole: string | null = null;
  private originalPlacement: string | null = null;
  private originalDescribedBy: string | null = null;
  private generatedTooltipId = false;

  constructor(root: HTMLElement, options: TooltipOptions = {}) {
    if (!(root instanceof HTMLElement)) {
      throw new TypeError("A11yTooltip requires a root HTMLElement.");
    }

    const existing = A11yTooltip.instances.get(root);
    if (existing) {
      return existing;
    }

    const mergedOptions = normalizeOptions({
      ...optionsFromDataset(root),
      ...options
    });

    const elements = mergedOptions.adapter.resolve(root);

    if (!elements) {
      throw new TypeError(
        `A11yTooltip adapter "${mergedOptions.adapter.name}" could not resolve a trigger and tooltip.`
      );
    }

    if (!isKeyboardFocusable(elements.trigger)) {
      throw new TypeError(
        "A11yTooltip trigger must be keyboard-focusable. Use a native interactive element or provide an appropriate tabindex."
      );
    }

    if (elements.tooltip.matches(INTERACTIVE_CONTENT_SELECTOR)) {
      throw new TypeError(
        "A11yTooltip content itself must not be interactive."
      );
    }

    if (elements.tooltip.querySelector(INTERACTIVE_CONTENT_SELECTOR)) {
      throw new TypeError(
        "A11yTooltip content must not contain interactive descendants. Use a popover or dialog pattern instead."
      );
    }

    this.root = root;
    this.trigger = elements.trigger;
    this.tooltip = elements.tooltip;
    this.options = Object.freeze(mergedOptions);

    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleDocumentKeyDown = this.handleDocumentKeyDown.bind(this);

    A11yTooltip.instances.set(root, this);

    try {
      this.init();
    } catch (error) {
      A11yTooltip.instances.delete(root);
      throw error;
    }
  }

  get isOpen(): boolean {
    return this.openState;
  }

  static get(root: HTMLElement): A11yTooltip | undefined {
    return A11yTooltip.instances.get(root);
  }

  static optionsFromDataset(root: HTMLElement): TooltipOptions {
    return optionsFromDataset(root);
  }

  private init(): void {
    const { id, generated } = ensureTooltipId(this.tooltip);

    this.generatedTooltipId = generated;
    this.originalHidden = this.tooltip.hidden;
    this.originalRole = this.tooltip.getAttribute(ATTRIBUTES.role);
    this.originalPlacement = this.tooltip.getAttribute(ATTRIBUTES.placement);
    this.originalDescribedBy = this.trigger.getAttribute(ATTRIBUTES.describedBy);

    const describedBy = uniqueTokens([
      ...tokenize(this.originalDescribedBy),
      id
    ]);

    this.trigger.setAttribute(ATTRIBUTES.describedBy, describedBy.join(" "));
    this.tooltip.setAttribute(ATTRIBUTES.role, ATTRIBUTES.tooltipRole);
    this.tooltip.setAttribute(ATTRIBUTES.placement, this.options.placement);
    this.tooltip.hidden = true;
    this.root.classList.add(CLASSES.initialized);
    this.root.classList.remove(CLASSES.open);

    this.root.addEventListener("mouseenter", this.handleMouseEnter);
    this.root.addEventListener("mouseleave", this.handleMouseLeave);
    this.trigger.addEventListener("focus", this.handleFocus);
    this.trigger.addEventListener("blur", this.handleBlur);

    this.dispatch(EVENTS.init);
    this.setupAddons();
    this.dispatch(EVENTS.ready);
  }

  open(reason: TooltipOpenReason = "api"): boolean {
    if (this.destroyed || this.dismissedDuringActivation) {
      return false;
    }

    this.clearHideTimer();
    this.clearShowTimer();

    if (this.openState) {
      return true;
    }

    if (!this.dispatch(EVENTS.beforeOpen, { reason }, true)) {
      return false;
    }

    this.openState = true;
    this.tooltip.hidden = false;
    this.root.classList.add(CLASSES.open);

    if (this.options.closeOnEscape) {
      this.trigger.ownerDocument.addEventListener(
        "keydown",
        this.handleDocumentKeyDown
      );
    }

    this.dispatch(EVENTS.open, { reason });

    return true;
  }

  close(reason: TooltipCloseReason = "api"): boolean {
    if (this.destroyed && reason !== "destroy") {
      return false;
    }

    this.clearShowTimer();
    this.clearHideTimer();

    if (!this.openState) {
      return true;
    }

    if (
      reason !== "destroy" &&
      !this.dispatch(EVENTS.beforeClose, { reason }, true)
    ) {
      return false;
    }

    this.openState = false;
    this.tooltip.hidden = true;
    this.root.classList.remove(CLASSES.open);
    this.trigger.ownerDocument.removeEventListener(
      "keydown",
      this.handleDocumentKeyDown
    );

    this.dispatch(EVENTS.close, { reason });

    return true;
  }

  toggle(): boolean {
    return this.openState ? this.close("api") : this.open("api");
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.close("destroy");
    this.clearShowTimer();
    this.clearHideTimer();

    this.root.removeEventListener("mouseenter", this.handleMouseEnter);
    this.root.removeEventListener("mouseleave", this.handleMouseLeave);
    this.trigger.removeEventListener("focus", this.handleFocus);
    this.trigger.removeEventListener("blur", this.handleBlur);
    this.trigger.ownerDocument.removeEventListener(
      "keydown",
      this.handleDocumentKeyDown
    );

    for (const cleanup of this.addonCleanups.splice(0)) {
      cleanup();
    }

    this.root.classList.remove(CLASSES.initialized, CLASSES.open);

    if (this.originalDescribedBy === null) {
      this.trigger.removeAttribute(ATTRIBUTES.describedBy);
    } else {
      this.trigger.setAttribute(
        ATTRIBUTES.describedBy,
        this.originalDescribedBy
      );
    }

    if (this.originalRole === null) {
      this.tooltip.removeAttribute(ATTRIBUTES.role);
    } else {
      this.tooltip.setAttribute(ATTRIBUTES.role, this.originalRole);
    }

    if (this.originalPlacement === null) {
      this.tooltip.removeAttribute(ATTRIBUTES.placement);
    } else {
      this.tooltip.setAttribute(
        ATTRIBUTES.placement,
        this.originalPlacement
      );
    }

    this.tooltip.hidden = this.originalHidden;

    if (this.generatedTooltipId) {
      this.tooltip.removeAttribute("id");
    }

    this.destroyed = true;
    A11yTooltip.instances.delete(this.root);

    this.dispatch(EVENTS.destroy);
  }

  private setupAddons(): void {
    for (const addon of this.options.addons) {
      const cleanup = addon.setup(this);
      if (typeof cleanup === "function") {
        this.addonCleanups.push(cleanup);
      }
    }
  }

  private handleMouseEnter(): void {
    this.hovering = true;

    if (!this.dismissedDuringActivation) {
      this.scheduleOpen("hover");
    }
  }

  private handleMouseLeave(): void {
    this.hovering = false;

    if (!this.focused) {
      this.dismissedDuringActivation = false;
      this.scheduleClose("leave");
    }
  }

  private handleFocus(): void {
    this.focused = true;
    this.clearHideTimer();

    if (!this.dismissedDuringActivation) {
      this.open("focus");
    }
  }

  private handleBlur(): void {
    this.focused = false;

    if (!this.hovering) {
      this.dismissedDuringActivation = false;
      this.close("blur");
    }
  }

  private handleDocumentKeyDown(event: KeyboardEvent): void {
    if (
      event.key !== "Escape" ||
      !this.options.closeOnEscape ||
      !this.openState
    ) {
      return;
    }

    this.dismissedDuringActivation = true;
    this.close("escape");
  }

  private scheduleOpen(reason: TooltipOpenReason): void {
    this.clearHideTimer();
    this.clearShowTimer();

    if (this.options.showDelay === 0) {
      this.open(reason);
      return;
    }

    const view = this.root.ownerDocument.defaultView;
    if (!view) {
      this.open(reason);
      return;
    }

    this.showTimer = view.setTimeout(() => {
      this.showTimer = null;

      if (this.hovering && !this.dismissedDuringActivation) {
        this.open(reason);
      }
    }, this.options.showDelay);
  }

  private scheduleClose(reason: TooltipCloseReason): void {
    this.clearShowTimer();
    this.clearHideTimer();

    if (this.options.hideDelay === 0) {
      this.close(reason);
      return;
    }

    const view = this.root.ownerDocument.defaultView;
    if (!view) {
      this.close(reason);
      return;
    }

    this.hideTimer = view.setTimeout(() => {
      this.hideTimer = null;

      if (!this.hovering && !this.focused) {
        this.close(reason);
      }
    }, this.options.hideDelay);
  }

  private clearShowTimer(): void {
    if (this.showTimer === null) {
      return;
    }

    const view = this.root.ownerDocument.defaultView;
    if (view) {
      view.clearTimeout(this.showTimer);
    }

    this.showTimer = null;
  }

  private clearHideTimer(): void {
    if (this.hideTimer === null) {
      return;
    }

    const view = this.root.ownerDocument.defaultView;
    if (view) {
      view.clearTimeout(this.hideTimer);
    }

    this.hideTimer = null;
  }

  private dispatch(
    type: string,
    detail: Omit<TooltipLifecycleDetail, "instance"> = {},
    cancelable = false
  ): boolean {
    return this.root.dispatchEvent(
      new CustomEvent<TooltipLifecycleDetail>(type, {
        bubbles: true,
        cancelable,
        detail: {
          instance: this,
          ...detail
        }
      })
    );
  }
}

export function createTooltip(
  root: HTMLElement,
  options: TooltipOptions = {}
): TooltipInstance {
  return new A11yTooltip(root, options);
}

export function initTooltipsAll(
  options: TooltipOptions = {},
  scope: ParentNode = document
): TooltipInstance[] {
  return Array.from(scope.querySelectorAll(DEFAULT_SELECTORS.root))
    .filter((root): root is HTMLElement => root instanceof HTMLElement)
    .map((root) =>
      createTooltip(root, {
        ...A11yTooltip.optionsFromDataset(root),
        ...options
      })
    );
}

export const tooltipSelectors = DEFAULT_SELECTORS;
export const tooltipEvents = EVENTS;
