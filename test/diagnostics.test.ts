import { afterEach, describe, expect, it } from "vitest";
import { createTooltip } from "../src/index.js";
import { createSelectorAdapter } from "../src/adapters/index.js";
import {
  scanSharedTooltip,
  scanTooltipRoot,
  scanTooltips
} from "../src/diagnostics/index.js";

function renderValidTooltip(): HTMLElement {
  document.body.innerHTML = `
    <span data-a11y-tooltip>
      <button data-a11y-tooltip-trigger>
        Shipping
      </button>
      <span data-a11y-tooltip-content>
        Free shipping over €50.
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

describe("tooltip diagnostics", () => {
  it("returns no findings for clean default markup", () => {
    const root = renderValidTooltip();

    expect(scanTooltipRoot(root)).toEqual([]);
  });

  it("does not mutate or initialize scanned markup", () => {
    const root = renderValidTooltip();
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
      throw new Error("Missing fixture elements.");
    }

    const before = root.outerHTML;

    scanTooltipRoot(root);

    expect(root.outerHTML).toBe(before);
    expect(trigger.hasAttribute("aria-describedby")).toBe(false);
    expect(tooltip.hasAttribute("role")).toBe(false);
  });

  it("reports missing and duplicate default markup", () => {
    document.body.innerHTML = `
      <span data-a11y-tooltip>
        <button data-a11y-tooltip-trigger>One</button>
        <button data-a11y-tooltip-trigger>Two</button>
      </span>
    `;

    const root = document.querySelector("[data-a11y-tooltip]");

    if (!(root instanceof HTMLElement)) {
      throw new Error("Missing root.");
    }

    const codes = scanTooltipRoot(root).map(
      (finding) => finding.code
    );

    expect(codes).toContain("duplicate-trigger");
    expect(codes).toContain("missing-tooltip");
  });

  it("reports focus, native title, and interactive issues", () => {
    document.body.innerHTML = `
      <span data-a11y-tooltip>
        <span
          data-a11y-tooltip-trigger
          title="Native tooltip"
        ></span>
        <span data-a11y-tooltip-content>
          <button>Action</button>
        </span>
      </span>
    `;

    const root = document.querySelector("[data-a11y-tooltip]");

    if (!(root instanceof HTMLElement)) {
      throw new Error("Missing root.");
    }

    const codes = scanTooltipRoot(root).map(
      (finding) => finding.code
    );

    expect(codes).toContain("trigger-not-focusable");
    expect(codes).toContain("native-title-conflict");
    expect(codes).toContain("tooltip-interactive-content");
  });

  it("reports empty tooltip content", () => {
    document.body.innerHTML = `
      <span data-a11y-tooltip>
        <button data-a11y-tooltip-trigger>Help</button>
        <span data-a11y-tooltip-content>   </span>
      </span>
    `;

    const root = document.querySelector("[data-a11y-tooltip]");

    if (!(root instanceof HTMLElement)) {
      throw new Error("Missing root.");
    }

    expect(
      scanTooltipRoot(root).map((finding) => finding.code)
    ).toContain("tooltip-empty");
  });

  it("reports a trigger with no obvious accessible-name source", () => {
    document.body.innerHTML = `
      <span data-a11y-tooltip>
        <button
          data-a11y-tooltip-trigger
          aria-label=""
        ></button>
        <span data-a11y-tooltip-content>
          Helpful description.
        </span>
      </span>
    `;

    const root = document.querySelector("[data-a11y-tooltip]");

    if (!(root instanceof HTMLElement)) {
      throw new Error("Missing root.");
    }

    expect(
      scanTooltipRoot(root).map((finding) => finding.code)
    ).toContain("trigger-no-obvious-name");
  });

  it("reports hidden authored fallback content before initialization", () => {
    const root = renderValidTooltip();
    const tooltip = root.querySelector(
      "[data-a11y-tooltip-content]"
    );

    if (!(tooltip instanceof HTMLElement)) {
      throw new Error("Missing tooltip.");
    }

    tooltip.hidden = true;

    expect(
      scanTooltipRoot(root).map((finding) => finding.code)
    ).toContain("authored-tooltip-hidden");
  });

  it("checks initialized aria-describedby integrity", () => {
    const root = renderValidTooltip();
    const instance = createTooltip(root);

    instance.trigger.removeAttribute("aria-describedby");

    expect(
      scanTooltipRoot(root).map((finding) => finding.code)
    ).toContain("describedby-missing-tooltip");
  });

  it("reports duplicate tooltip ids and broken describedby references", () => {
    const root = renderValidTooltip();
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
      throw new Error("Missing fixture elements.");
    }

    tooltip.id = "shared-tip";
    trigger.setAttribute(
      "aria-describedby",
      "shared-tip missing-help"
    );

    document.body.insertAdjacentHTML(
      "beforeend",
      '<span id="shared-tip">Duplicate id</span>'
    );

    const codes = scanTooltipRoot(root).map(
      (finding) => finding.code
    );

    expect(codes).toContain("tooltip-duplicate-id");
    expect(codes).toContain(
      "describedby-broken-reference"
    );
  });

  it("supports custom root selectors and adapters", () => {
    document.body.innerHTML = `
      <span class="field-help">
        <button class="field-help__trigger">
          Help
        </button>
        <span class="field-help__copy">
          Helpful description.
        </span>
      </span>
    `;

    const adapter = createSelectorAdapter({
      name: "field-help",
      trigger: ".field-help__trigger",
      tooltip: ".field-help__copy"
    });

    expect(
      scanTooltips({
        rootSelector: ".field-help",
        adapter
      })
    ).toEqual([]);
  });

  it("reports invalid adapter element contracts without throwing", () => {
    const root = renderValidTooltip();

    const findings = scanTooltipRoot(root, {
      adapter: {
        name: "invalid-elements",
        resolve() {
          return {
            trigger: document.createElementNS(
              "http://www.w3.org/2000/svg",
              "g"
            ),
            tooltip: document.createElement("span")
          } as never;
        }
      }
    });

    expect(findings.map((finding) => finding.code)).toContain(
      "adapter-unresolved"
    );
  });

  it("reports adapter failures without throwing", () => {
    const root = renderValidTooltip();

    const findings = scanTooltipRoot(root, {
      adapter: {
        name: "broken",
        resolve() {
          throw new Error("boom");
        }
      }
    });

    expect(findings.map((finding) => finding.code)).toContain(
      "adapter-threw"
    );
  });

  it("reports nested tooltip roots", () => {
    document.body.innerHTML = `
      <span data-a11y-tooltip>
        <button data-a11y-tooltip-trigger>Outer</button>
        <span data-a11y-tooltip-content>
          Outer help.
        </span>

        <span data-a11y-tooltip>
          <button data-a11y-tooltip-trigger>Inner</button>
          <span data-a11y-tooltip-content>
            Inner help.
          </span>
        </span>
      </span>
    `;

    const root = document.querySelector("[data-a11y-tooltip]");

    if (!(root instanceof HTMLElement)) {
      throw new Error("Missing root.");
    }

    expect(
      scanTooltipRoot(root).map((finding) => finding.code)
    ).toContain("nested-tooltip-root");
  });

  it("reports shared-tooltip integration mistakes without mutation", () => {
    document.body.innerHTML = `
      <div class="toolbar">
        <button
          aria-label="Bold"
          title="Bold"
          data-tooltip-text="Bold"
        >
          B
        </button>
        <span data-tooltip-text=""></span>
      </div>
    `;

    const container = document.querySelector(".toolbar");

    if (!(container instanceof HTMLElement)) {
      throw new Error("Missing shared container.");
    }

    const before = container.outerHTML;

    const codes = scanSharedTooltip(container, {
      triggers: "[data-tooltip-text]",
      getContent(trigger) {
        return trigger.dataset.tooltipText;
      }
    }).map((finding) => finding.code);

    expect(codes).toContain("native-title-conflict");
    expect(codes).toContain("trigger-not-focusable");
    expect(codes).toContain("trigger-no-obvious-name");
    expect(codes).toContain("shared-content-empty");
    expect(container.outerHTML).toBe(before);
  });

  it("reports experimental shared modes and stale describedby ownership", () => {
    document.body.innerHTML = `
      <div class="toolbar">
        <button
          aria-label="Bold"
          data-tooltip-text="Bold"
          aria-describedby="shared-tip"
        >
          B
        </button>
      </div>
      <span id="shared-tip"></span>
      <span id="shared-tip"></span>
    `;

    const container = document.querySelector(".toolbar");
    const tooltip = document.querySelector("#shared-tip");

    if (
      !(container instanceof HTMLElement) ||
      !(tooltip instanceof HTMLElement)
    ) {
      throw new Error("Missing shared diagnostics fixture.");
    }

    const codes = scanSharedTooltip(container, {
      triggers: "[data-tooltip-text]",
      getContent(trigger) {
        return trigger.dataset.tooltipText;
      },
      tooltip,
      renderMode: "hint-popover",
      semantics: "describedby"
    }).map((finding) => finding.code);

    expect(codes).toContain(
      "shared-hint-popover-experimental"
    );
    expect(codes).toContain(
      "shared-describedby-experimental"
    );
    expect(codes).toContain(
      "shared-describedby-preexisting-reference"
    );
    expect(codes).toContain(
      "shared-tooltip-duplicate-id"
    );
  });

  it("reports invalid shared-tooltip selectors as findings", () => {
    const container = document.createElement("div");

    const findings = scanSharedTooltip(container, {
      triggers: "[",
      getContent() {
        return "Help";
      }
    });

    expect(findings.map((finding) => finding.code)).toContain(
      "shared-invalid-trigger-selector"
    );
  });

  it("rejects invalid scanner configuration", () => {
    expect(() =>
      scanTooltips({
        rootSelector: "["
      })
    ).toThrow(/invalid rootSelector/u);
  });
});
