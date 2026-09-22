import { tooltipEvents } from "../index.js";
//#region src/addons/overflow-only.ts
const OVERFLOW_AXES = Object.freeze([
	"inline",
	"block",
	"either"
]);
const DEFAULT_OPTIONS = Object.freeze({
	target: "trigger",
	axis: "inline",
	tolerance: 0
});
function normalizeAxis(value) {
	return value && OVERFLOW_AXES.includes(value) ? value : DEFAULT_OPTIONS.axis;
}
function normalizeTolerance(value) {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return DEFAULT_OPTIONS.tolerance;
	return value;
}
function normalizeOptions(options) {
	return Object.freeze({
		target: options.target ?? DEFAULT_OPTIONS.target,
		axis: normalizeAxis(options.axis),
		tolerance: normalizeTolerance(options.tolerance)
	});
}
function resolveTarget(instance, target) {
	if (target === "trigger") return instance.trigger;
	try {
		if (typeof target === "function") {
			const resolved = target(instance);
			return resolved instanceof HTMLElement ? resolved : null;
		}
		const resolved = instance.root.querySelector(target);
		return resolved instanceof HTMLElement ? resolved : null;
	} catch {
		return null;
	}
}
function usesVerticalWritingMode(element) {
	const view = element.ownerDocument.defaultView;
	if (!view) return false;
	const writingMode = view.getComputedStyle(element).writingMode;
	return writingMode.startsWith("vertical") || writingMode.startsWith("sideways");
}
function exceeds(scrollSize, clientSize, tolerance) {
	return scrollSize - clientSize > tolerance;
}
function isOverflowing(element, axis, tolerance) {
	const verticalWritingMode = usesVerticalWritingMode(element);
	const inlineOverflow = verticalWritingMode ? exceeds(element.scrollHeight, element.clientHeight, tolerance) : exceeds(element.scrollWidth, element.clientWidth, tolerance);
	const blockOverflow = verticalWritingMode ? exceeds(element.scrollWidth, element.clientWidth, tolerance) : exceeds(element.scrollHeight, element.clientHeight, tolerance);
	if (axis === "inline") return inlineOverflow;
	if (axis === "block") return blockOverflow;
	return inlineOverflow || blockOverflow;
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
function createOverflowOnlyAddon(options = {}) {
	const resolvedOptions = normalizeOptions(options);
	return Object.freeze({
		name: "overflow-only",
		setup(instance) {
			const handleBeforeOpen = (event) => {
				const target = resolveTarget(instance, resolvedOptions.target);
				if (!target || !isOverflowing(target, resolvedOptions.axis, resolvedOptions.tolerance)) event.preventDefault();
			};
			instance.root.addEventListener(tooltipEvents.beforeOpen, handleBeforeOpen);
			return () => {
				instance.root.removeEventListener(tooltipEvents.beforeOpen, handleBeforeOpen);
			};
		}
	});
}
//#endregion
//#region src/addons/anchor-positioning.ts
const ANCHOR_POSITIONING_FALLBACKS = Object.freeze([
	"flip-block",
	"flip-inline",
	"flip-start",
	"flip-block flip-inline"
]);
const ROOT_ATTRIBUTE = "data-a11y-tooltip-anchor-positioning";
const BLOCK_FIRST_FALLBACKS = Object.freeze([
	"flip-block",
	"flip-inline",
	"flip-block flip-inline"
]);
const INLINE_FIRST_FALLBACKS = Object.freeze([
	"flip-inline",
	"flip-block",
	"flip-block flip-inline"
]);
const GLOBAL_KEYWORDS = /* @__PURE__ */ new Set([
	"inherit",
	"initial",
	"revert",
	"revert-layer",
	"unset"
]);
let generatedAnchorId = 0;
function isFallback(value) {
	return typeof value === "string" && ANCHOR_POSITIONING_FALLBACKS.includes(value);
}
function defaultFallbacks(placement) {
	return placement === "top" || placement === "bottom" ? BLOCK_FIRST_FALLBACKS : INLINE_FIRST_FALLBACKS;
}
function normalizeFallbacks(value, placement) {
	if (value === void 0) return defaultFallbacks(placement);
	if (!Array.isArray(value)) return defaultFallbacks(placement);
	return Object.freeze(Array.from(new Set(value.filter(isFallback))));
}
function snapshotInlineStyle(element, property) {
	return {
		value: element.style.getPropertyValue(property),
		priority: element.style.getPropertyPriority(property)
	};
}
function restoreInlineStyle(element, property, snapshot) {
	if (snapshot.value.length === 0) {
		element.style.removeProperty(property);
		return;
	}
	element.style.setProperty(property, snapshot.value, snapshot.priority);
}
function mergeAnchorName(authoredValue, generatedName) {
	const value = authoredValue.trim();
	if (value.length === 0 || value === "none" || GLOBAL_KEYWORDS.has(value)) return generatedName;
	const names = value.split(",").map((name) => name.trim()).filter((name) => name.startsWith("--"));
	if (names.length === 0) return generatedName;
	if (!names.includes(generatedName)) names.push(generatedName);
	return names.join(", ");
}
function createAnchorName() {
	generatedAnchorId += 1;
	return `--a11y-tooltip-anchor-${generatedAnchorId}`;
}
function serializeFallbacks(fallbacks) {
	return fallbacks.length > 0 ? fallbacks.join(", ") : "none";
}
/**
* Progressively enhances the default tooltip placement with CSS Anchor
* Positioning.
*
* The addon creates a unique anchor association per tooltip instance and
* supplies position-try fallback tactics. The stylesheet activates the
* anchor-positioned layout only inside an @supports rule, so browsers without
* the required CSS features keep the existing absolute-position fallback.
*
* The addon does not move focus, change ARIA, reparent DOM, install observers,
* or introduce a positioning runtime dependency.
*/
function createAnchorPositioningAddon(options = {}) {
	return Object.freeze({
		name: "anchor-positioning",
		setup(instance) {
			const anchorName = createAnchorName();
			const fallbacks = normalizeFallbacks(options.fallbacks, instance.options.placement);
			const originalRootAttribute = instance.root.getAttribute(ROOT_ATTRIBUTE);
			const originalAnchorName = snapshotInlineStyle(instance.trigger, "anchor-name");
			const originalPositionAnchor = snapshotInlineStyle(instance.tooltip, "position-anchor");
			const originalPositionTryFallbacks = snapshotInlineStyle(instance.tooltip, "position-try-fallbacks");
			instance.root.setAttribute(ROOT_ATTRIBUTE, "");
			instance.trigger.style.setProperty("anchor-name", mergeAnchorName(originalAnchorName.value, anchorName), originalAnchorName.priority);
			instance.tooltip.style.setProperty("position-anchor", anchorName, originalPositionAnchor.priority);
			instance.tooltip.style.setProperty("position-try-fallbacks", serializeFallbacks(fallbacks), originalPositionTryFallbacks.priority);
			return () => {
				if (originalRootAttribute === null) instance.root.removeAttribute(ROOT_ATTRIBUTE);
				else instance.root.setAttribute(ROOT_ATTRIBUTE, originalRootAttribute);
				restoreInlineStyle(instance.trigger, "anchor-name", originalAnchorName);
				restoreInlineStyle(instance.tooltip, "position-anchor", originalPositionAnchor);
				restoreInlineStyle(instance.tooltip, "position-try-fallbacks", originalPositionTryFallbacks);
			};
		}
	});
}
//#endregion
//#region src/addons/index.ts
function defineTooltipAddon(addon) {
	return Object.freeze(addon);
}
function createSingleOpenAddon() {
	let current = null;
	return defineTooltipAddon({
		name: "single-open",
		setup(instance) {
			const handleOpen = () => {
				if (current && current !== instance) current.close("api");
				current = instance;
			};
			const handleClose = () => {
				if (current === instance) current = null;
			};
			instance.root.addEventListener("a11y-tooltip:open", handleOpen);
			instance.root.addEventListener("a11y-tooltip:close", handleClose);
			return () => {
				instance.root.removeEventListener("a11y-tooltip:open", handleOpen);
				instance.root.removeEventListener("a11y-tooltip:close", handleClose);
				if (current === instance) current = null;
			};
		}
	});
}
//#endregion
export { ANCHOR_POSITIONING_FALLBACKS, OVERFLOW_AXES, createAnchorPositioningAddon, createOverflowOnlyAddon, createSingleOpenAddon, defineTooltipAddon };

//# sourceMappingURL=index.js.map