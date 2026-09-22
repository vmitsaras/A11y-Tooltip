import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSharedTooltip,
  sharedTooltipEvents
} from "../src/shared/index.js";

function renderToolbar(): {
  container: HTMLElement;
  first: HTMLButtonElement;
  second: HTMLButtonElement;
  third: HTMLButtonElement;
} {
  document.body.innerHTML = `
    <div class="toolbar">
      <button aria-label="Bold" data-tooltip-text="Bold">B</button>
      <button aria-label="Italic" data-tooltip-text="Italic">I</button>
      <button aria-label="Underline" data-tooltip-text="Underline">U</button>
    </div>
  `;

  const container = document.querySelector(".toolbar");
  const buttons = Array.from(
    document.querySelectorAll("button")
  );

  if (
    !(container instanceof HTMLElement) ||
    !(buttons[0] instanceof HTMLButtonElement) ||
    !(buttons[1] instanceof HTMLButtonElement) ||
    !(buttons[2] instanceof HTMLButtonElement)
  ) {
    throw new Error("Fixture did not render.");
  }

  return {
    container,
    first: buttons[0],
    second: buttons[1],
    third: buttons[2]
  };
}

function focusIn(
  element: HTMLElement,
  relatedTarget: EventTarget | null = null
): void {
  element.dispatchEvent(
    new FocusEvent("focusin", {
      bubbles: true,
      relatedTarget
    })
  );
}

function focusOut(
  element: HTMLElement,
  relatedTarget: EventTarget | null = null
): void {
  element.dispatchEvent(
    new FocusEvent("focusout", {
      bubbles: true,
      relatedTarget
    })
  );
}

function pointerOver(
  element: HTMLElement,
  relatedTarget: EventTarget | null = null
): void {
  element.dispatchEvent(
    new MouseEvent("pointerover", {
      bubbles: true,
      relatedTarget
    })
  );
}

