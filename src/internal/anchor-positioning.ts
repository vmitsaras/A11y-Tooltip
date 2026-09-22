import type { TooltipPlacement } from "../index.js";

export const ANCHOR_POSITIONING_FALLBACKS = Object.freeze([
  "flip-block",
  "flip-inline",
  "flip-start",
  "flip-block flip-inline"
] as const);

export type AnchorPositioningFallback =
  (typeof ANCHOR_POSITIONING_FALLBACKS)[number];

export interface InlineStyleSnapshot {
  value: string;
  priority: string;
}

const BLOCK_FIRST_FALLBACKS = Object.freeze([
  "flip-block",
  "flip-inline",
  "flip-block flip-inline"
] as const satisfies readonly AnchorPositioningFallback[]);

const INLINE_FIRST_FALLBACKS = Object.freeze([
  "flip-inline",
  "flip-block",
  "flip-block flip-inline"
] as const satisfies readonly AnchorPositioningFallback[]);

const GLOBAL_KEYWORDS = new Set([
  "inherit",
  "initial",
  "revert",
  "revert-layer",
  "unset"
]);

let generatedAnchorId = 0;

function isFallback(
  value: unknown
): value is AnchorPositioningFallback {
  return (
    typeof value === "string" &&
    ANCHOR_POSITIONING_FALLBACKS.includes(
      value as AnchorPositioningFallback
    )
  );
}

export function defaultAnchorFallbacks(
  placement: TooltipPlacement
): readonly AnchorPositioningFallback[] {
  return placement === "top" || placement === "bottom"
    ? BLOCK_FIRST_FALLBACKS
    : INLINE_FIRST_FALLBACKS;
}

export function normalizeAnchorFallbacks(
  value: readonly AnchorPositioningFallback[] | undefined,
  placement: TooltipPlacement
): readonly AnchorPositioningFallback[] {
  if (value === undefined || !Array.isArray(value)) {
    return defaultAnchorFallbacks(placement);
  }

  return Object.freeze(
    Array.from(new Set(value.filter(isFallback)))
  );
}

export function snapshotInlineStyle(
  element: HTMLElement,
  property: string
): InlineStyleSnapshot {
  return {
    value: element.style.getPropertyValue(property),
    priority: element.style.getPropertyPriority(property)
  };
}

export function restoreInlineStyle(
  element: HTMLElement,
  property: string,
  snapshot: InlineStyleSnapshot
): void {
  if (snapshot.value.length === 0) {
    element.style.removeProperty(property);
    return;
  }

  element.style.setProperty(
    property,
    snapshot.value,
    snapshot.priority
  );
}

export function mergeAnchorName(
  authoredValue: string,
  generatedName: string
): string {
  const value = authoredValue.trim();

  if (
    value.length === 0 ||
    value === "none" ||
    GLOBAL_KEYWORDS.has(value)
  ) {
    return generatedName;
  }

  const names = value
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.startsWith("--"));

  if (names.length === 0) {
    return generatedName;
  }

  if (!names.includes(generatedName)) {
    names.push(generatedName);
  }

  return names.join(", ");
}

export function createAnchorName(
  prefix = "--a11y-tooltip-anchor"
): string {
  generatedAnchorId += 1;
  return `${prefix}-${generatedAnchorId}`;
}

export function serializeAnchorFallbacks(
  fallbacks: readonly AnchorPositioningFallback[]
): string {
  return fallbacks.length > 0
    ? fallbacks.join(", ")
    : "none";
}

export function supportsAnchorPositioning(
  element: HTMLElement
): boolean {
  const css = element.ownerDocument.defaultView?.CSS;

  if (!css || typeof css.supports !== "function") {
    return false;
  }

  return (
    css.supports(
      "anchor-name: --a11y-tooltip-anchor"
    ) &&
    css.supports(
      "position-anchor: --a11y-tooltip-anchor"
    ) &&
    css.supports(
      "position-area: top span-all"
    ) &&
    css.supports(
      "align-self: anchor-center"
    ) &&
    css.supports(
      "position-try-fallbacks: flip-block"
    )
  );
}
