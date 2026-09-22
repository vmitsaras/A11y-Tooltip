//#region src/adapters/index.ts
function requireNonEmptyString(value, label) {
	if (typeof value !== "string" || value.trim().length === 0) throw new TypeError(`createSelectorAdapter() requires a non-empty ${label}.`);
	return value.trim();
}
function normalizeOptions(options) {
	if (!options || typeof options !== "object") throw new TypeError("createSelectorAdapter() requires an options object.");
	return Object.freeze({
		name: requireNonEmptyString(options.name, "name"),
		trigger: requireNonEmptyString(options.trigger, "trigger selector"),
		tooltip: requireNonEmptyString(options.tooltip, "tooltip selector")
	});
}
function queryExactlyOne(root, selector) {
	let matches;
	try {
		matches = root.querySelectorAll(selector);
	} catch {
		return null;
	}
	if (matches.length !== 1) return null;
	const element = matches[0];
	return element instanceof HTMLElement ? element : null;
}
/**
* Creates a small TooltipAdapter from design-system or legacy selectors.
*
* Resolution is intentionally strict: the trigger and tooltip selectors must
* each match exactly one distinct HTMLElement inside the supplied root.
* Missing, duplicate, invalid-selector, non-HTMLElement, or same-element
* matches return null so the core tooltip can fail with its normal adapter
* resolution error.
*/
function createSelectorAdapter(options) {
	const resolvedOptions = normalizeOptions(options);
	return Object.freeze({
		name: resolvedOptions.name,
		resolve(root) {
			if (!(root instanceof HTMLElement)) return null;
			const trigger = queryExactlyOne(root, resolvedOptions.trigger);
			const tooltip = queryExactlyOne(root, resolvedOptions.tooltip);
			if (!trigger || !tooltip || trigger === tooltip) return null;
			return {
				trigger,
				tooltip
			};
		}
	});
}
//#endregion
export { createSelectorAdapter };

//# sourceMappingURL=index.js.map