function pointerOut(
  element: HTMLElement,
  relatedTarget: EventTarget | null = null
): void {
  element.dispatchEvent(
    new MouseEvent("pointerout", {
      bubbles: true,
      relatedTarget
    })
  );
}

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("createSharedTooltip", () => {
  it("uses one generated visual tooltip for many triggers", () => {
    const { container, first, second } = renderToolbar();

    const controller = createSharedTooltip(container, {
      triggers: "[data-tooltip-text]",
      getContent(trigger) {
        return trigger.dataset.tooltipText;
      }
    });

    expect(
      document.querySelectorAll(
        "[data-a11y-shared-tooltip-content]"
      )
    ).toHaveLength(1);

    expect(controller.tooltip.getAttribute("aria-hidden")).toBe("true");
    expect(first.hasAttribute("aria-describedby")).toBe(false);
    expect(second.hasAttribute("aria-describedby")).toBe(false);
  });

  it("reuses duplicate initialization for the same container", () => {
    const { container } = renderToolbar();

    const options = {
      triggers: "[data-tooltip-text]",
      getContent(trigger: HTMLElement) {
        return trigger.dataset.tooltipText;
      }
    };

    const first = createSharedTooltip(container, options);
    const second = createSharedTooltip(container, options);

    expect(second).toBe(first);
    expect(
      document.querySelectorAll(
        "[data-a11y-shared-tooltip-content]"
      )
    ).toHaveLength(1);
  });

  it("opens immediately on delegated focus", () => {
    const { container, first } = renderToolbar();

    const controller = createSharedTooltip(container, {
      triggers: "[data-tooltip-text]",
      getContent(trigger) {
        return trigger.dataset.tooltipText;
      },
      showDelay: 500
    });

    focusIn(first);

    expect(controller.isOpen).toBe(true);
    expect(controller.activeTrigger).toBe(first);
    expect(controller.tooltip.textContent).toBe("Bold");
  });

  it("respects pointer show delay", () => {
    vi.useFakeTimers();
    const { container, first } = renderToolbar();

    const controller = createSharedTooltip(container, {
      triggers: "[data-tooltip-text]",
      getContent(trigger) {
        return trigger.dataset.tooltipText;
      },
      showDelay: 50
    });

    pointerOver(first);

    expect(controller.isOpen).toBe(false);

    vi.advanceTimersByTime(49);
    expect(controller.isOpen).toBe(false);

    vi.advanceTimersByTime(1);
    expect(controller.isOpen).toBe(true);
    expect(controller.activeTrigger).toBe(first);
  });

  it("retargets an open tooltip without closing", () => {
    const { container, first, second } = renderToolbar();
    const events: string[] = [];

    container.addEventListener(
      sharedTooltipEvents.close,
      () => events.push("close")
    );
    container.addEventListener(
      sharedTooltipEvents.retarget,
      () => events.push("retarget")
    );

    const controller = createSharedTooltip(container, {
      triggers: "[data-tooltip-text]",
      getContent(trigger) {
        return trigger.dataset.tooltipText;
      },
      showDelay: 0,
      hideDelay: 0
    });

    pointerOver(first);
    pointerOut(first, second);

    expect(controller.isOpen).toBe(true);
    expect(controller.activeTrigger).toBe(second);
    expect(controller.tooltip.textContent).toBe("Italic");
    expect(events).toEqual(["retarget"]);
  });

  it("gives keyboard focus priority over pointer hover", () => {
    const { container, first, second } = renderToolbar();

    const controller = createSharedTooltip(container, {
      triggers: "[data-tooltip-text]",
      getContent(trigger) {
        return trigger.dataset.tooltipText;
      },
      showDelay: 0,
      hideDelay: 0
    });

    focusIn(first);
    pointerOver(second);

    expect(controller.activeTrigger).toBe(first);
    expect(controller.tooltip.textContent).toBe("Bold");

    focusOut(first);

    expect(controller.activeTrigger).toBe(second);
    expect(controller.tooltip.textContent).toBe("Italic");
  });

  it("keeps the tooltip open while the pointer is over it", () => {
    const { container, first } = renderToolbar();

    const controller = createSharedTooltip(container, {
      triggers: "[data-tooltip-text]",
      getContent(trigger) {
        return trigger.dataset.tooltipText;
      },
      showDelay: 0,
      hideDelay: 0
    });

    pointerOver(first);
    pointerOut(first, controller.tooltip);

    controller.tooltip.dispatchEvent(
      new MouseEvent("pointerenter")
    );

    expect(controller.isOpen).toBe(true);

    controller.tooltip.dispatchEvent(
      new MouseEvent("pointerleave")
    );

    expect(controller.isOpen).toBe(false);
  });

  it("Escape dismisses the active trigger until its activation ends", () => {
    const { container, first, second } = renderToolbar();

    const controller = createSharedTooltip(container, {
      triggers: "[data-tooltip-text]",
      getContent(trigger) {
        return trigger.dataset.tooltipText;
      },
      showDelay: 0,
      hideDelay: 0
    });

    focusIn(first);

    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape"
      })
    );

    expect(controller.isOpen).toBe(false);

    pointerOver(first);
    expect(controller.isOpen).toBe(false);

    focusOut(first);
    pointerOut(first);
    pointerOver(second);

    expect(controller.isOpen).toBe(true);
    expect(controller.activeTrigger).toBe(second);
  });

  it("refreshes active content and closes when content becomes empty", () => {
    const { container, first } = renderToolbar();

    const controller = createSharedTooltip(container, {
      triggers: "[data-tooltip-text]",
      getContent(trigger) {
        return trigger.dataset.tooltipText;
      }
    });

    controller.showFor(first);

    first.dataset.tooltipText = "Strong";
    expect(controller.refresh()).toBe(true);
    expect(controller.tooltip.textContent).toBe("Strong");

    first.dataset.tooltipText = "";
    expect(controller.refresh()).toBe(true);
    expect(controller.isOpen).toBe(false);
  });

  it("supports triggers added after initialization without observers", () => {
    const { container } = renderToolbar();

    const controller = createSharedTooltip(container, {
      triggers: "[data-tooltip-text]",
      getContent(trigger) {
        return trigger.dataset.tooltipText;
      }
    });

    const dynamic = document.createElement("button");
    dynamic.setAttribute("aria-label", "Code");
    dynamic.dataset.tooltipText = "Code";
    container.append(dynamic);

    focusIn(dynamic);

    expect(controller.isOpen).toBe(true);
    expect(controller.activeTrigger).toBe(dynamic);
    expect(controller.tooltip.textContent).toBe("Code");
  });

  it("closes safely when retarget content is empty", () => {
    const { container, first, second } = renderToolbar();
    second.dataset.tooltipText = "";

    const controller = createSharedTooltip(container, {
      triggers: "[data-tooltip-text]",
      getContent(trigger) {
        return trigger.dataset.tooltipText;
      },
      showDelay: 0,
      hideDelay: 0
    });

    focusIn(first);
    focusOut(first, second);

    expect(controller.isOpen).toBe(false);
    expect(controller.activeTrigger).toBeNull();
  });

  it("ignores non-focusable matching triggers", () => {
    const { container } = renderToolbar();
    const invalid = document.createElement("span");
    invalid.dataset.tooltipText = "Invalid";
    container.append(invalid);

    const controller = createSharedTooltip(container, {
      triggers: "[data-tooltip-text]",
      getContent(trigger) {
        return trigger.dataset.tooltipText;
      }
    });

    pointerOver(invalid);

    expect(controller.isOpen).toBe(false);
  });

  it("prevents nested controller triggers from leaking to the outer controller", () => {
    document.body.innerHTML = `
      <div class="outer">
        <button aria-label="Outer" data-tooltip-text="Outer">O</button>
        <div class="inner">
          <button aria-label="Inner" data-tooltip-text="Inner">I</button>
        </div>
      </div>
    `;

    const outer = document.querySelector(".outer");
    const inner = document.querySelector(".inner");
    const innerTrigger = inner?.querySelector("button");

    if (
      !(outer instanceof HTMLElement) ||
      !(inner instanceof HTMLElement) ||
      !(innerTrigger instanceof HTMLButtonElement)
    ) {
      throw new Error("Nested fixture did not render.");
    }

    const outerController = createSharedTooltip(outer, {
      triggers: "[data-tooltip-text]",
      getContent(trigger) {
        return trigger.dataset.tooltipText;
      }
    });

    const innerController = createSharedTooltip(inner, {
      triggers: "[data-tooltip-text]",
      getContent(trigger) {
        return trigger.dataset.tooltipText;
      }
    });

    focusIn(innerTrigger);

    expect(innerController.isOpen).toBe(true);
    expect(outerController.isOpen).toBe(false);
  });

  it("restores an authored tooltip and removes generated state on destroy", () => {
    const { container, first } = renderToolbar();
    const authored = document.createElement("span");

    authored.className = "authored-help";
    authored.setAttribute("role", "note");
    authored.setAttribute("aria-hidden", "false");
    authored.setAttribute("data-placement", "left");
    authored.setAttribute("style", "inline-size: 10rem");
    authored.hidden = false;
    document.body.append(authored);

    const controller = createSharedTooltip(container, {
      triggers: "[data-tooltip-text]",
      getContent(trigger) {
        return trigger.dataset.tooltipText;
      },
      tooltip: authored
    });

    controller.showFor(first);
    controller.destroy();

    expect(authored.className).toBe("authored-help");
    expect(authored.getAttribute("role")).toBe("note");
    expect(authored.getAttribute("aria-hidden")).toBe("false");
    expect(authored.getAttribute("data-placement")).toBe("left");
    expect(authored.getAttribute("style")).toBe("inline-size: 10rem");
    expect(authored.hidden).toBe(false);
    expect(
      authored.hasAttribute(
        "data-a11y-shared-tooltip-content"
      )
    ).toBe(false);
    expect(
      container.hasAttribute(
        "data-a11y-shared-tooltip"
      )
    ).toBe(false);
  });

  it("removes a generated tooltip on destroy", () => {
    const { container } = renderToolbar();

    const controller = createSharedTooltip(container, {
      triggers: "[data-tooltip-text]",
      getContent(trigger) {
        return trigger.dataset.tooltipText;
      }
    });

    const tooltip = controller.tooltip;

    controller.destroy();

    expect(document.body.contains(tooltip)).toBe(false);
  });

  it("allows before-open and before-retarget to cancel state changes", () => {
    const { container, first, second } = renderToolbar();

    const controller = createSharedTooltip(container, {
      triggers: "[data-tooltip-text]",
      getContent(trigger) {
        return trigger.dataset.tooltipText;
      }
    });

    container.addEventListener(
      sharedTooltipEvents.beforeOpen,
      (event) => event.preventDefault(),
      { once: true }
    );

    expect(controller.showFor(first)).toBe(false);

    expect(controller.showFor(first)).toBe(true);

    container.addEventListener(
      sharedTooltipEvents.beforeRetarget,
      (event) => event.preventDefault(),
      { once: true }
    );

    expect(controller.showFor(second)).toBe(false);
    expect(controller.activeTrigger).toBe(first);
  });
});
