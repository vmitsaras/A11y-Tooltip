import { TOOLTIP_PLACEMENTS } from "../index.js";
import { a as mergeAnchorName, c as serializeAnchorFallbacks, i as createAnchorName, l as snapshotInlineStyle, n as supportsHintPopover, o as normalizeAnchorFallbacks, s as restoreInlineStyle, t as isPopoverOpen, u as supportsAnchorPositioning } from "../hint-popover-CGYFj02V.js";
//#region src/internal/waapi-flip-motion.ts
function prefersReducedMotion(tooltip) {
	const view = tooltip.ownerDocument.defaultView;
	return Boolean(view?.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}
function positionDelta(from, to) {
	return {
		x: from.left - to.left,
		y: from.top - to.top
	};
}
function anchoredLayoutPosition(tooltip, view) {
	const style = view.getComputedStyle(tooltip);
	const positionAnchor = style.getPropertyValue("position-anchor");
	if (style.position !== "fixed" || tooltip.offsetParent !== null || !positionAnchor || positionAnchor === "auto" || style.translate !== "none" && Boolean(style.translate)) return null;
	return {
		left: tooltip.offsetLeft,
		top: tooltip.offsetTop
	};
}
/**
* Creates a zero-dependency WAAPI FLIP controller for shared-tooltip
* retargeting.
*
* Only visual displacement is animated. Content, ARIA ownership, anchor
* ownership, and controller state update synchronously before the animation.
*/
function createWaapiFlipMotionController(options) {
	let animation = null;
	let pendingFrame = null;
	let pendingView = null;
	let pendingOrigin = null;
	let restoreTranslate = null;
	const releaseHold = () => {
		restoreTranslate?.();
		restoreTranslate = null;
	};
	const cancel = () => {
		if (pendingFrame !== null) {
			pendingView?.cancelAnimationFrame(pendingFrame);
			pendingFrame = null;
			pendingView = null;
			pendingOrigin = null;
		}
		releaseHold();
		if (!animation) return;
		animation.cancel();
		animation = null;
	};
	return {
		retarget(tooltip, update) {
			const before = pendingOrigin ?? tooltip.getBoundingClientRect();
			cancel();
			const result = update();
			const view = tooltip.ownerDocument.defaultView;
			if (options.duration <= 0 || prefersReducedMotion(tooltip) || typeof tooltip.animate !== "function" || !view?.requestAnimationFrame) return result;
			pendingView = view;
			pendingOrigin = before;
			const previousTranslate = tooltip.style.getPropertyValue("translate");
			const previousPriority = tooltip.style.getPropertyPriority("translate");
			restoreTranslate = () => {
				if (previousTranslate) tooltip.style.setProperty("translate", previousTranslate, previousPriority);
				else tooltip.style.removeProperty("translate");
			};
			const holdAtOrigin = () => {
				releaseHold();
				const current = tooltip.getBoundingClientRect();
				const layout = anchoredLayoutPosition(tooltip, view);
				const x = before.left - (layout?.left ?? current.left);
				const y = before.top - (layout?.top ?? current.top);
				tooltip.style.setProperty("translate", `${x}px ${y}px`);
				restoreTranslate = () => {
					if (previousTranslate) tooltip.style.setProperty("translate", previousTranslate, previousPriority);
					else tooltip.style.removeProperty("translate");
				};
			};
			holdAtOrigin();
			pendingFrame = view.requestAnimationFrame(() => {
				holdAtOrigin();
				pendingFrame = view.requestAnimationFrame(() => {
					pendingFrame = null;
					pendingView = null;
					pendingOrigin = null;
					releaseHold();
					if (!tooltip.isConnected || tooltip.hidden) return;
					const after = tooltip.getBoundingClientRect();
					const layout = anchoredLayoutPosition(tooltip, view);
					const destination = layout ? new DOMRect(layout.left, layout.top, after.width, after.height) : after;
					const { x, y } = positionDelta(before, destination);
					if (Math.abs(x) < .5 && Math.abs(y) < .5) return;
					try {
						const nextAnimation = tooltip.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: "translate(0, 0)" }], {
							duration: options.duration,
							easing: options.easing,
							fill: "both"
						});
						animation = nextAnimation;
						nextAnimation.addEventListener("finish", () => {
							if (animation !== nextAnimation) return;
							nextAnimation.cancel();
							animation = null;
						}, { once: true });
						nextAnimation.addEventListener("cancel", () => {
							if (animation === nextAnimation) animation = null;
						}, { once: true });
					} catch {
						animation = null;
					}
				});
			});
			return result;
		},
		cancel
	};
}
//#endregion
//#region src/shared/index.ts
const COMPONENT_NAME = "a11y-tooltip-shared";
const ROOT_SELECTOR = "[data-a11y-shared-tooltip]";
const CONTENT_ATTRIBUTE = "data-a11y-shared-tooltip-content";
const HINT_ROOT_ATTRIBUTE = "data-a11y-shared-tooltip-hint-popover";
const CLASSES = Object.freeze({
	initialized: "is-shared-tooltip-initialized",
	open: "is-shared-tooltip-open"
});
const sharedTooltipEvents = Object.freeze({
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
const SHARED_TOOLTIP_RENDER_MODES = Object.freeze(["anchored", "hint-popover"]);
const SHARED_TOOLTIP_SEMANTICS = Object.freeze(["visual-only", "describedby"]);
const SHARED_TOOLTIP_MOTIONS = Object.freeze(["none", "move"]);
let generatedTooltipId = 0;
const DEFAULTS = Object.freeze({
	showDelay: 180,
	hideDelay: 100,
	placement: "top",
	renderMode: "anchored",
	semantics: "visual-only",
	motion: "none",
	motionDuration: 180,
	motionEasing: "cubic-bezier(0.2, 0.8, 0.2, 1)"
});
const INSTANCES = /* @__PURE__ */ new WeakMap();
function toSafeDelay(value, fallback) {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 5e3) return fallback;
	return Math.trunc(value);
}
function normalizeOptions(options) {
	if (!options || typeof options !== "object") throw new TypeError("createSharedTooltip() requires an options object.");
	const triggers = typeof options.triggers === "string" ? options.triggers.trim() : "";
	if (!triggers) throw new TypeError("createSharedTooltip() requires a non-empty triggers selector.");
	if (typeof options.getContent !== "function") throw new TypeError("createSharedTooltip() requires getContent(trigger).");
	const placement = TOOLTIP_PLACEMENTS.includes(options.placement) ? options.placement : DEFAULTS.placement;
	const renderMode = SHARED_TOOLTIP_RENDER_MODES.includes(options.renderMode) ? options.renderMode : DEFAULTS.renderMode;
	const semantics = SHARED_TOOLTIP_SEMANTICS.includes(options.semantics) ? options.semantics : DEFAULTS.semantics;
	const motion = SHARED_TOOLTIP_MOTIONS.includes(options.motion) ? options.motion : DEFAULTS.motion;
	const motionEasing = typeof options.motionEasing === "string" && options.motionEasing.trim().length > 0 ? options.motionEasing.trim() : DEFAULTS.motionEasing;
	return Object.freeze({
		triggers,
		getContent: options.getContent,
		tooltip: options.tooltip,
		showDelay: toSafeDelay(options.showDelay, DEFAULTS.showDelay),
		hideDelay: toSafeDelay(options.hideDelay, DEFAULTS.hideDelay),
		placement,
		fallbacks: normalizeAnchorFallbacks(options.fallbacks, placement),
		renderMode,
		semantics,
		motion,
		motionDuration: toSafeDelay(options.motionDuration, DEFAULTS.motionDuration),
		motionEasing
	});
}
function isKeyboardFocusable(element) {
	if ("disabled" in element && Boolean(element.disabled)) return false;
	return element.tabIndex >= 0;
}
function containsNode(container, node) {
	return Boolean(node && container.contains(node));
}
function tokenize(value) {
	return String(value ?? "").trim().split(/\s+/u).filter(Boolean);
}
function uniqueTokens(tokens) {
	return Array.from(new Set(tokens));
}
function ensureSharedTooltipId(tooltip) {
	const authored = tooltip.id.trim();
	if (authored) return {
		id: authored,
		generated: false
	};
	let candidate = "";
	do {
		generatedTooltipId += 1;
		candidate = `a11y-tooltip-shared-${generatedTooltipId}`;
	} while (tooltip.ownerDocument.getElementById(candidate));
	tooltip.id = candidate;
	return {
		id: tooltip.id,
		generated: true
	};
}
function hasDuplicateId(element) {
	const id = element.id.trim();
	if (!id) return false;
	return Array.from(element.ownerDocument.querySelectorAll("[id]")).filter((candidate) => candidate.id === id).length > 1;
}
function parseOffset(element) {
	const view = element.ownerDocument.defaultView;
	if (!view) return 10;
	const value = view.getComputedStyle(element).getPropertyValue("--a11y-tooltip-offset").trim() || "10px";
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : 10;
}
function snapshotAuthoredTooltip(tooltip) {
	return {
		className: tooltip.getAttribute("class"),
		contentAttribute: tooltip.getAttribute(CONTENT_ATTRIBUTE),
		role: tooltip.getAttribute("role"),
		ariaHidden: tooltip.getAttribute("aria-hidden"),
		placement: tooltip.getAttribute("data-placement"),
		id: tooltip.getAttribute("id"),
		popover: tooltip.getAttribute("popover"),
		hidden: tooltip.hidden,
		style: tooltip.getAttribute("style")
	};
}
function restoreAttribute(element, name, value) {
	if (value === null) {
		element.removeAttribute(name);
		return;
	}
	element.setAttribute(name, value);
}
var SharedTooltipControllerImpl = class {
	container;
	tooltip;
	options;
	generatedTooltip;
	authoredTooltipSnapshot;
	originalRootAttribute;
	originalHintRootAttribute;
	rootHadInitializedClass;
	rootHadOpenClass;
	anchorSupported;
	anchorName;
	nativeHintElement;
	flipMotion;
	descriptionTooltipId = null;
	openState = false;
	destroyed = false;
	focusedTrigger = null;
	hoveredTrigger = null;
	currentTrigger = null;
	dismissedTrigger = null;
	hoveringTooltip = false;
	activeAnchorState = null;
	activeDescriptionState = null;
	showTimer = null;
	hideTimer = null;
	fallbackFrame = null;
	fallbackListenersActive = false;
	constructor(container, options) {
		if (!(container instanceof HTMLElement)) throw new TypeError("createSharedTooltip() requires an HTMLElement container.");
		this.options = normalizeOptions(options);
		try {
			container.querySelectorAll(this.options.triggers);
		} catch {
			throw new TypeError(`createSharedTooltip() received an invalid triggers selector: ${this.options.triggers}`);
		}
		if (this.options.tooltip !== void 0 && !(this.options.tooltip instanceof HTMLElement)) throw new TypeError("Shared tooltip option tooltip must be an HTMLElement.");
		this.container = container;
		this.generatedTooltip = !this.options.tooltip;
		this.tooltip = this.options.tooltip ?? container.ownerDocument.createElement("span");
		this.authoredTooltipSnapshot = this.generatedTooltip ? null : snapshotAuthoredTooltip(this.tooltip);
		this.originalRootAttribute = container.getAttribute(ROOT_SELECTOR.slice(1, -1));
		this.originalHintRootAttribute = container.getAttribute(HINT_ROOT_ATTRIBUTE);
		this.rootHadInitializedClass = container.classList.contains(CLASSES.initialized);
		this.rootHadOpenClass = container.classList.contains(CLASSES.open);
		this.anchorSupported = supportsAnchorPositioning(this.tooltip);
		this.anchorName = createAnchorName("--a11y-shared-tooltip-anchor");
		this.nativeHintElement = this.options.renderMode === "hint-popover" && this.anchorSupported && supportsHintPopover(this.tooltip) ? this.tooltip : null;
		this.flipMotion = this.options.motion === "move" ? createWaapiFlipMotionController({
			duration: this.options.motionDuration,
			easing: this.options.motionEasing
		}) : null;
		this.handleFocusIn = this.handleFocusIn.bind(this);
		this.handleFocusOut = this.handleFocusOut.bind(this);
		this.handlePointerOver = this.handlePointerOver.bind(this);
		this.handlePointerOut = this.handlePointerOut.bind(this);
		this.handleTooltipPointerEnter = this.handleTooltipPointerEnter.bind(this);
		this.handleTooltipPointerLeave = this.handleTooltipPointerLeave.bind(this);
		this.handleDocumentKeyDown = this.handleDocumentKeyDown.bind(this);
		this.handleFallbackViewportChange = this.handleFallbackViewportChange.bind(this);
		this.handleNativeBeforeToggle = this.handleNativeBeforeToggle.bind(this);
		this.handleNativeToggle = this.handleNativeToggle.bind(this);
		INSTANCES.set(container, this);
		try {
			this.init();
		} catch (error) {
			INSTANCES.delete(container);
			throw error;
		}
	}
	get activeTrigger() {
		return this.currentTrigger;
	}
	get isOpen() {
		return this.openState;
	}
	get renderMode() {
		return this.options.renderMode;
	}
	get semantics() {
		return this.options.semantics;
	}
	get motion() {
		return this.options.motion;
	}
	get usesNativeHint() {
		return this.nativeHintElement !== null;
	}
	showFor(trigger, reason = "api") {
		if (this.destroyed || !this.isOwnedTrigger(trigger) || !isKeyboardFocusable(trigger)) return false;
		if (this.dismissedTrigger === trigger && this.isTriggerActivated(trigger)) return false;
		this.clearHideTimer();
		this.clearShowTimer();
		return this.openOrRetarget(trigger, reason);
	}
	close(reason = "api") {
		if (this.destroyed && reason !== "destroy") return false;
		this.clearShowTimer();
		this.clearHideTimer();
		if (!this.openState) return true;
		const trigger = this.currentTrigger ?? void 0;
		const cancelable = reason !== "content-empty" && reason !== "escape" && reason !== "destroy" && reason !== "platform" && reason !== "trigger-removed";
		const allowed = this.dispatch(sharedTooltipEvents.beforeClose, {
			trigger,
			reason
		}, cancelable);
		if (cancelable && !allowed) return false;
		if ((reason === "escape" || reason === "platform") && this.currentTrigger) this.dismissedTrigger = this.currentTrigger;
		this.openState = false;
		this.flipMotion?.cancel();
		this.hideNativeHint();
		this.tooltip.hidden = true;
		this.container.classList.remove(CLASSES.open);
		this.container.ownerDocument.removeEventListener("keydown", this.handleDocumentKeyDown);
		this.stopFallbackListeners();
		this.releaseActiveDescription();
		this.releaseActiveAnchor();
		const previousTrigger = this.currentTrigger ?? void 0;
		this.currentTrigger = null;
		this.dispatch(sharedTooltipEvents.close, {
			trigger: previousTrigger,
			reason
		});
		return true;
	}
	refresh() {
		if (this.destroyed || !this.openState || !this.currentTrigger) return false;
		if (!containsNode(this.container, this.currentTrigger)) return this.close("trigger-removed");
		const content = this.resolveContent(this.currentTrigger);
		if (!content) return this.close("content-empty");
		this.tooltip.textContent = content;
		this.updatePosition();
		return true;
	}
	destroy() {
		if (this.destroyed) return;
		this.close("destroy");
		this.clearShowTimer();
		this.clearHideTimer();
		this.cancelFallbackFrame();
		this.container.removeEventListener("focusin", this.handleFocusIn);
		this.container.removeEventListener("focusout", this.handleFocusOut);
		this.container.removeEventListener("pointerover", this.handlePointerOver);
		this.container.removeEventListener("pointerout", this.handlePointerOut);
		this.tooltip.removeEventListener("pointerenter", this.handleTooltipPointerEnter);
		this.tooltip.removeEventListener("pointerleave", this.handleTooltipPointerLeave);
		if (this.nativeHintElement) {
			this.nativeHintElement.removeEventListener("beforetoggle", this.handleNativeBeforeToggle);
			this.nativeHintElement.removeEventListener("toggle", this.handleNativeToggle);
		}
		this.stopFallbackListeners();
		this.releaseActiveAnchor();
		const rootAttribute = ROOT_SELECTOR.slice(1, -1);
		if (this.originalRootAttribute === null) this.container.removeAttribute(rootAttribute);
		else this.container.setAttribute(rootAttribute, this.originalRootAttribute);
		restoreAttribute(this.container, HINT_ROOT_ATTRIBUTE, this.originalHintRootAttribute);
		if (!this.rootHadInitializedClass) this.container.classList.remove(CLASSES.initialized);
		if (this.rootHadOpenClass) this.container.classList.add(CLASSES.open);
		else this.container.classList.remove(CLASSES.open);
		if (this.generatedTooltip) this.tooltip.remove();
		else if (this.authoredTooltipSnapshot) {
			const snapshot = this.authoredTooltipSnapshot;
			restoreAttribute(this.tooltip, "class", snapshot.className);
			restoreAttribute(this.tooltip, CONTENT_ATTRIBUTE, snapshot.contentAttribute);
			restoreAttribute(this.tooltip, "role", snapshot.role);
			restoreAttribute(this.tooltip, "aria-hidden", snapshot.ariaHidden);
			restoreAttribute(this.tooltip, "data-placement", snapshot.placement);
			restoreAttribute(this.tooltip, "id", snapshot.id);
			restoreAttribute(this.tooltip, "popover", snapshot.popover);
			restoreAttribute(this.tooltip, "style", snapshot.style);
			this.tooltip.hidden = snapshot.hidden;
		}
		this.focusedTrigger = null;
		this.hoveredTrigger = null;
		this.currentTrigger = null;
		this.dismissedTrigger = null;
		this.hoveringTooltip = false;
		this.descriptionTooltipId = null;
		this.destroyed = true;
		INSTANCES.delete(this.container);
		this.dispatch(sharedTooltipEvents.destroy);
	}
	init() {
		if (this.options.semantics === "describedby") {
			const { id, generated } = ensureSharedTooltipId(this.tooltip);
			if (hasDuplicateId(this.tooltip)) {
				if (generated) this.tooltip.removeAttribute("id");
				throw new TypeError(`Shared tooltip id "${id}" must be unique when semantics is "describedby".`);
			}
			this.descriptionTooltipId = id;
		}
		const rootAttribute = ROOT_SELECTOR.slice(1, -1);
		this.container.setAttribute(rootAttribute, "");
		this.container.classList.add(CLASSES.initialized);
		this.container.classList.remove(CLASSES.open);
		this.tooltip.classList.add("a11y-shared-tooltip__content");
		this.tooltip.setAttribute(CONTENT_ATTRIBUTE, "");
		this.tooltip.setAttribute("role", "tooltip");
		if (this.options.semantics === "visual-only") this.tooltip.setAttribute("aria-hidden", "true");
		else this.tooltip.removeAttribute("aria-hidden");
		this.tooltip.setAttribute("data-placement", this.options.placement);
		this.tooltip.hidden = true;
		if (this.nativeHintElement) {
			this.container.setAttribute(HINT_ROOT_ATTRIBUTE, "");
			this.nativeHintElement.setAttribute("popover", "hint");
			this.nativeHintElement.addEventListener("beforetoggle", this.handleNativeBeforeToggle);
			this.nativeHintElement.addEventListener("toggle", this.handleNativeToggle);
		}
		if (this.anchorSupported) {
			this.tooltip.style.setProperty("position-anchor", this.anchorName);
			this.tooltip.style.setProperty("position-try-fallbacks", serializeAnchorFallbacks(this.options.fallbacks));
		}
		if (this.generatedTooltip) this.container.ownerDocument.body.append(this.tooltip);
		this.container.addEventListener("focusin", this.handleFocusIn);
		this.container.addEventListener("focusout", this.handleFocusOut);
		this.container.addEventListener("pointerover", this.handlePointerOver);
		this.container.addEventListener("pointerout", this.handlePointerOut);
		this.tooltip.addEventListener("pointerenter", this.handleTooltipPointerEnter);
		this.tooltip.addEventListener("pointerleave", this.handleTooltipPointerLeave);
		this.dispatch(sharedTooltipEvents.init);
		this.dispatch(sharedTooltipEvents.ready);
	}
	resolveContent(trigger) {
		try {
			return String(this.options.getContent(trigger) ?? "").trim();
		} catch {
			return "";
		}
	}
	resolveOwnedTrigger(node) {
		if (!(node instanceof Element)) return null;
		const trigger = node.closest(this.options.triggers);
		if (!(trigger instanceof HTMLElement) || !containsNode(this.container, trigger)) return null;
		return trigger.closest(ROOT_SELECTOR) === this.container ? trigger : null;
	}
	isOwnedTrigger(trigger) {
		return trigger.matches(this.options.triggers) && containsNode(this.container, trigger) && trigger.closest(ROOT_SELECTOR) === this.container;
	}
	isTriggerActivated(trigger) {
		return this.focusedTrigger === trigger || this.hoveredTrigger === trigger;
	}
	desiredTrigger() {
		if (this.focusedTrigger && containsNode(this.container, this.focusedTrigger)) return this.focusedTrigger;
		if (this.hoveredTrigger && containsNode(this.container, this.hoveredTrigger)) return this.hoveredTrigger;
		if (this.hoveringTooltip && this.currentTrigger && containsNode(this.container, this.currentTrigger)) return this.currentTrigger;
		return null;
	}
	maybeResetDismissedTrigger() {
		if (this.dismissedTrigger && !this.isTriggerActivated(this.dismissedTrigger)) this.dismissedTrigger = null;
	}
	reconcile(reason) {
		this.maybeResetDismissedTrigger();
		if (this.openState && this.currentTrigger && !containsNode(this.container, this.currentTrigger)) {
			this.close("trigger-removed");
			return;
		}
		const desired = this.desiredTrigger();
		if (!desired) {
			this.scheduleClose(reason === "blur" ? "blur" : "leave");
			return;
		}
		if (this.dismissedTrigger === desired || !isKeyboardFocusable(desired)) {
			this.clearShowTimer();
			return;
		}
		this.clearHideTimer();
		if (this.openState) {
			if (this.currentTrigger !== desired) this.openOrRetarget(desired, this.focusedTrigger === desired ? "focus" : "hover");
			return;
		}
		const openReason = this.focusedTrigger === desired ? "focus" : "hover";
		if (openReason === "focus" || this.options.showDelay === 0) {
			this.openOrRetarget(desired, openReason);
			return;
		}
		this.scheduleOpen(desired, openReason);
	}
	openOrRetarget(trigger, reason) {
		if (!this.isOwnedTrigger(trigger) || !isKeyboardFocusable(trigger)) return false;
		const content = this.resolveContent(trigger);
		if (!content) {
			if (this.openState) this.close("content-empty");
			return false;
		}
		if (this.openState && this.currentTrigger) {
			if (this.currentTrigger === trigger) {
				this.tooltip.textContent = content;
				this.updatePosition();
				return true;
			}
			const previousTrigger = this.currentTrigger;
			if (!this.dispatch(sharedTooltipEvents.beforeRetarget, {
				trigger,
				previousTrigger,
				reason
			}, true)) return false;
			const applyRetarget = () => {
				this.releaseActiveDescription();
				this.tooltip.textContent = content;
				this.assignActiveTrigger(trigger);
				this.updatePosition();
				return this.retargetNativeHint(trigger);
			};
			if (!(this.flipMotion ? this.flipMotion.retarget(this.tooltip, applyRetarget) : applyRetarget())) {
				this.flipMotion?.cancel();
				this.close("platform");
				return false;
			}
			this.dispatch(sharedTooltipEvents.retarget, {
				trigger,
				previousTrigger,
				reason
			});
			return true;
		}
		if (!this.dispatch(sharedTooltipEvents.beforeOpen, {
			trigger,
			reason
		}, true)) return false;
		this.tooltip.textContent = content;
		this.assignActiveTrigger(trigger);
		this.tooltip.hidden = false;
		this.openState = true;
		this.container.classList.add(CLASSES.open);
		this.container.ownerDocument.addEventListener("keydown", this.handleDocumentKeyDown);
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
	assignActiveTrigger(trigger) {
		this.releaseActiveDescription();
		this.releaseActiveAnchor();
		this.currentTrigger = trigger;
		this.assignActiveDescription(trigger);
		if (!this.anchorSupported) return;
		const anchorName = snapshotInlineStyle(trigger, "anchor-name");
		trigger.style.setProperty("anchor-name", mergeAnchorName(anchorName.value, this.anchorName), anchorName.priority);
		this.activeAnchorState = {
			trigger,
			anchorName
		};
	}
	assignActiveDescription(trigger) {
		if (this.options.semantics !== "describedby" || !this.descriptionTooltipId) return;
		const describedBy = trigger.getAttribute("aria-describedby");
		const tokens = uniqueTokens([...tokenize(describedBy), this.descriptionTooltipId]);
		trigger.setAttribute("aria-describedby", tokens.join(" "));
		this.activeDescriptionState = {
			trigger,
			describedBy
		};
	}
	releaseActiveDescription() {
		if (!this.activeDescriptionState) return;
		const { trigger, describedBy } = this.activeDescriptionState;
		restoreAttribute(trigger, "aria-describedby", describedBy);
		this.activeDescriptionState = null;
	}
	releaseActiveAnchor() {
		if (!this.activeAnchorState) return;
		restoreInlineStyle(this.activeAnchorState.trigger, "anchor-name", this.activeAnchorState.anchorName);
		this.activeAnchorState = null;
	}
	showNativeHint(trigger) {
		const tooltip = this.nativeHintElement;
		if (!tooltip) return true;
		if (isPopoverOpen(tooltip)) return true;
		try {
			tooltip.showPopover({ source: trigger });
			return isPopoverOpen(tooltip);
		} catch {
			return false;
		}
	}
	retargetNativeHint(trigger) {
		const tooltip = this.nativeHintElement;
		if (!tooltip) return true;
		if (!isPopoverOpen(tooltip)) return this.showNativeHint(trigger);
		try {
			tooltip.hidePopover();
			tooltip.showPopover({ source: trigger });
			return isPopoverOpen(tooltip);
		} catch {
			return false;
		}
	}
	hideNativeHint() {
		const tooltip = this.nativeHintElement;
		if (!tooltip || !isPopoverOpen(tooltip)) return;
		try {
			tooltip.hidePopover();
		} catch {}
	}
	handleNativeBeforeToggle(event) {
		if (event.newState === "open" && !this.openState) event.preventDefault();
	}
	handleNativeToggle(event) {
		if (event.newState === "closed" && this.openState && this.nativeHintElement && !isPopoverOpen(this.nativeHintElement)) this.close("platform");
	}
	updatePosition() {
		if (!this.openState || !this.currentTrigger) return;
		if (this.anchorSupported) {
			this.stopFallbackListeners();
			return;
		}
		this.startFallbackListeners();
		this.positionFallback();
	}
	positionFallback() {
		if (!this.openState || !this.currentTrigger || this.anchorSupported) return;
		const view = this.container.ownerDocument.defaultView;
		if (!view) return;
		const triggerRect = this.currentTrigger.getBoundingClientRect();
		const tooltipRect = this.tooltip.getBoundingClientRect();
		const offset = parseOffset(this.tooltip);
		const edge = 8;
		let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
		let top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
		switch (this.options.placement) {
			case "top":
				top = triggerRect.top - tooltipRect.height - offset;
				break;
			case "right":
				left = triggerRect.right + offset;
				break;
			case "bottom":
				top = triggerRect.bottom + offset;
				break;
			case "left": left = triggerRect.left - tooltipRect.width - offset;
		}
		left = Math.min(Math.max(left, edge), Math.max(edge, view.innerWidth - tooltipRect.width - edge));
		top = Math.min(Math.max(top, edge), Math.max(edge, view.innerHeight - tooltipRect.height - edge));
		this.tooltip.style.left = `${left}px`;
		this.tooltip.style.top = `${top}px`;
	}
	scheduleOpen(trigger, reason) {
		this.clearShowTimer();
		const view = this.container.ownerDocument.defaultView;
		if (!view) {
			this.openOrRetarget(trigger, reason);
			return;
		}
		this.showTimer = view.setTimeout(() => {
			this.showTimer = null;
			if (this.desiredTrigger() === trigger && this.dismissedTrigger !== trigger) this.openOrRetarget(trigger, reason);
		}, this.options.showDelay);
	}
	scheduleClose(reason) {
		this.clearShowTimer();
		this.clearHideTimer();
		if (!this.openState) return;
		if (this.options.hideDelay === 0) {
			this.close(reason);
			return;
		}
		const view = this.container.ownerDocument.defaultView;
		if (!view) {
			this.close(reason);
			return;
		}
		this.hideTimer = view.setTimeout(() => {
			this.hideTimer = null;
			if (!this.desiredTrigger()) this.close(reason);
		}, this.options.hideDelay);
	}
	clearShowTimer() {
		if (this.showTimer === null) return;
		this.container.ownerDocument.defaultView?.clearTimeout(this.showTimer);
		this.showTimer = null;
	}
	clearHideTimer() {
		if (this.hideTimer === null) return;
		this.container.ownerDocument.defaultView?.clearTimeout(this.hideTimer);
		this.hideTimer = null;
	}
	startFallbackListeners() {
		if (this.fallbackListenersActive) return;
		const view = this.container.ownerDocument.defaultView;
		if (!view) return;
		this.fallbackListenersActive = true;
		view.addEventListener("resize", this.handleFallbackViewportChange);
		this.container.ownerDocument.addEventListener("scroll", this.handleFallbackViewportChange, true);
	}
	stopFallbackListeners() {
		if (!this.fallbackListenersActive) return;
		this.container.ownerDocument.defaultView?.removeEventListener("resize", this.handleFallbackViewportChange);
		this.container.ownerDocument.removeEventListener("scroll", this.handleFallbackViewportChange, true);
		this.fallbackListenersActive = false;
		this.cancelFallbackFrame();
	}
	handleFallbackViewportChange() {
		const view = this.container.ownerDocument.defaultView;
		if (!view || this.fallbackFrame !== null) return;
		this.fallbackFrame = view.requestAnimationFrame(() => {
			this.fallbackFrame = null;
			this.positionFallback();
		});
	}
	cancelFallbackFrame() {
		if (this.fallbackFrame === null) return;
		const view = this.container.ownerDocument.defaultView;
		if (view) view.cancelAnimationFrame(this.fallbackFrame);
		this.fallbackFrame = null;
	}
	handleFocusIn(event) {
		const trigger = this.resolveOwnedTrigger(event.target);
		if (!trigger) return;
		if (this.dismissedTrigger && this.dismissedTrigger !== trigger) this.dismissedTrigger = null;
		this.focusedTrigger = trigger;
		this.reconcile("focus");
	}
	handleFocusOut(event) {
		const trigger = this.resolveOwnedTrigger(event.target);
		if (!trigger || this.focusedTrigger !== trigger) return;
		const next = this.resolveOwnedTrigger(event.relatedTarget);
		this.focusedTrigger = next;
		this.reconcile(next ? "focus" : "blur");
	}
	handlePointerOver(event) {
		const trigger = this.resolveOwnedTrigger(event.target);
		if (!trigger) return;
		if (event.relatedTarget instanceof Node && trigger.contains(event.relatedTarget)) return;
		if (this.dismissedTrigger && this.dismissedTrigger !== trigger) this.dismissedTrigger = null;
		this.hoveredTrigger = trigger;
		this.reconcile("hover");
	}
	handlePointerOut(event) {
		const trigger = this.resolveOwnedTrigger(event.target);
		if (!trigger || this.hoveredTrigger !== trigger) return;
		const related = event.relatedTarget;
		if (related instanceof Node && trigger.contains(related)) return;
		const next = this.resolveOwnedTrigger(related);
		if (next) {
			this.hoveredTrigger = next;
			this.reconcile("hover");
			return;
		}
		if (related instanceof Node && this.tooltip.contains(related)) {
			this.hoveredTrigger = null;
			this.hoveringTooltip = true;
			this.reconcile("leave");
			return;
		}
		this.hoveredTrigger = null;
		this.reconcile("leave");
	}
	handleTooltipPointerEnter() {
		this.hoveringTooltip = true;
		this.clearHideTimer();
	}
	handleTooltipPointerLeave(event) {
		this.hoveringTooltip = false;
		const next = this.resolveOwnedTrigger(event.relatedTarget);
		if (next) this.hoveredTrigger = next;
		this.reconcile("leave");
	}
	handleDocumentKeyDown(event) {
		if (event.key !== "Escape" || !this.openState) return;
		this.close("escape");
	}
	dispatch(type, detail = {}, cancelable = false) {
		return this.container.dispatchEvent(new CustomEvent(type, {
			bubbles: true,
			cancelable,
			detail: {
				controller: this,
				...detail
			}
		}));
	}
};
function createSharedTooltip(container, options) {
	if (!(container instanceof HTMLElement)) throw new TypeError("createSharedTooltip() requires an HTMLElement container.");
	const existing = INSTANCES.get(container);
	if (existing) return existing;
	return new SharedTooltipControllerImpl(container, options);
}
const sharedTooltipSelectors = Object.freeze({
	root: ROOT_SELECTOR,
	content: `[${CONTENT_ATTRIBUTE}]`
});
//#endregion
export { SHARED_TOOLTIP_MOTIONS, SHARED_TOOLTIP_RENDER_MODES, SHARED_TOOLTIP_SEMANTICS, createSharedTooltip, sharedTooltipEvents, sharedTooltipSelectors };

//# sourceMappingURL=index.js.map