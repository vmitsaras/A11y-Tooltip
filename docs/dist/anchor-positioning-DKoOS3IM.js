//#region src/internal/anchor-positioning.ts
const ANCHOR_POSITIONING_FALLBACKS = Object.freeze([
	"flip-block",
	"flip-inline",
	"flip-start",
	"flip-block flip-inline"
]);
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
function defaultAnchorFallbacks(placement) {
	return placement === "top" || placement === "bottom" ? BLOCK_FIRST_FALLBACKS : INLINE_FIRST_FALLBACKS;
}
function normalizeAnchorFallbacks(value, placement) {
	if (value === void 0 || !Array.isArray(value)) return defaultAnchorFallbacks(placement);
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
function createAnchorName(prefix = "--a11y-tooltip-anchor") {
	generatedAnchorId += 1;
	return `${prefix}-${generatedAnchorId}`;
}
function serializeAnchorFallbacks(fallbacks) {
	return fallbacks.length > 0 ? fallbacks.join(", ") : "none";
}
function supportsAnchorPositioning(element) {
	const css = element.ownerDocument.defaultView?.CSS;
	if (!css || typeof css.supports !== "function") return false;
	return css.supports("anchor-name: --a11y-tooltip-anchor") && css.supports("position-anchor: --a11y-tooltip-anchor") && css.supports("position-area: top span-all") && css.supports("align-self: anchor-center") && css.supports("position-try-fallbacks: flip-block");
}
//#endregion
export { restoreInlineStyle as a, supportsAnchorPositioning as c, normalizeAnchorFallbacks as i, createAnchorName as n, serializeAnchorFallbacks as o, mergeAnchorName as r, snapshotInlineStyle as s, ANCHOR_POSITIONING_FALLBACKS as t };

//# sourceMappingURL=anchor-positioning-DKoOS3IM.js.map