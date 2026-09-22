import { afterEach, describe, expect, it, vi } from "vitest";
import {
  A11yTooltip,
  createTooltip,
  initTooltipsAll
} from "../src/index.js";
import { createSingleOpenAddon } from "../src/addons/index.js";

function renderTooltip({
  describedBy,
  placement
}: {
  describedBy?: string;
  placement?: string;
} = {}): HTMLElement {
  document.body.innerHTML = `
    <span
      class="a11y-tooltip"
      data-a11y-tooltip
      ${placement ? `data-a11y-tooltip-placement="${placement}"` : ""}
    >
      <button
        class="a11y-tooltip__trigger"
        data-a11y-tooltip-trigger
        ${describedBy ? `aria-describedby="${describedBy}"` : ""}
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
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("A11yTooltip", () => {
  it("initializes semantic tooltip state and opens on focus", () => {
    const root = renderTooltip();
    const instance = createTooltip(root);

    expect(instance.tooltip.getAttribute("role")).toBe("tooltip");
    expect(instance.tooltip.hidden).toBe(true);
    expect(instance.trigger.getAttribute("aria-describedby")).toBe(
      instance.tooltip.id
    );

    instance.trigger.dispatchEvent(new FocusEvent("focus"));

    expect(instance.isOpen).toBe(true);
    expect(instance.tooltip.hidden).toBe(false);
    expect(root.classList.contains("is-open")).toBe(true);
  });

  it("preserves authored aria-describedby tokens", () => {
    const root = renderTooltip({ describedBy: "existing-help" });
    const instance = createTooltip(root);

    expect(
      instance.trigger.getAttribute("aria-describedby")?.split(/\s+/u)
    ).toEqual(["existing-help", instance.tooltip.id]);
  });

  it("reuses duplicate initialization", () => {
    const root = renderTooltip();

    const first = createTooltip(root);
    const second = createTooltip(root);

    expect(first).toBe(second);
    expect(A11yTooltip.get(root)).toBe(first);
  });

  it("supports hover delay and remains open while the root is hovered", () => {
    vi.useFakeTimers();
    const root = renderTooltip();
    const instance = createTooltip(root, { showDelay: 50, hideDelay: 50 });

    root.dispatchEvent(new MouseEvent("mouseenter"));

    expect(instance.isOpen).toBe(false);

    vi.advanceTimersByTime(50);
    expect(instance.isOpen).toBe(true);

    vi.advanceTimersByTime(200);
    expect(instance.isOpen).toBe(true);

    root.dispatchEvent(new MouseEvent("mouseleave"));
    vi.advanceTimersByTime(49);

    expect(instance.isOpen).toBe(true);

    vi.advanceTimersByTime(1);
    expect(instance.isOpen).toBe(false);
  });

  it("dismisses with Escape and does not reopen until activation ends", () => {
    const root = renderTooltip();
    const instance = createTooltip(root, { showDelay: 0, hideDelay: 0 });

    instance.trigger.dispatchEvent(new FocusEvent("focus"));
    expect(instance.isOpen).toBe(true);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(instance.isOpen).toBe(false);

    root.dispatchEvent(new MouseEvent("mouseenter"));
    expect(instance.isOpen).toBe(false);

    instance.trigger.dispatchEvent(new FocusEvent("blur"));
    root.dispatchEvent(new MouseEvent("mouseleave"));
    root.dispatchEvent(new MouseEvent("mouseenter"));

    expect(instance.isOpen).toBe(true);
  });

  it("dispatches bubbling lifecycle events", () => {
    const root = renderTooltip();
    const observed: string[] = [];

    document.body.addEventListener("a11y-tooltip:init", () => {
      observed.push("init");
    });
    document.body.addEventListener("a11y-tooltip:open", () => {
      observed.push("open");
    });
    document.body.addEventListener("a11y-tooltip:close", () => {
      observed.push("close");
    });

    const instance = createTooltip(root);
    instance.open();
    instance.close();

    expect(observed).toEqual(["init", "open", "close"]);
  });

  it("allows before-open to cancel opening", () => {
    const root = renderTooltip();
    const instance = createTooltip(root);

    root.addEventListener("a11y-tooltip:before-open", (event) => {
      event.preventDefault();
    });

    expect(instance.open()).toBe(false);
    expect(instance.isOpen).toBe(false);
  });

  it("applies safe dataset options and falls back from invalid values", () => {
    const root = renderTooltip({ placement: "sideways" });
    root.dataset.a11yTooltipShowDelay = "-10";
    root.dataset.a11yTooltipHideDelay = "40";
    root.dataset.a11yTooltipCloseOnEscape = "false";

    const instance = createTooltip(root);

    expect(instance.options.showDelay).toBe(180);
    expect(instance.options.hideDelay).toBe(40);
    expect(instance.options.placement).toBe("top");
    expect(instance.options.closeOnEscape).toBe(false);
  });

  it("rejects keyboard-inaccessible triggers", () => {
    document.body.innerHTML = `
      <span data-a11y-tooltip>
        <span data-a11y-tooltip-trigger>Info</span>
        <span data-a11y-tooltip-content hidden>Tooltip</span>
      </span>
    `;

    const root = document.querySelector("[data-a11y-tooltip]");

    expect(() => createTooltip(root as HTMLElement)).toThrow(
      /keyboard-focusable/u
    );
  });

  it("rejects interactive tooltip content", () => {
    document.body.innerHTML = `
      <span data-a11y-tooltip>
        <button data-a11y-tooltip-trigger>Info</button>
        <span data-a11y-tooltip-content hidden>
          <a href="/help">Help</a>
        </span>
      </span>
    `;

    const root = document.querySelector("[data-a11y-tooltip]");

    expect(() => createTooltip(root as HTMLElement)).toThrow(
      /must not contain interactive descendants/u
    );
  });

  it("restores authored state on destroy and can be reinitialized", () => {
    const root = renderTooltip({ describedBy: "existing-help" });
    const tooltip = root.querySelector("[data-a11y-tooltip-content]");

    if (!(tooltip instanceof HTMLElement)) {
      throw new Error("Missing tooltip.");
    }

    tooltip.id = "authored-tip";
    tooltip.setAttribute("role", "note");
    tooltip.setAttribute("data-placement", "left");
    tooltip.hidden = false;

    const instance = createTooltip(root);
    instance.destroy();

    const trigger = root.querySelector("[data-a11y-tooltip-trigger]");

    expect(trigger?.getAttribute("aria-describedby")).toBe("existing-help");
    expect(tooltip.getAttribute("role")).toBe("note");
    expect(tooltip.getAttribute("data-placement")).toBe("left");
    expect(tooltip.hidden).toBe(false);
    expect(root.classList.contains("is-initialized")).toBe(false);

    const replacement = createTooltip(root);
    expect(replacement).not.toBe(instance);
  });

  it("initializes all roots explicitly", () => {
    document.body.innerHTML = `
      <span data-a11y-tooltip>
        <button data-a11y-tooltip-trigger>One</button>
        <span data-a11y-tooltip-content hidden>First</span>
      </span>
      <span data-a11y-tooltip>
        <button data-a11y-tooltip-trigger>Two</button>
        <span data-a11y-tooltip-content hidden>Second</span>
      </span>
    `;

    expect(initTooltipsAll()).toHaveLength(2);
  });

  it("supports addons with cleanup and a single-open policy", () => {
    document.body.innerHTML = `
      <span data-a11y-tooltip>
        <button data-a11y-tooltip-trigger>One</button>
        <span data-a11y-tooltip-content hidden>First</span>
      </span>
      <span data-a11y-tooltip>
        <button data-a11y-tooltip-trigger>Two</button>
        <span data-a11y-tooltip-content hidden>Second</span>
      </span>
    `;

    const [firstRoot, secondRoot] = Array.from(
      document.querySelectorAll("[data-a11y-tooltip]")
    ) as HTMLElement[];

    const addon = createSingleOpenAddon();
    const first = createTooltip(firstRoot, { addons: [addon] });
    const second = createTooltip(secondRoot, { addons: [addon] });

    first.open();
    expect(first.isOpen).toBe(true);

    second.open();
    expect(first.isOpen).toBe(false);
    expect(second.isOpen).toBe(true);

    second.destroy();
    expect(() => first.destroy()).not.toThrow();
  });
});
