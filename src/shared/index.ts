import {
  TOOLTIP_PLACEMENTS,
  type TooltipPlacement
} from "../index.js";
import {
  createAnchorName,
  mergeAnchorName,
  normalizeAnchorFallbacks,
  restoreInlineStyle,
  serializeAnchorFallbacks,
  snapshotInlineStyle,
  supportsAnchorPositioning,
  type AnchorPositioningFallback,
  type InlineStyleSnapshot
} from "../internal/anchor-positioning.js";
import {
  isPopoverOpen,
  supportsHintPopover,
  type HintPopoverElement,
  type PopoverToggleEvent
} from "../internal/hint-popover.js";

const COMPONENT_NAME = "a11y-tooltip-shared";
const ROOT_SELECTOR = "[data-a11y-shared-tooltip]";
const CONTENT_ATTRIBUTE = "data-a11y-shared-tooltip-content";
const HINT_ROOT_ATTRIBUTE =
  "data-a11y-shared-tooltip-hint-popover";

const CLASSES = Object.freeze({
  initialized: "is-shared-tooltip-initialized",
  open: "is-shared-tooltip-open"
});

export const sharedTooltipEvents = Object.freeze({
  init: `${COMPONENT_NAME}:init`,
  ready: `${COMPONENT_NAME}:ready`,
  beforeOpen: `${COMPONENT_NAME}:before-open`,
  open: `${COMPONENT_NAME}:open`,
  beforeRetarget: `${COMPONENT_NAME}:before-retarget`,
  retarget: `${COMPONENT_NAME}:retarget`,
  beforeClose: `${COMPONENT_NAME}:before-close`,
  close: `${COMPONENT_NAME}:close`,
  destroy: `${COMPONENT_NAME}:destroy`
});

export type SharedTooltipOpenReason =
  | "api"
  | "focus"
  | "hover";

export type SharedTooltipCloseReason =
  | "api"
  | "blur"
  | "content-empty"
  | "destroy"
  | "escape"
  | "leave"
  | "platform"
  | "trigger-removed";

export type SharedTooltipReason =
  | SharedTooltipOpenReason
  | SharedTooltipCloseReason;

export type SharedTooltipPositionFallback =
  AnchorPositioningFallback;

export const SHARED_TOOLTIP_RENDER_MODES =
  Object.freeze([
    "anchored",
    "hint-popover"
  ] as const);

export type SharedTooltipRenderMode =
  (typeof SHARED_TOOLTIP_RENDER_MODES)[number];

export const SHARED_TOOLTIP_SEMANTICS =
  Object.freeze([
    "visual-only",
    "describedby"
  ] as const);

export type SharedTooltipSemantics =
  (typeof SHARED_TOOLTIP_SEMANTICS)[number];

export interface SharedTooltipOptions {
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
  getContent(
    trigger: HTMLElement
  ): string | null | undefined;
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
}

interface ResolvedSharedTooltipOptions {
  triggers: string;
  getContent(
    trigger: HTMLElement
  ): string | null | undefined;
  tooltip?: HTMLElement;
  showDelay: number;
  hideDelay: number;
  placement: TooltipPlacement;
  fallbacks: readonly SharedTooltipPositionFallback[];
  renderMode: SharedTooltipRenderMode;
  semantics: SharedTooltipSemantics;
}

export interface SharedTooltipController {
  readonly container: HTMLElement;
  readonly tooltip: HTMLElement;
  readonly activeTrigger: HTMLElement | null;
  readonly isOpen: boolean;
  readonly renderMode: SharedTooltipRenderMode;
  readonly semantics: SharedTooltipSemantics;
  readonly usesNativeHint: boolean;
  showFor(
    trigger: HTMLElement,
    reason?: SharedTooltipOpenReason
  ): boolean;
  close(reason?: SharedTooltipCloseReason): boolean;
  refresh(): boolean;
  destroy(): void;
}

export interface SharedTooltipLifecycleDetail {
  controller: SharedTooltipController;
  trigger?: HTMLElement;
  previousTrigger?: HTMLElement;
  reason?: SharedTooltipReason;
}

interface AuthoredTooltipSnapshot {
  className: string | null;
  contentAttribute: string | null;
  role: string | null;
  ariaHidden: string | null;
  placement: string | null;
  id: string | null;
  popover: string | null;
  hidden: HTMLElement["hidden"];
  style: string | null;
}

interface TriggerAnchorState {
  trigger: HTMLElement;
  anchorName: InlineStyleSnapshot;
}

interface TriggerDescriptionState {
  trigger: HTMLElement;
  describedBy: string | null;
}

let generatedTooltipId = 0;

const DEFAULTS = Object.freeze({
  showDelay: 180,
  hideDelay: 100,
  placement: "top" as TooltipPlacement,
  renderMode: "anchored" as SharedTooltipRenderMode,
  semantics: "visual-only" as SharedTooltipSemantics
});

