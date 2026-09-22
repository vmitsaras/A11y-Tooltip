export interface HintPopoverElement extends HTMLElement {
  popover: string | null;
  showPopover(options?: { source?: HTMLElement }): void;
  hidePopover(): void;
}

export interface PopoverToggleEvent extends Event {
  readonly newState: "open" | "closed";
}

export function supportsHintPopover(
  element: HTMLElement
): element is HintPopoverElement {
  const view = element.ownerDocument.defaultView;

  if (!view) {
    return false;
  }

  const prototype =
    view.HTMLElement.prototype as HintPopoverElement;

  if (
    !Object.hasOwn(prototype, "popover") ||
    typeof prototype.showPopover !== "function" ||
    typeof prototype.hidePopover !== "function"
  ) {
    return false;
  }

  const probe =
    element.ownerDocument.createElement(
      "div"
    ) as HintPopoverElement;

  probe.setAttribute("popover", "hint");

  return probe.popover === "hint";
}

export function isPopoverOpen(
  element: HTMLElement
): boolean {
  try {
    return element.matches(":popover-open");
  } catch {
    return false;
  }
}
