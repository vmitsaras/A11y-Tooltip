import {
  ANCHOR_POSITIONING_FALLBACKS,
  createAnchorName,
  mergeAnchorName,
  normalizeAnchorFallbacks,
  restoreInlineStyle,
  serializeAnchorFallbacks,
  snapshotInlineStyle,
  type AnchorPositioningFallback
} from "../internal/anchor-positioning.js";
import {
  type TooltipAddon,
  type TooltipInstance
} from "../index.js";

export {
  ANCHOR_POSITIONING_FALLBACKS
};

export type {
  AnchorPositioningFallback
};

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

const ROOT_ATTRIBUTE = "data-a11y-tooltip-anchor-positioning";

interface ActiveAnchorSetup {
  references: number;
  restore(): void;
}

const ACTIVE_ANCHOR_SETUPS =
  new WeakMap<TooltipInstance, ActiveAnchorSetup>();

/**
 * Progressively enhances the default tooltip placement with CSS Anchor
 * Positioning.
 *
 * The setup is reference-counted so multiple addons can safely share the same
 * generated anchor state and authored styles are restored only after the last
 * consumer releases it.
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
  const fallbacks = normalizeAnchorFallbacks(
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
    serializeAnchorFallbacks(fallbacks),
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
