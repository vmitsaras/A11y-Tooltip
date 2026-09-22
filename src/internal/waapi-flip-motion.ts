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

function centerDelta(
  from: DOMRect,
  to: DOMRect
): { x: number; y: number } {
  return {
    x:
      from.left +
      from.width / 2 -
      (to.left + to.width / 2),
    y:
      from.top +
      from.height / 2 -
      (to.top + to.height / 2)
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

  const cancel = (): void => {
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
      const before =
        tooltip.getBoundingClientRect();

      // Measure the current visual position before interrupting an in-flight
      // animation so rapid A -> B -> C traversal continues from where the
      // tooltip is actually being rendered.
      cancel();

      const result = update();

      if (
        options.duration <= 0 ||
        prefersReducedMotion(tooltip) ||
        typeof tooltip.animate !== "function"
      ) {
        return result;
      }

      const after =
        tooltip.getBoundingClientRect();

      const { x, y } = centerDelta(
        before,
        after
      );

      if (
        Math.abs(x) < 0.5 &&
        Math.abs(y) < 0.5
      ) {
        return result;
      }

      try {
        const nextAnimation = tooltip.animate(
          [
            {
              translate: `${x}px ${y}px`
            },
            {
              translate: "0px 0px"
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

      return result;
    },

    cancel
  };
}
