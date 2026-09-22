export interface WaapiFlipMotionOptions {
  duration: number;
  easing: string;
}

export interface WaapiFlipMotionController {
  retarget<T>(
    tooltip: HTMLElement,
    update: () => T
  ): T;
  cancel(): void;
}

function prefersReducedMotion(
  tooltip: HTMLElement
): boolean {
  const view = tooltip.ownerDocument.defaultView;

  return Boolean(
    view?.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches
  );
}

function positionDelta(
  from: DOMRect,
  to: DOMRect
): { x: number; y: number } {
  return {
    x: from.left - to.left,
    y: from.top - to.top
  };
}

/**
 * Creates a zero-dependency WAAPI FLIP controller for shared-tooltip
 * retargeting.
 *
 * Only visual displacement is animated. Content, ARIA ownership, anchor
 * ownership, and controller state update synchronously before the animation.
 */
export function createWaapiFlipMotionController(
  options: WaapiFlipMotionOptions
): WaapiFlipMotionController {
  let animation: Animation | null = null;
  let pendingFrame: number | null = null;
  let pendingView: Window | null = null;
  let pendingOrigin: DOMRect | null = null;
  let restoreTranslate: (() => void) | null = null;

  const releaseHold = (): void => {
    restoreTranslate?.();
    restoreTranslate = null;
  };

  const cancel = (): void => {
    if (pendingFrame !== null) {
      pendingView?.cancelAnimationFrame(pendingFrame);
      pendingFrame = null;
      pendingView = null;
      pendingOrigin = null;
    }
    releaseHold();

    if (!animation) {
      return;
    }

    animation.cancel();
    animation = null;
  };

  return {
    retarget<T>(
      tooltip: HTMLElement,
      update: () => T
    ): T {
      const before = pendingOrigin ??
        tooltip.getBoundingClientRect();

      // Measure the current visual position before interrupting an in-flight
      // animation so rapid A -> B -> C traversal continues from where the
      // tooltip is actually being rendered.
      cancel();

      const result = update();

      const view = tooltip.ownerDocument.defaultView;

      if (
        options.duration <= 0 ||
        prefersReducedMotion(tooltip) ||
        typeof tooltip.animate !== "function" ||
        !view?.requestAnimationFrame
      ) {
        return result;
      }

      // Chrome can report the new anchor's document coordinates as viewport
      // coordinates during the first frame after reassignment. Wait through
      // that frame before measuring the settled destination.
      pendingView = view;
      pendingOrigin = before;
      const previousTranslate = tooltip.style.getPropertyValue("translate");
      const previousPriority = tooltip.style.getPropertyPriority("translate");
      restoreTranslate = () => {
        if (previousTranslate) {
          tooltip.style.setProperty("translate", previousTranslate, previousPriority);
        } else {
          tooltip.style.removeProperty("translate");
        }
      };

      const holdAtOrigin = (): void => {
        releaseHold();
        const current = tooltip.getBoundingClientRect();
        // Anchor reassignment can leave getBoundingClientRect() with the old
        // anchor's scroll adjustment until paint. Fixed-position layout offsets
        // already describe the new viewport position; using the stale rect here
        // would apply the page's scroll distance as a visible translation.
        const style = view.getComputedStyle(tooltip);
        const useLayoutOffsets = style.position === "fixed" &&
          tooltip.offsetParent === null &&
          Boolean(style.getPropertyValue("position-anchor")) &&
          style.getPropertyValue("position-anchor") !== "auto" &&
          (style.translate === "none" || !style.translate);
        const x = before.left - (useLayoutOffsets ? tooltip.offsetLeft : current.left);
        const y = before.top - (useLayoutOffsets ? tooltip.offsetTop : current.top);
        tooltip.style.setProperty("translate", `${x}px ${y}px`);
        restoreTranslate = () => {
          if (previousTranslate) {
            tooltip.style.setProperty("translate", previousTranslate, previousPriority);
          } else {
            tooltip.style.removeProperty("translate");
          }
        };
      };

      // Keep the visible node at its old location while the anchor settles.
      // Recalculate before each paint because Chrome's first anchor position
      // can differ from the position reported in the next frame.
      holdAtOrigin();
      pendingFrame = view.requestAnimationFrame(() => {
        holdAtOrigin();
        pendingFrame = view.requestAnimationFrame(() => {
          pendingFrame = null;
          pendingView = null;
          pendingOrigin = null;
          releaseHold();

          if (!tooltip.isConnected || tooltip.hidden) {
            return;
          }

          const after = tooltip.getBoundingClientRect();
          const { x, y } = positionDelta(before, after);

          if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) {
            return;
          }

          try {
            const nextAnimation = tooltip.animate(
              [
                {
                  transform: `translate(${x}px, ${y}px)`
                },
                {
                  transform: "translate(0, 0)"
                }
              ],
              {
                duration: options.duration,
                easing: options.easing,
                fill: "both"
              }
            );

            animation = nextAnimation;

            nextAnimation.addEventListener(
              "finish",
              () => {
                if (animation !== nextAnimation) {
                  return;
                }

                nextAnimation.cancel();
                animation = null;
              },
              { once: true }
            );

            nextAnimation.addEventListener(
              "cancel",
              () => {
                if (animation === nextAnimation) {
                  animation = null;
                }
              },
              { once: true }
            );
          } catch {
            // Invalid consumer easing values or a partial WAAPI implementation
            // must not block the already-completed retarget state change.
            animation = null;
          }
        });
      });

      return result;
    },

    cancel
  };
}
