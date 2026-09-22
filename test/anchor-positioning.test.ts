import { afterEach, describe, expect, it } from "vitest";
import { createTooltip } from "../src/index.js";
import {
  createAnchorPositioningAddon,
  type AnchorPositioningFallback
} from "../src/addons/index.js";

function renderTooltip(
  placement: "top" | "right" | "bottom" | "left" = "top"
): HTMLElement {
  document.body.innerHTML = `
    <span
      class="a11y-tooltip"
      data-a11y-tooltip
      data-a11y-tooltip-placement="${placement}"
    >
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

describe("createAnchorPositioningAddon", () => {
  it("creates a unique anchor association and enables the CSS hook", () => {
    const root = renderTooltip("top");
    const instance = createTooltip(root, {
      addons: [createAnchorPositioningAddon()]
    });

    const anchorName =
      instance.trigger.style.getPropertyValue("anchor-name");

    expect(root.hasAttribute(
      "data-a11y-tooltip-anchor-positioning"
    )).toBe(true);

    expect(anchorName).toMatch(/^--a11y-tooltip-anchor-\d+$/u);

    expect(
      instance.tooltip.style.getPropertyValue("position-anchor")
    ).toBe(anchorName);

    expect(
      instance.tooltip.style.getPropertyValue(
        "position-try-fallbacks"
      )
    ).toBe(
      "flip-block, flip-inline, flip-block flip-inline"
    );
  });

  it("prefers inline flipping for left and right placements", () => {
    const root = renderTooltip("right");
    const instance = createTooltip(root, {
      addons: [createAnchorPositioningAddon()]
    });

    expect(
      instance.tooltip.style.getPropertyValue(
        "position-try-fallbacks"
      )
    ).toBe(
      "flip-inline, flip-block, flip-block flip-inline"
    );
  });

  it("supports explicit fallback tactics and removes duplicates", () => {
    const root = renderTooltip();

    const fallbacks = [
      "flip-start",
      "flip-block",
      "flip-start"
    ] as readonly AnchorPositioningFallback[];

    const instance = createTooltip(root, {
      addons: [
        createAnchorPositioningAddon({
          fallbacks
        })
      ]
    });

    expect(
      instance.tooltip.style.getPropertyValue(
        "position-try-fallbacks"
      )
    ).toBe("flip-start, flip-block");
  });

  it("uses none when an empty fallback list is requested", () => {
    const root = renderTooltip();
    const instance = createTooltip(root, {
      addons: [
        createAnchorPositioningAddon({
          fallbacks: []
        })
      ]
    });

    expect(
      instance.tooltip.style.getPropertyValue(
        "position-try-fallbacks"
      )
    ).toBe("none");
  });

  it("preserves authored anchor names and restores styles on destroy", () => {
    const root = renderTooltip();
    const trigger = root.querySelector(
      "[data-a11y-tooltip-trigger]"
    );
    const tooltip = root.querySelector(
      "[data-a11y-tooltip-content]"
    );

    if (
      !(trigger instanceof HTMLElement) ||
      !(tooltip instanceof HTMLElement)
    ) {
      throw new Error("Missing tooltip fixture elements.");
    }

    root.setAttribute(
      "data-a11y-tooltip-anchor-positioning",
      "authored"
    );

    trigger.style.setProperty(
      "anchor-name",
      "--existing-anchor",
      "important"
    );

    tooltip.style.setProperty(
      "position-anchor",
      "--existing-position-anchor"
    );

    tooltip.style.setProperty(
      "position-try-fallbacks",
      "flip-start"
    );

    const instance = createTooltip(root, {
      addons: [createAnchorPositioningAddon()]
    });

    expect(
      trigger.style.getPropertyValue("anchor-name")
    ).toContain("--existing-anchor");

    expect(
      trigger.style.getPropertyValue("anchor-name")
    ).toContain("--a11y-tooltip-anchor-");

    expect(
      trigger.style.getPropertyPriority("anchor-name")
    ).toBe("important");

    instance.destroy();

    expect(
      root.getAttribute(
        "data-a11y-tooltip-anchor-positioning"
      )
    ).toBe("authored");

    expect(
      trigger.style.getPropertyValue("anchor-name")
    ).toBe("--existing-anchor");

    expect(
      trigger.style.getPropertyPriority("anchor-name")
    ).toBe("important");

    expect(
      tooltip.style.getPropertyValue("position-anchor")
    ).toBe("--existing-position-anchor");

    expect(
      tooltip.style.getPropertyValue(
        "position-try-fallbacks"
      )
    ).toBe("flip-start");
  });

  it("creates different anchor names for separate instances", () => {
    document.body.innerHTML = `
      <span data-a11y-tooltip data-a11y-tooltip-placement="top">
        <button data-a11y-tooltip-trigger>One</button>
        <span data-a11y-tooltip-content>First</span>
      </span>
      <span data-a11y-tooltip data-a11y-tooltip-placement="top">
        <button data-a11y-tooltip-trigger>Two</button>
        <span data-a11y-tooltip-content>Second</span>
      </span>
    `;

    const roots = Array.from(
      document.querySelectorAll("[data-a11y-tooltip]")
    ).filter(
      (root): root is HTMLElement => root instanceof HTMLElement
    );

    const first = createTooltip(roots[0], {
      addons: [createAnchorPositioningAddon()]
    });

    const second = createTooltip(roots[1], {
      addons: [createAnchorPositioningAddon()]
    });

    expect(
      first.trigger.style.getPropertyValue("anchor-name")
    ).not.toBe(
      second.trigger.style.getPropertyValue("anchor-name")
    );
  });

  it("does not alter the tooltip accessibility relationship", () => {
    const root = renderTooltip();
    const instance = createTooltip(root, {
      addons: [createAnchorPositioningAddon()]
    });

    expect(
      instance.trigger.getAttribute("aria-describedby")
    ).toBe(instance.tooltip.id);

    expect(instance.tooltip.getAttribute("role")).toBe(
      "tooltip"
    );
  });
});
