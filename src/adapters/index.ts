import type {
  TooltipAdapter,
  TooltipElements
} from "../index.js";

export interface SelectorAdapterOptions {
  /**
   * Human-readable adapter name used in integration errors.
   */
  name: string;
  /**
   * Selector for exactly one trigger inside the tooltip root.
   */
  trigger: string;
  /**
   * Selector for exactly one tooltip element inside the tooltip root.
   */
  tooltip: string;
}

interface ResolvedSelectorAdapterOptions {
  name: string;
  trigger: string;
  tooltip: string;
}

function requireNonEmptyString(
  value: string,
  label: string
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(
      `createSelectorAdapter() requires a non-empty ${label}.`
    );
  }

  return value.trim();
}

function normalizeOptions(
  options: SelectorAdapterOptions
): Readonly<ResolvedSelectorAdapterOptions> {
  if (!options || typeof options !== "object") {
    throw new TypeError(
      "createSelectorAdapter() requires an options object."
    );
  }

  return Object.freeze({
    name: requireNonEmptyString(options.name, "name"),
    trigger: requireNonEmptyString(
      options.trigger,
      "trigger selector"
    ),
    tooltip: requireNonEmptyString(
      options.tooltip,
      "tooltip selector"
    )
  });
}

function queryExactlyOne(
  root: HTMLElement,
  selector: string
): HTMLElement | null {
  let matches: NodeListOf<Element>;

  try {
    matches = root.querySelectorAll(selector);
  } catch {
    return null;
  }

  if (matches.length !== 1) {
    return null;
  }

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
export function createSelectorAdapter(
  options: SelectorAdapterOptions
): TooltipAdapter {
  const resolvedOptions = normalizeOptions(options);

  return Object.freeze({
    name: resolvedOptions.name,

    resolve(root: HTMLElement): TooltipElements | null {
      if (!(root instanceof HTMLElement)) {
        return null;
      }

      const trigger = queryExactlyOne(
        root,
        resolvedOptions.trigger
      );

      const tooltip = queryExactlyOne(
        root,
        resolvedOptions.tooltip
      );

      if (!trigger || !tooltip || trigger === tooltip) {
        return null;
      }

      return {
        trigger,
        tooltip
      };
    }
  });
}
