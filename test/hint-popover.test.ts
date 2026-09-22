import { afterEach, describe, expect, it } from "vitest";
import { createTooltip } from "../src/index.js";
import {
  createHintPopoverAddon
} from "../src/addons/index.js";

function renderTooltip(): HTMLElement {
  document.body.innerHTML = `
    <span class="a11y-tooltip" data-a11y-tooltip>
      <button
        class="a11y-tooltip__trigger"
        data-a11y-tooltip-trigger
      >
        More info
      </button>
      <span
        class="a11y-tooltip__content"
        data-a11y-tooltip-content
      >
        Helpful description.
      </span>
    </span>
  `;

  const root = document.querySelector("[data-a11y-tooltip]");

  if (!(root instanceof HTMLElement)) {
    throw new Error("Fixture did not render.");
  }

  return root;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createHintPopoverAddon", () => {
  it("falls back without modifying markup when hint popovers are unsupported", () => {
    const root = renderTooltip();
    const instance = createTooltip(root, {
      addons: [createHintPopoverAddon()]
    });

    expect(
      root.hasAttribute(
        "data-a11y-tooltip-hint-popover"
      )
    ).toBe(false);

    expect(
      instance.tooltip.hasAttribute("popover")
    ).toBe(false);

    expect(
      instance.trigger.style.getPropertyValue(
        "anchor-name"
      )
    ).toBe("");
  });
});
