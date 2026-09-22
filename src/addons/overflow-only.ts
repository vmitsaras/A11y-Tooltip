import {
  tooltipEvents,
  type TooltipAddon,
  type TooltipInstance
} from "../index.js";

export const OVERFLOW_AXES = Object.freeze([
  "inline",
  "block",
  "either"
] as const);

export type OverflowAxis = (typeof OVERFLOW_AXES)[number];

export type OverflowTargetResolver = (
  instance: TooltipInstance
) => HTMLElement | null;

export type OverflowTarget =
  | "trigger"
  | string
  | OverflowTargetResolver;

export interface OverflowOnlyAddonOptions {
  /**
   * Element to measure for clipping.
   *
   * - "trigger" measures the tooltip trigger.
   * - A selector is resolved inside the tooltip root.
   * - A resolver can return any HTMLElement for the current instance.
   */
  target?: OverflowTarget;
  /**
   * Logical axis used for overflow detection.
   *
   * "inline" follows the element's writing mode, so vertical writing modes
   * measure height rather than width.
   */
  axis?: OverflowAxis;
  /**
   * Ignore overflow differences at or below this many CSS pixels.
   */
  tolerance?: number;
}

interface ResolvedOverflowOnlyAddonOptions {
  target: OverflowTarget;
  axis: OverflowAxis;
  tolerance: number;
}

const DEFAULT_OPTIONS: Readonly<ResolvedOverflowOnlyAddonOptions> =
  Object.freeze({
    target: "trigger",
    axis: "inline",
    tolerance: 0
  });

function normalizeAxis(
  value: OverflowAxis | undefined
): OverflowAxis {
  return value && OVERFLOW_AXES.includes(value)
    ? value
    : DEFAULT_OPTIONS.axis;
}

function normalizeTolerance(value: number | undefined): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return DEFAULT_OPTIONS.tolerance;
  }

  return value;
}

function normalizeOptions(
  options: OverflowOnlyAddonOptions
): Readonly<ResolvedOverflowOnlyAddonOptions> {
  return Object.freeze({
    target: options.target ?? DEFAULT_OPTIONS.target,
    axis: normalizeAxis(options.axis),
    tolerance: normalizeTolerance(options.tolerance)
  });
}

function resolveTarget(
  instance: TooltipInstance,
  target: OverflowTarget
): HTMLElement | null {
  if (target === "trigger") {
    return instance.trigger;
  }

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

function usesVerticalWritingMode(element: HTMLElement): boolean {
  const view = element.ownerDocument.defaultView;

  if (!view) {
    return false;
  }

  const writingMode = view.getComputedStyle(element).writingMode;

  return (
    writingMode.startsWith("vertical") ||
    writingMode.startsWith("sideways")
  );
}

function exceeds(
  scrollSize: number,
  clientSize: number,
  tolerance: number
): boolean {
  return scrollSize - clientSize > tolerance;
}

function isOverflowing(
  element: HTMLElement,
  axis: OverflowAxis,
  tolerance: number
): boolean {
  const verticalWritingMode = usesVerticalWritingMode(element);

  const inlineOverflow = verticalWritingMode
    ? exceeds(element.scrollHeight, element.clientHeight, tolerance)
    : exceeds(element.scrollWidth, element.clientWidth, tolerance);

  const blockOverflow = verticalWritingMode
    ? exceeds(element.scrollWidth, element.clientWidth, tolerance)
    : exceeds(element.scrollHeight, element.clientHeight, tolerance);

  if (axis === "inline") {
    return inlineOverflow;
  }

  if (axis === "block") {
    return blockOverflow;
  }

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
export function createOverflowOnlyAddon(
  options: OverflowOnlyAddonOptions = {}
): TooltipAddon {
  const resolvedOptions = normalizeOptions(options);

  return Object.freeze({
    name: "overflow-only",

    setup(instance) {
      const handleBeforeOpen = (event: Event): void => {
        const target = resolveTarget(instance, resolvedOptions.target);

        if (
          !target ||
          !isOverflowing(
            target,
            resolvedOptions.axis,
            resolvedOptions.tolerance
          )
        ) {
          event.preventDefault();
        }
      };

      instance.root.addEventListener(
        tooltipEvents.beforeOpen,
        handleBeforeOpen
      );

      return () => {
        instance.root.removeEventListener(
          tooltipEvents.beforeOpen,
          handleBeforeOpen
        );
      };
    }
  });
}
