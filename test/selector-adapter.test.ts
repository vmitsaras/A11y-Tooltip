import { afterEach, describe, expect, it } from "vitest";
import { createTooltip } from "../src/index.js";
import { createSelectorAdapter } from "../src/adapters/index.js";

function renderLegacyMarkup(): HTMLElement {
  document.body.innerHTML = `
    <span class="field-help">
      <button class="field-help__trigger">
        Shipping
      </button>
      <span class="field-help__tooltip">
        Free standard shipping on orders over €50.
      </span>
    </span>
  `;

  const root = document.querySelector(".field-help");

  if (!(root instanceof HTMLElement)) {
    throw new Error("Fixture did not render.");
  }

  return root;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createSelectorAdapter", () => {
  it("resolves exactly one trigger and tooltip", () => {
    const root = renderLegacyMarkup();
    const adapter = createSelectorAdapter({
      name: "field-help",
      trigger: ".field-help__trigger",
      tooltip: ".field-help__tooltip"
    });

    const elements = adapter.resolve(root);

    expect(adapter.name).toBe("field-help");
    expect(elements?.trigger).toBe(
      root.querySelector(".field-help__trigger")
    );
    expect(elements?.tooltip).toBe(
      root.querySelector(".field-help__tooltip")
    );
  });

  it("integrates with the core tooltip without changing semantics", () => {
    const root = renderLegacyMarkup();
    const adapter = createSelectorAdapter({
      name: "legacy-bem",
      trigger: ".field-help__trigger",
      tooltip: ".field-help__tooltip"
    });

    const instance = createTooltip(root, { adapter });

    expect(instance.trigger.className).toBe(
      "field-help__trigger"
    );

    expect(instance.tooltip.className).toBe(
      "field-help__tooltip"
    );

    expect(instance.tooltip.getAttribute("role")).toBe(
      "tooltip"
    );

    expect(
      instance.trigger.getAttribute("aria-describedby")
    ).toBe(instance.tooltip.id);

    instance.trigger.dispatchEvent(new FocusEvent("focus"));

    expect(instance.isOpen).toBe(true);
  });

  it("rejects empty adapter configuration at creation time", () => {
    expect(() =>
      createSelectorAdapter({
        name: "",
        trigger: ".trigger",
        tooltip: ".tooltip"
      })
    ).toThrow(/non-empty name/u);

    expect(() =>
      createSelectorAdapter({
        name: "test",
        trigger: " ",
        tooltip: ".tooltip"
      })
    ).toThrow(/trigger selector/u);
  });

  it("returns null when a selector matches nothing", () => {
    const root = renderLegacyMarkup();
    const adapter = createSelectorAdapter({
      name: "missing-trigger",
      trigger: ".does-not-exist",
      tooltip: ".field-help__tooltip"
    });

    expect(adapter.resolve(root)).toBeNull();
  });

  it("returns null when either selector matches more than once", () => {
    const root = renderLegacyMarkup();

    root.insertAdjacentHTML(
      "beforeend",
      '<button class="field-help__trigger">Duplicate</button>'
    );

    const adapter = createSelectorAdapter({
      name: "duplicate-trigger",
      trigger: ".field-help__trigger",
      tooltip: ".field-help__tooltip"
    });

    expect(adapter.resolve(root)).toBeNull();
  });

  it("returns null for invalid CSS selectors", () => {
    const root = renderLegacyMarkup();
    const adapter = createSelectorAdapter({
      name: "invalid-selector",
      trigger: "[",
      tooltip: ".field-help__tooltip"
    });

    expect(adapter.resolve(root)).toBeNull();
  });

  it("returns null when trigger and tooltip resolve to the same element", () => {
    const root = renderLegacyMarkup();
    const adapter = createSelectorAdapter({
      name: "same-element",
      trigger: ".field-help__trigger",
      tooltip: ".field-help__trigger"
    });

    expect(adapter.resolve(root)).toBeNull();
  });

  it("surfaces the adapter name through the core resolution error", () => {
    const root = renderLegacyMarkup();
    const adapter = createSelectorAdapter({
      name: "product-ui",
      trigger: ".missing-trigger",
      tooltip: ".field-help__tooltip"
    });

    expect(() => createTooltip(root, { adapter })).toThrow(
      /adapter "product-ui" could not resolve/u
    );
  });
});