const INSTANCES =
  new WeakMap<HTMLElement, SharedTooltipControllerImpl>();

function toSafeDelay(
  value: number | undefined,
  fallback: number
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 5000
  ) {
    return fallback;
  }

  return Math.trunc(value);
}

function normalizeOptions(
  options: SharedTooltipOptions
): Readonly<ResolvedSharedTooltipOptions> {
  if (!options || typeof options !== "object") {
    throw new TypeError(
      "createSharedTooltip() requires an options object."
    );
  }

  const triggers =
    typeof options.triggers === "string"
      ? options.triggers.trim()
      : "";

  if (!triggers) {
    throw new TypeError(
      "createSharedTooltip() requires a non-empty triggers selector."
    );
  }

  if (typeof options.getContent !== "function") {
    throw new TypeError(
      "createSharedTooltip() requires getContent(trigger)."
    );
  }

  const placement = TOOLTIP_PLACEMENTS.includes(
    options.placement as TooltipPlacement
  )
    ? (options.placement as TooltipPlacement)
    : DEFAULTS.placement;

  const renderMode = SHARED_TOOLTIP_RENDER_MODES.includes(
    options.renderMode as SharedTooltipRenderMode
  )
    ? (options.renderMode as SharedTooltipRenderMode)
    : DEFAULTS.renderMode;

  const semantics = SHARED_TOOLTIP_SEMANTICS.includes(
    options.semantics as SharedTooltipSemantics
  )
    ? (options.semantics as SharedTooltipSemantics)
    : DEFAULTS.semantics;

  return Object.freeze({
    triggers,
    getContent: options.getContent,
    tooltip: options.tooltip,
    showDelay: toSafeDelay(
      options.showDelay,
      DEFAULTS.showDelay
    ),
    hideDelay: toSafeDelay(
      options.hideDelay,
      DEFAULTS.hideDelay
    ),
    placement,
    fallbacks: normalizeAnchorFallbacks(
      options.fallbacks,
      placement
    ),
    renderMode,
    semantics
  });
}

function isKeyboardFocusable(
  element: HTMLElement
): boolean {
  if (
    "disabled" in element &&
    Boolean((element as HTMLButtonElement).disabled)
  ) {
    return false;
  }

  return element.tabIndex >= 0;
}

