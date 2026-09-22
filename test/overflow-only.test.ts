import { afterEach, describe, expect, it } from "vitest";
import { createTooltip } from "../src/index.js";
import { createOverflowOnlyAddon } from "../src/addons/index.js";

function renderTooltip(): HTMLElement {
  document.body.innerHTML = `
    <span class="a11y-tooltip" data-a11y-tooltip>
      <button
        class="a11y-tooltip__trigger"
        data-a11y-tooltip-trigger
      >
        Annual accessibility review 2026.pdf
      </button>
      <span
        class="a11y-tooltip__content"
        data-a11y-tooltip-content
      >
        Full file name: Annual accessibility review 2026.pdf
      </span>
    </span>
  `;

  const root = document.querySelector("[data-a11y-tooltip]");

  if (!(root instanceof HTMLElement)) {
    throw new Error("Fixture did not render.");
  }

  return root;
}

function setBoxMetrics(
  element: HTMLElement,
  metrics: Partial<{
    clientWidth: number;
    scrollWidth: number;
    clientHeight: number;
    scrollHeight: number;
  }>
): void {
  for (const [name, value] of Object.entries(metrics)) {
    Object.defineProperty(element, name, {
      configurable: true,
      value
    });
  }
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createOverflowOnlyAddon", () => {
  it("prevents visual opening when the trigger is not clipped", () => {
    const root = renderTooltip();
    const trigger = root.querySelector("[data-a11y-tooltip-trigger]");

    if (!(trigger instanceof HTMLElement)) {
      throw new Error("Missing trigger.");
    }

    setBoxMetrics(trigger, {
      clientWidth: 200,
      scrollWidth: 200
    });

    const instance = createTooltip(root, {
      addons: [createOverflowOnlyAddon()]
    });

    expect(instance.open()).toBe(false);
    expect(instance.isOpen).toBe(false);
    expect(instance.tooltip.hidden).toBe(true);
  });

  it("opens when the trigger overflows on the inline axis", () => {
    const root = renderTooltip();
    const trigger = root.querySelector("[data-a11y-tooltip-trigger]");

    if (!(trigger instanceof HTMLElement)) {
      throw new Error("Missing trigger.");
    }

    setBoxMetrics(trigger, {
      clientWidth: 160,
      scrollWidth: 260
    });

    const instance = createTooltip(root, {
      addons: [createOverflowOnlyAddon()]
    });

    expect(instance.open()).toBe(true);
    expect(instance.isOpen).toBe(true);
  });

  it("supports block and either axis checks", () => {
    const root = renderTooltip();
    const trigger = root.querySelector("[data-a11y-tooltip-trigger]");

    if (!(trigger instanceof HTMLElement)) {
      throw new Error("Missing trigger.");
    }

    setBoxMetrics(trigger, {
      clientWidth: 200,
      scrollWidth: 200,
      clientHeight: 40,
      scrollHeight: 80
    });

    const blockInstance = createTooltip(root, {
      addons: [
        createOverflowOnlyAddon({
          axis: "block"
        })
      ]
    });

    expect(blockInstance.open()).toBe(true);

    blockInstance.destroy();

    const eitherInstance = createTooltip(root, {
      addons: [
        createOverflowOnlyAddon({
          axis: "either"
        })
      ]
    });

    expect(eitherInstance.open()).toBe(true);
  });

  it("can measure a custom descendant selector", () => {
    const root = renderTooltip();
    const trigger = root.querySelector("[data-a11y-tooltip-trigger]");

    if (!(trigger instanceof HTMLElement)) {
      throw new Error("Missing trigger.");
    }

    trigger.innerHTML =
      '<span data-overflow-target>Annual accessibility review 2026.pdf</span>';

    const target = trigger.querySelector("[data-overflow-target]");

    if (!(target instanceof HTMLElement)) {
      throw new Error("Missing custom overflow target.");
    }

    setBoxMetrics(trigger, {
      clientWidth: 300,
      scrollWidth: 300
    });

    setBoxMetrics(target, {
      clientWidth: 120,
      scrollWidth: 260
    });

    const instance = createTooltip(root, {
      addons: [
        createOverflowOnlyAddon({
          target: "[data-overflow-target]"
        })
      ]
    });

    expect(instance.open()).toBe(true);
  });

  it("fails closed when an explicit target cannot be resolved", () => {
    const root = renderTooltip();

    const instance = createTooltip(root, {
      addons: [
        createOverflowOnlyAddon({
          target: "[data-missing-target]"
        })
      ]
    });

    expect(instance.open()).toBe(false);
    expect(instance.isOpen).toBe(false);
  });

  it("fails closed when target resolution throws", () => {
    const root = renderTooltip();

    const instance = createTooltip(root, {
      addons: [
        createOverflowOnlyAddon({
          target: () => {
            throw new Error("integration failure");
          }
        })
      ]
    });

    expect(instance.open()).toBe(false);
    expect(instance.isOpen).toBe(false);
  });

  it("fails closed for an invalid selector", () => {
    const root = renderTooltip();

    const instance = createTooltip(root, {
      addons: [
        createOverflowOnlyAddon({
          target: "["
        })
      ]
    });

    expect(instance.open()).toBe(false);
    expect(instance.isOpen).toBe(false);
  });

  it("respects tolerance and removes its listener during destroy", () => {
    const root = renderTooltip();
    const trigger = root.querySelector("[data-a11y-tooltip-trigger]");

    if (!(trigger instanceof HTMLElement)) {
      throw new Error("Missing trigger.");
    }

    setBoxMetrics(trigger, {
      clientWidth: 200,
      scrollWidth: 201
    });

    const instance = createTooltip(root, {
      addons: [
        createOverflowOnlyAddon({
          tolerance: 1
        })
      ]
    });

    expect(instance.open()).toBe(false);

    instance.destroy();

    const replacement = createTooltip(root);

    expect(replacement.open()).toBe(true);
  });
});
