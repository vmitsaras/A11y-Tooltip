import {
  type TooltipAddon,
  type TooltipInstance,
  type TooltipPlacement
} from "../index.js";

export const ANCHOR_POSITIONING_FALLBACKS = Object.freeze([
  "flip-block",
  "flip-inline",
  "flip-start",
  "flip-block flip-inline"
] as const);

export type AnchorPositioningFallback =
  (typeof ANCHOR_POSITIONING_FALLBACKS)[number];

export interface AnchorPositioningAddonOptions {
  /**
   * Position-try fallback tactics for the anchor-positioned tooltip.
   *
   * Defaults are placement-aware:
   * - top/bottom prefer flip-block first;
   * - left/right prefer flip-inline first.
   *
   * Pass an empty array to disable fallback attempts.
   */
  fallbacks?: readonly AnchorPositioningFallback[];
}

interface InlineStyleSnapshot {
  value: string;
  priority: string;
}

const ROOT_ATTRIBUTE = "data-a11y-tooltip-anchor-positioning";

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

interface ActiveAnchorSetup {
  references: number;
  restore(): void;
}

const ACTIVE_ANCHOR_SETUPS =
  new WeakMap<TooltipInstance, ActiveAnchorSetup>();

function isFallback(value: unknown): value is AnchorPositioningFallback {
  return (
    typeof value === "string" &&
    ANCHOR_POSITIONING_FALLBACKS.includes(
      value as AnchorPositioningFallback
    )
  );
}

function defaultFallbacks(
  placement: TooltipPlacement
): readonly AnchorPositioningFallback[] {
  return placement === "top" || placement === "bottom"
    ? BLOCK_FIRST_FALLBACKS
    : INLINE_FIRST_FALLBACKS;
}

function normalizeFallbacks(
  value: readonly AnchorPositioningFallback[] | undefined,
  placement: TooltipPlacement
): readonly AnchorPositioningFallback[] {
  if (value === undefined) {
    return defaultFallbacks(placement);
  }

  if (!Array.isArray(value)) {
    return defaultFallbacks(placement);
  }

  return Object.freeze(
    Array.from(new Set(value.filter(isFallback)))
  );
}

function snapshotInlineStyle(
  element: HTMLElement,
  property: string
): InlineStyleSnapshot {
  return {
    value: element.style.getPropertyValue(property),
    priority: element.style.getPropertyPriority(property)
  };
}

function restoreInlineStyle(
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

function mergeAnchorName(
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

function createAnchorName(): string {
  generatedAnchorId += 1;
  return `--a11y-tooltip-anchor-${generatedAnchorId}`;
}

function serializeFallbacks(
  fallbacks: readonly AnchorPositioningFallback[]
): string {
  return fallbacks.length > 0
    ? fallbacks.join(", ")
    : "none";
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
export function setupAnchorPositioning(
  instance: TooltipInstance,
  options: AnchorPositioningAddonOptions = {}
): () => void {
  const active = ACTIVE_ANCHOR_SETUPS.get(instance);

  if (active) {
    active.references += 1;

    let released = false;

    return () => {
      if (released) {
        return;
      }

      released = true;
      const current = ACTIVE_ANCHOR_SETUPS.get(instance);

      if (!current) {
        return;
      }

      current.references -= 1;

      if (current.references === 0) {
        ACTIVE_ANCHOR_SETUPS.delete(instance);
        current.restore();
      }
    };
  }

  const anchorName = createAnchorName();
  const fallbacks = normalizeFallbacks(
    options.fallbacks,
    instance.options.placement
  );

  const originalRootAttribute =
    instance.root.getAttribute(ROOT_ATTRIBUTE);

  const originalAnchorName = snapshotInlineStyle(
    instance.trigger,
    "anchor-name"
  );

  const originalPositionAnchor = snapshotInlineStyle(
    instance.tooltip,
    "position-anchor"
  );

  const originalPositionTryFallbacks = snapshotInlineStyle(
    instance.tooltip,
    "position-try-fallbacks"
  );

  instance.root.setAttribute(ROOT_ATTRIBUTE, "");

  instance.trigger.style.setProperty(
    "anchor-name",
    mergeAnchorName(originalAnchorName.value, anchorName),
    originalAnchorName.priority
  );

  instance.tooltip.style.setProperty(
    "position-anchor",
    anchorName,
    originalPositionAnchor.priority
  );

  instance.tooltip.style.setProperty(
    "position-try-fallbacks",
    serializeFallbacks(fallbacks),
    originalPositionTryFallbacks.priority
  );

  const state: ActiveAnchorSetup = {
    references: 1,
    restore() {
      if (originalRootAttribute === null) {
        instance.root.removeAttribute(ROOT_ATTRIBUTE);
      } else {
        instance.root.setAttribute(
          ROOT_ATTRIBUTE,
          originalRootAttribute
        );
      }

      restoreInlineStyle(
        instance.trigger,
        "anchor-name",
        originalAnchorName
      );

      restoreInlineStyle(
        instance.tooltip,
        "position-anchor",
        originalPositionAnchor
      );

      restoreInlineStyle(
        instance.tooltip,
        "position-try-fallbacks",
        originalPositionTryFallbacks
      );
    }
  };

  ACTIVE_ANCHOR_SETUPS.set(instance, state);

  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    const current = ACTIVE_ANCHOR_SETUPS.get(instance);

    if (!current) {
      return;
    }

    current.references -= 1;

    if (current.references === 0) {
      ACTIVE_ANCHOR_SETUPS.delete(instance);
      current.restore();
    }
  };
}

export function createAnchorPositioningAddon(
  options: AnchorPositioningAddonOptions = {}
): TooltipAddon {
  return Object.freeze({
    name: "anchor-positioning",

    setup(instance: TooltipInstance) {
      return setupAnchorPositioning(instance, options);
    }
  });
}