function containsNode(
  container: HTMLElement,
  node: Node | null
): boolean {
  return Boolean(node && container.contains(node));
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

function ensureSharedTooltipId(
  tooltip: HTMLElement
): { id: string; generated: boolean } {
  const authored = tooltip.id.trim();

  if (authored) {
    return {
      id: authored,
      generated: false
    };
  }

  generatedTooltipId += 1;
  tooltip.id = `a11y-tooltip-shared-${generatedTooltipId}`;

  return {
    id: tooltip.id,
    generated: true
  };
}

function parseOffset(element: HTMLElement): number {
  const view = element.ownerDocument.defaultView;

  if (!view) {
    return 10;
  }

  const styles = view.getComputedStyle(element);
  const value =
    styles.getPropertyValue("--a11y-tooltip-offset").trim() ||
    "10px";

  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : 10;
}

function snapshotAuthoredTooltip(
  tooltip: HTMLElement
): AuthoredTooltipSnapshot {
  return {
    className: tooltip.getAttribute("class"),
    contentAttribute:
      tooltip.getAttribute(CONTENT_ATTRIBUTE),
    role: tooltip.getAttribute("role"),
    ariaHidden: tooltip.getAttribute("aria-hidden"),
    placement: tooltip.getAttribute("data-placement"),
    id: tooltip.getAttribute("id"),
    popover: tooltip.getAttribute("popover"),
    hidden: tooltip.hidden,
    style: tooltip.getAttribute("style")
  };
}

function restoreAttribute(
  element: HTMLElement,
  name: string,
  value: string | null
): void {
  if (value === null) {
    element.removeAttribute(name);
    return;
  }

  element.setAttribute(name, value);
}

class SharedTooltipControllerImpl
implements SharedTooltipController {
  readonly container: HTMLElement;
  readonly tooltip: HTMLElement;

  private readonly options:
    Readonly<ResolvedSharedTooltipOptions>;
  private readonly generatedTooltip: boolean;
  private readonly authoredTooltipSnapshot:
    AuthoredTooltipSnapshot | null;
  private readonly originalRootAttribute: string | null;
  private readonly originalHintRootAttribute: string | null;
  private readonly rootHadInitializedClass: boolean;
  private readonly rootHadOpenClass: boolean;
  private readonly anchorSupported: boolean;
  private readonly anchorName: string;
  private readonly nativeHintElement: HintPopoverElement | null;

  private descriptionTooltipId: string | null = null;
  private generatedDescriptionTooltipId = false;

  private openState = false;
  private destroyed = false;

  private focusedTrigger: HTMLElement | null = null;
  private hoveredTrigger: HTMLElement | null = null;
  private currentTrigger: HTMLElement | null = null;
  private dismissedTrigger: HTMLElement | null = null;
  private hoveringTooltip = false;

  private activeAnchorState: TriggerAnchorState | null = null;
  private activeDescriptionState:
    TriggerDescriptionState | null = null;

  private showTimer: number | null = null;
  private hideTimer: number | null = null;
  private fallbackFrame: number | null = null;
  private fallbackListenersActive = false;

  constructor(
    container: HTMLElement,
    options: SharedTooltipOptions
  ) {
    if (!(container instanceof HTMLElement)) {
      throw new TypeError(
        "createSharedTooltip() requires an HTMLElement container."
      );
    }

    this.options = normalizeOptions(options);

    try {
      container.querySelectorAll(this.options.triggers);
    } catch {
      throw new TypeError(
        `createSharedTooltip() received an invalid triggers selector: ${this.options.triggers}`
      );
    }

    if (
      this.options.tooltip !== undefined &&
      !(this.options.tooltip instanceof HTMLElement)
    ) {
      throw new TypeError(
        "Shared tooltip option tooltip must be an HTMLElement."
      );
    }

    this.container = container;
    this.generatedTooltip = !this.options.tooltip;
    this.tooltip =
      this.options.tooltip ??
      container.ownerDocument.createElement("span");

    this.authoredTooltipSnapshot = this.generatedTooltip
      ? null
      : snapshotAuthoredTooltip(this.tooltip);

    this.originalRootAttribute =
      container.getAttribute(ROOT_SELECTOR.slice(1, -1));
    this.originalHintRootAttribute =
      container.getAttribute(HINT_ROOT_ATTRIBUTE);
    this.rootHadInitializedClass =
      container.classList.contains(CLASSES.initialized);
    this.rootHadOpenClass =
      container.classList.contains(CLASSES.open);

    this.anchorSupported =
      supportsAnchorPositioning(this.tooltip);
    this.anchorName = createAnchorName(
      "--a11y-shared-tooltip-anchor"
    );

    this.nativeHintElement =
      this.options.renderMode === "hint-popover" &&
      this.anchorSupported &&
      supportsHintPopover(this.tooltip)
        ? this.tooltip
        : null;

    this.handleFocusIn = this.handleFocusIn.bind(this);
    this.handleFocusOut = this.handleFocusOut.bind(this);
    this.handlePointerOver =
      this.handlePointerOver.bind(this);
    this.handlePointerOut =
      this.handlePointerOut.bind(this);
    this.handleTooltipPointerEnter =
      this.handleTooltipPointerEnter.bind(this);
    this.handleTooltipPointerLeave =
      this.handleTooltipPointerLeave.bind(this);
    this.handleDocumentKeyDown =
      this.handleDocumentKeyDown.bind(this);
    this.handleFallbackViewportChange =
      this.handleFallbackViewportChange.bind(this);
    this.handleNativeBeforeToggle =
      this.handleNativeBeforeToggle.bind(this);
    this.handleNativeToggle =
      this.handleNativeToggle.bind(this);

    INSTANCES.set(container, this);

    try {
      this.init();
    } catch (error) {
      INSTANCES.delete(container);
      throw error;
    }
  }

  get activeTrigger(): HTMLElement | null {
    return this.currentTrigger;
  }

  get isOpen(): boolean {
    return this.openState;
  }

  get renderMode(): SharedTooltipRenderMode {
    return this.options.renderMode;
  }

  get semantics(): SharedTooltipSemantics {
    return this.options.semantics;
  }

  get usesNativeHint(): boolean {
    return this.nativeHintElement !== null;
  }

  showFor(
    trigger: HTMLElement,
    reason: SharedTooltipOpenReason = "api"
  ): boolean {
    if (
      this.destroyed ||
      !this.isOwnedTrigger(trigger) ||
      !isKeyboardFocusable(trigger)
    ) {
      return false;
    }

    if (
      this.dismissedTrigger === trigger &&
      this.isTriggerActivated(trigger)
    ) {
      return false;
    }

    this.clearHideTimer();
    this.clearShowTimer();

    return this.openOrRetarget(trigger, reason);
  }

  close(
    reason: SharedTooltipCloseReason = "api"
  ): boolean {
    if (this.destroyed && reason !== "destroy") {
      return false;
    }

    this.clearShowTimer();
    this.clearHideTimer();

    if (!this.openState) {
      return true;
    }

    const trigger = this.currentTrigger ?? undefined;
    const cancelable =
      reason !== "content-empty" &&
      reason !== "escape" &&
      reason !== "destroy" &&
      reason !== "platform" &&
      reason !== "trigger-removed";

    const allowed = this.dispatch(
      sharedTooltipEvents.beforeClose,
      {
        trigger,
        reason
      },
      cancelable
    );

    if (cancelable && !allowed) {
      return false;
    }

    if (
      (reason === "escape" || reason === "platform") &&
      this.currentTrigger
    ) {
      this.dismissedTrigger = this.currentTrigger;
    }

    this.openState = false;
    this.hideNativeHint();
    this.tooltip.hidden = true;
    this.container.classList.remove(CLASSES.open);
    this.container.ownerDocument.removeEventListener(
      "keydown",
      this.handleDocumentKeyDown
    );

    this.stopFallbackListeners();
    this.releaseActiveDescription();
    this.releaseActiveAnchor();

    const previousTrigger = this.currentTrigger ?? undefined;
    this.currentTrigger = null;

    this.dispatch(sharedTooltipEvents.close, {
      trigger: previousTrigger,
      reason
    });

    return true;
  }

  refresh(): boolean {
    if (
      this.destroyed ||
      !this.openState ||
      !this.currentTrigger
    ) {
      return false;
    }

    if (
      !containsNode(
        this.container,
        this.currentTrigger
      )
    ) {
      return this.close("trigger-removed");
    }

    const content = this.resolveContent(
      this.currentTrigger
    );

    if (!content) {
      return this.close("content-empty");
    }

    this.tooltip.textContent = content;
    this.updatePosition();

    return true;
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.close("destroy");
    this.clearShowTimer();
    this.clearHideTimer();
    this.cancelFallbackFrame();

    this.container.removeEventListener(
      "focusin",
      this.handleFocusIn
    );
    this.container.removeEventListener(
      "focusout",
      this.handleFocusOut
    );
    this.container.removeEventListener(
      "pointerover",
      this.handlePointerOver
    );
    this.container.removeEventListener(
      "pointerout",
      this.handlePointerOut
    );
    this.tooltip.removeEventListener(
      "pointerenter",
      this.handleTooltipPointerEnter
    );
    this.tooltip.removeEventListener(
      "pointerleave",
      this.handleTooltipPointerLeave
    );

    this.stopFallbackListeners();
    this.releaseActiveAnchor();

    const rootAttribute =
      ROOT_SELECTOR.slice(1, -1);

    if (this.originalRootAttribute === null) {
      this.container.removeAttribute(rootAttribute);
    } else {
      this.container.setAttribute(
        rootAttribute,
        this.originalRootAttribute
      );
    }

    if (!this.rootHadInitializedClass) {
      this.container.classList.remove(
        CLASSES.initialized
      );
    }

    if (this.rootHadOpenClass) {
      this.container.classList.add(CLASSES.open);
    } else {
      this.container.classList.remove(CLASSES.open);
    }

    if (this.generatedTooltip) {
      this.tooltip.remove();
    } else if (this.authoredTooltipSnapshot) {
      const snapshot = this.authoredTooltipSnapshot;

      restoreAttribute(
        this.tooltip,
        "class",
        snapshot.className
      );
      restoreAttribute(
        this.tooltip,
        CONTENT_ATTRIBUTE,
        snapshot.contentAttribute
      );
      restoreAttribute(
        this.tooltip,
        "role",
        snapshot.role
      );
      restoreAttribute(
        this.tooltip,
        "aria-hidden",
        snapshot.ariaHidden
      );
      restoreAttribute(
        this.tooltip,
        "data-placement",
        snapshot.placement
      );
      restoreAttribute(
        this.tooltip,
        "style",
        snapshot.style
      );
      this.tooltip.hidden = snapshot.hidden;
    }

    this.focusedTrigger = null;
    this.hoveredTrigger = null;
    this.currentTrigger = null;
    this.dismissedTrigger = null;
    this.hoveringTooltip = false;
    this.destroyed = true;

    INSTANCES.delete(this.container);

    this.dispatch(sharedTooltipEvents.destroy);
  }

  private init(): void {
    const rootAttribute =
      ROOT_SELECTOR.slice(1, -1);

    this.container.setAttribute(rootAttribute, "");
    this.container.classList.add(CLASSES.initialized);
    this.container.classList.remove(CLASSES.open);

    this.tooltip.classList.add(
      "a11y-shared-tooltip__content"
    );
    this.tooltip.setAttribute(CONTENT_ATTRIBUTE, "");
    this.tooltip.setAttribute("role", "tooltip");

    if (this.options.semantics === "visual-only") {
      this.tooltip.setAttribute("aria-hidden", "true");
    } else {
      this.tooltip.removeAttribute("aria-hidden");

      const { id, generated } =
        ensureSharedTooltipId(this.tooltip);

      this.descriptionTooltipId = id;
      this.generatedDescriptionTooltipId = generated;
    }

    this.tooltip.setAttribute(
      "data-placement",
      this.options.placement
    );
    this.tooltip.hidden = true;

    if (this.nativeHintElement) {
      this.container.setAttribute(
        HINT_ROOT_ATTRIBUTE,
        ""
      );
      this.nativeHintElement.setAttribute(
        "popover",
        "hint"
      );
      this.nativeHintElement.addEventListener(
        "beforetoggle",
        this.handleNativeBeforeToggle
      );
      this.nativeHintElement.addEventListener(
        "toggle",
        this.handleNativeToggle
      );
    }

    if (this.anchorSupported) {
      this.tooltip.style.setProperty(
        "position-anchor",
        this.anchorName
      );
      this.tooltip.style.setProperty(
        "position-try-fallbacks",
        serializeAnchorFallbacks(
          this.options.fallbacks
        )
      );
    }

    if (this.generatedTooltip) {
      this.container.ownerDocument.body.append(
        this.tooltip
      );
    }

    this.container.addEventListener(
      "focusin",
      this.handleFocusIn
    );
    this.container.addEventListener(
      "focusout",
      this.handleFocusOut
    );
    this.container.addEventListener(
      "pointerover",
      this.handlePointerOver
    );
    this.container.addEventListener(
      "pointerout",
      this.handlePointerOut
    );
    this.tooltip.addEventListener(
      "pointerenter",
      this.handleTooltipPointerEnter
    );
    this.tooltip.addEventListener(
      "pointerleave",
      this.handleTooltipPointerLeave
    );

    this.dispatch(sharedTooltipEvents.init);
    this.dispatch(sharedTooltipEvents.ready);
  }

  private resolveContent(
    trigger: HTMLElement
  ): string {
    try {
      return String(
        this.options.getContent(trigger) ?? ""
      ).trim();
    } catch {
      return "";
    }
  }

  private resolveOwnedTrigger(
    node: EventTarget | Node | null
  ): HTMLElement | null {
    if (!(node instanceof Element)) {
      return null;
    }

    const trigger = node.closest(
      this.options.triggers
    );

    if (
      !(trigger instanceof HTMLElement) ||
      !containsNode(this.container, trigger)
    ) {
      return null;
    }

    const owner = trigger.closest(ROOT_SELECTOR);

    return owner === this.container
      ? trigger
      : null;
  }

  private isOwnedTrigger(
    trigger: HTMLElement
  ): boolean {
    return (
      trigger.matches(this.options.triggers) &&
      containsNode(this.container, trigger) &&
      trigger.closest(ROOT_SELECTOR) === this.container
    );
  }

  private isTriggerActivated(
    trigger: HTMLElement
  ): boolean {
    return (
      this.focusedTrigger === trigger ||
      this.hoveredTrigger === trigger
    );
  }

  private desiredTrigger(): HTMLElement | null {
    if (
      this.focusedTrigger &&
      containsNode(
        this.container,
        this.focusedTrigger
      )
    ) {
      return this.focusedTrigger;
    }

    if (
      this.hoveredTrigger &&
      containsNode(
        this.container,
        this.hoveredTrigger
      )
    ) {
      return this.hoveredTrigger;
    }

    if (
      this.hoveringTooltip &&
      this.currentTrigger &&
      containsNode(
        this.container,
        this.currentTrigger
      )
    ) {
      return this.currentTrigger;
    }

    return null;
  }

  private maybeResetDismissedTrigger(): void {
    if (
      this.dismissedTrigger &&
      !this.isTriggerActivated(
        this.dismissedTrigger
      )
    ) {
      this.dismissedTrigger = null;
    }
  }

  private reconcile(
    reason:
      | "focus"
      | "hover"
      | "blur"
      | "leave"
  ): void {
    this.maybeResetDismissedTrigger();

    if (
      this.openState &&
      this.currentTrigger &&
      !containsNode(
        this.container,
        this.currentTrigger
      )
    ) {
      this.close("trigger-removed");
      return;
    }

    const desired = this.desiredTrigger();

    if (!desired) {
      this.scheduleClose(
        reason === "blur" ? "blur" : "leave"
      );
      return;
    }

    if (
      this.dismissedTrigger === desired ||
      !isKeyboardFocusable(desired)
    ) {
      this.clearShowTimer();
      return;
    }

    this.clearHideTimer();

    if (this.openState) {
      if (this.currentTrigger !== desired) {
        this.openOrRetarget(
          desired,
          this.focusedTrigger === desired
            ? "focus"
            : "hover"
        );
      }

      return;
    }

    const openReason:
      SharedTooltipOpenReason =
      this.focusedTrigger === desired
        ? "focus"
        : "hover";

    if (
      openReason === "focus" ||
      this.options.showDelay === 0
    ) {
      this.openOrRetarget(
        desired,
        openReason
      );
      return;
    }

    this.scheduleOpen(desired, openReason);
  }

  private openOrRetarget(
    trigger: HTMLElement,
    reason: SharedTooltipOpenReason
  ): boolean {
    if (
      !this.isOwnedTrigger(trigger) ||
      !isKeyboardFocusable(trigger)
    ) {
      return false;
    }

    const content = this.resolveContent(trigger);

    if (!content) {
      if (this.openState) {
        this.close("content-empty");
      }

      return false;
    }

    if (this.openState && this.currentTrigger) {
      if (this.currentTrigger === trigger) {
        this.tooltip.textContent = content;
        this.updatePosition();
        return true;
      }

      const previousTrigger =
        this.currentTrigger;

      if (
        !this.dispatch(
          sharedTooltipEvents.beforeRetarget,
          {
            trigger,
            previousTrigger,
            reason
          },
          true
        )
      ) {
        return false;
      }

      this.assignActiveTrigger(trigger);
      this.tooltip.textContent = content;
      this.updatePosition();

      if (!this.retargetNativeHint(trigger)) {
        this.close("platform");
        return false;
      }

      this.dispatch(
        sharedTooltipEvents.retarget,
        {
          trigger,
          previousTrigger,
          reason
        }
      );

      return true;
    }

    if (
      !this.dispatch(
        sharedTooltipEvents.beforeOpen,
        {
          trigger,
          reason
        },
        true
      )
    ) {
      return false;
    }

    this.assignActiveTrigger(trigger);
    this.tooltip.textContent = content;
    this.tooltip.hidden = false;
    this.openState = true;
    this.container.classList.add(
      CLASSES.open
    );

    this.container.ownerDocument.addEventListener(
      "keydown",
      this.handleDocumentKeyDown
    );

    this.updatePosition();

    if (!this.showNativeHint(trigger)) {
      this.close("platform");
      return false;
    }

    this.dispatch(sharedTooltipEvents.open, {
      trigger,
      reason
    });

    return true;
  }

  private assignActiveTrigger(
    trigger: HTMLElement
  ): void {
    this.releaseActiveDescription();
    this.releaseActiveAnchor();
    this.currentTrigger = trigger;
    this.assignActiveDescription(trigger);

    if (!this.anchorSupported) {
      return;
    }

    const anchorName = snapshotInlineStyle(
      trigger,
      "anchor-name"
    );

    trigger.style.setProperty(
      "anchor-name",
      mergeAnchorName(
        anchorName.value,
        this.anchorName
      ),
      anchorName.priority
    );

    this.activeAnchorState = {
      trigger,
      anchorName
    };
  }

  private assignActiveDescription(
    trigger: HTMLElement
  ): void {
    if (
      this.options.semantics !== "describedby" ||
      !this.descriptionTooltipId
    ) {
      return;
    }

    const describedBy =
      trigger.getAttribute("aria-describedby");

    const tokens = uniqueTokens([
      ...tokenize(describedBy),
      this.descriptionTooltipId
    ]);

    trigger.setAttribute(
      "aria-describedby",
      tokens.join(" ")
    );

    this.activeDescriptionState = {
      trigger,
      describedBy
    };
  }

  private releaseActiveDescription(): void {
    if (!this.activeDescriptionState) {
      return;
    }

    const { trigger, describedBy } =
      this.activeDescriptionState;

    restoreAttribute(
      trigger,
      "aria-describedby",
      describedBy
    );

    this.activeDescriptionState = null;
  }

  private releaseActiveAnchor(): void {
    if (!this.activeAnchorState) {
      return;
    }

    restoreInlineStyle(
      this.activeAnchorState.trigger,
      "anchor-name",
      this.activeAnchorState.anchorName
    );

    this.activeAnchorState = null;
  }

  private showNativeHint(
    trigger: HTMLElement
  ): boolean {
    const tooltip = this.nativeHintElement;

    if (!tooltip) {
      return true;
    }

    if (isPopoverOpen(tooltip)) {
      return true;
    }

    try {
      tooltip.showPopover({
        source: trigger
      });

      return isPopoverOpen(tooltip);
    } catch {
      return false;
    }
  }

  private retargetNativeHint(
    trigger: HTMLElement
  ): boolean {
    const tooltip = this.nativeHintElement;

    if (!tooltip) {
      return true;
    }

    if (!isPopoverOpen(tooltip)) {
      return this.showNativeHint(trigger);
    }

    try {
      // A synchronous hide/show updates the popover source before the
      // browser gets a rendering opportunity.
      tooltip.hidePopover();
      tooltip.showPopover({
        source: trigger
      });

      return isPopoverOpen(tooltip);
    } catch {
      return false;
    }
  }

  private hideNativeHint(): void {
    const tooltip = this.nativeHintElement;

    if (!tooltip || !isPopoverOpen(tooltip)) {
      return;
    }

    try {
      tooltip.hidePopover();
    } catch {
      // Core state still closes and destroy restores authored state.
    }
  }

  private handleNativeBeforeToggle(
    event: Event
  ): void {
    const toggleEvent =
      event as PopoverToggleEvent;

    if (
      toggleEvent.newState === "open" &&
      !this.openState
    ) {
      event.preventDefault();
    }
  }

  private handleNativeToggle(
    event: Event
  ): void {
    const toggleEvent =
      event as PopoverToggleEvent;

    if (
      toggleEvent.newState === "closed" &&
      this.openState &&
      this.nativeHintElement &&
      !isPopoverOpen(this.nativeHintElement)
    ) {
      this.close("platform");
    }
  }

  private updatePosition(): void {
    if (
      !this.openState ||
      !this.currentTrigger
    ) {
      return;
    }

    if (this.anchorSupported) {
      this.stopFallbackListeners();
      return;
    }

    this.startFallbackListeners();
    this.positionFallback();
  }

  private positionFallback(): void {
    if (
      !this.openState ||
      !this.currentTrigger ||
      this.anchorSupported
    ) {
      return;
    }

    const view =
      this.container.ownerDocument.defaultView;

    if (!view) {
      return;
    }

    const triggerRect =
      this.currentTrigger.getBoundingClientRect();
    const tooltipRect =
      this.tooltip.getBoundingClientRect();
    const offset = parseOffset(this.tooltip);
    const edge = 8;

    let left =
      triggerRect.left +
      triggerRect.width / 2 -
      tooltipRect.width / 2;
    let top =
      triggerRect.top +
      triggerRect.height / 2 -
      tooltipRect.height / 2;

    switch (this.options.placement) {
      case "top":
        top =
          triggerRect.top -
          tooltipRect.height -
          offset;
        break;
      case "right":
        left =
          triggerRect.right + offset;
        break;
      case "bottom":
        top =
          triggerRect.bottom + offset;
        break;
      case "left":
        left =
          triggerRect.left -
          tooltipRect.width -
          offset;
        break;
    }

    left = Math.min(
      Math.max(left, edge),
      Math.max(
        edge,
        view.innerWidth -
          tooltipRect.width -
          edge
      )
    );

    top = Math.min(
      Math.max(top, edge),
      Math.max(
        edge,
        view.innerHeight -
          tooltipRect.height -
          edge
      )
    );

    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

  private scheduleOpen(
    trigger: HTMLElement,
    reason: SharedTooltipOpenReason
  ): void {
    this.clearShowTimer();

    const view =
      this.container.ownerDocument.defaultView;

    if (!view) {
      this.openOrRetarget(trigger, reason);
      return;
    }

    this.showTimer = view.setTimeout(() => {
      this.showTimer = null;

      if (
        this.desiredTrigger() === trigger &&
        this.dismissedTrigger !== trigger
      ) {
        this.openOrRetarget(trigger, reason);
      }
    }, this.options.showDelay);
  }

  private scheduleClose(
    reason: SharedTooltipCloseReason
  ): void {
    this.clearShowTimer();
    this.clearHideTimer();

    if (!this.openState) {
      return;
    }

    if (this.options.hideDelay === 0) {
      this.close(reason);
      return;
    }

    const view =
      this.container.ownerDocument.defaultView;

    if (!view) {
      this.close(reason);
      return;
    }

    this.hideTimer = view.setTimeout(() => {
      this.hideTimer = null;

      if (!this.desiredTrigger()) {
        this.close(reason);
      }
    }, this.options.hideDelay);
  }

  private clearShowTimer(): void {
    if (this.showTimer === null) {
      return;
    }

    const view =
      this.container.ownerDocument.defaultView;

    view?.clearTimeout(this.showTimer);
    this.showTimer = null;
  }

  private clearHideTimer(): void {
    if (this.hideTimer === null) {
      return;
    }

    const view =
      this.container.ownerDocument.defaultView;

    view?.clearTimeout(this.hideTimer);
    this.hideTimer = null;
  }

  private startFallbackListeners(): void {
    if (this.fallbackListenersActive) {
      return;
    }

    const view =
      this.container.ownerDocument.defaultView;

    if (!view) {
      return;
    }

    this.fallbackListenersActive = true;
    view.addEventListener(
      "resize",
      this.handleFallbackViewportChange
    );
    this.container.ownerDocument.addEventListener(
      "scroll",
      this.handleFallbackViewportChange,
      true
    );
  }

  private stopFallbackListeners(): void {
    if (!this.fallbackListenersActive) {
      return;
    }

    const view =
      this.container.ownerDocument.defaultView;

    view?.removeEventListener(
      "resize",
      this.handleFallbackViewportChange
    );

    this.container.ownerDocument.removeEventListener(
      "scroll",
      this.handleFallbackViewportChange,
      true
    );

    this.fallbackListenersActive = false;
    this.cancelFallbackFrame();
  }

  private handleFallbackViewportChange(): void {
    const view =
      this.container.ownerDocument.defaultView;

    if (!view || this.fallbackFrame !== null) {
      return;
    }

    this.fallbackFrame =
      view.requestAnimationFrame(() => {
        this.fallbackFrame = null;
        this.positionFallback();
      });
  }

  private cancelFallbackFrame(): void {
    if (this.fallbackFrame === null) {
      return;
    }

    const view =
      this.container.ownerDocument.defaultView;

    if (view) {
      view.cancelAnimationFrame(
        this.fallbackFrame
      );
    }

    this.fallbackFrame = null;
  }

  private handleFocusIn(event: FocusEvent): void {
    const trigger =
      this.resolveOwnedTrigger(event.target);

    if (!trigger) {
      return;
    }

    if (
      this.dismissedTrigger &&
      this.dismissedTrigger !== trigger
    ) {
      this.dismissedTrigger = null;
    }

    this.focusedTrigger = trigger;
    this.reconcile("focus");
  }

  private handleFocusOut(event: FocusEvent): void {
    const trigger =
      this.resolveOwnedTrigger(event.target);

    if (
      !trigger ||
      this.focusedTrigger !== trigger
    ) {
      return;
    }

    const next =
      this.resolveOwnedTrigger(event.relatedTarget);

    this.focusedTrigger = next;
    this.reconcile(
      next ? "focus" : "blur"
    );
  }

  private handlePointerOver(
    event: PointerEvent
  ): void {
    const trigger =
      this.resolveOwnedTrigger(event.target);

    if (!trigger) {
      return;
    }

    if (
      event.relatedTarget instanceof Node &&
      trigger.contains(event.relatedTarget)
    ) {
      return;
    }

    if (
      this.dismissedTrigger &&
      this.dismissedTrigger !== trigger
    ) {
      this.dismissedTrigger = null;
    }

    this.hoveredTrigger = trigger;
    this.reconcile("hover");
  }

  private handlePointerOut(
    event: PointerEvent
  ): void {
    const trigger =
      this.resolveOwnedTrigger(event.target);

    if (
      !trigger ||
      this.hoveredTrigger !== trigger
    ) {
      return;
    }

    const related = event.relatedTarget;

    if (
      related instanceof Node &&
      trigger.contains(related)
    ) {
      return;
    }

    const next =
      this.resolveOwnedTrigger(related);

    if (next) {
      this.hoveredTrigger = next;
      this.reconcile("hover");
      return;
    }

    if (
      related instanceof Node &&
      this.tooltip.contains(related)
    ) {
      this.hoveredTrigger = null;
      this.hoveringTooltip = true;
      this.reconcile("leave");
      return;
    }

    this.hoveredTrigger = null;
    this.reconcile("leave");
  }

  private handleTooltipPointerEnter(): void {
    this.hoveringTooltip = true;
    this.clearHideTimer();
  }

  private handleTooltipPointerLeave(
    event: PointerEvent
  ): void {
    this.hoveringTooltip = false;

    const next =
      this.resolveOwnedTrigger(event.relatedTarget);

    if (next) {
      this.hoveredTrigger = next;
    }

    this.reconcile("leave");
  }

  private handleDocumentKeyDown(
    event: KeyboardEvent
  ): void {
    if (
      event.key !== "Escape" ||
      !this.openState
    ) {
      return;
    }

    this.close("escape");
  }

  private dispatch(
    type: string,
    detail: Omit<
      SharedTooltipLifecycleDetail,
      "controller"
    > = {},
    cancelable = false
  ): boolean {
    return this.container.dispatchEvent(
      new CustomEvent<SharedTooltipLifecycleDetail>(
        type,
        {
          bubbles: true,
          cancelable,
          detail: {
            controller: this,
            ...detail
          }
        }
      )
    );
  }
}

export function createSharedTooltip(
  container: HTMLElement,
  options: SharedTooltipOptions
): SharedTooltipController {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError(
      "createSharedTooltip() requires an HTMLElement container."
    );
  }

  const existing = INSTANCES.get(container);

  if (existing) {
    return existing;
  }

  return new SharedTooltipControllerImpl(
    container,
    options
  );
}

export const sharedTooltipSelectors =
  Object.freeze({
    root: ROOT_SELECTOR,
    content: `[${CONTENT_ATTRIBUTE}]`
  });
