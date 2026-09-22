export interface PluginDocs {
  slug: string;
  name: string;
  packageName: string;
  description: string;
  repo?: string;
  npm?: string;
  install: {
    npm: string;
    pnpm: string;
    yarn: string;
  };
  usage: string;
  selectors?: string[];
  keyboard?: Array<{
    key: string;
    description: string;
  }>;
  api: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  examples?: Array<{
    name: string;
    description: string;
    path: string;
  }>;
}

export const docs = {
  slug: "a11y-tooltip",
  name: "A11y Tooltip",
  packageName: "a11y-tooltip",
  description:
    "A dependency-free accessible tooltip for concise, non-interactive descriptions.",
  repo: "https://github.com/vmitsaras/A11y-Tooltip",
  install: {
    npm: "npm install a11y-tooltip",
    pnpm: "pnpm add a11y-tooltip",
    yarn: "yarn add a11y-tooltip"
  },
  usage: `import { createTooltip } from "a11y-tooltip";
import "a11y-tooltip/styles.css";

const root = document.querySelector("[data-a11y-tooltip]");

if (root instanceof HTMLElement) {
  createTooltip(root);
}`,
  selectors: [
    "[data-a11y-tooltip]",
    "[data-a11y-tooltip-trigger]",
    "[data-a11y-tooltip-content]"
  ],
  keyboard: [
    {
      key: "Tab / Shift+Tab",
      description:
        "Moves focus normally. Focusing the trigger reveals the tooltip; leaving it dismisses the tooltip."
    },
    {
      key: "Escape",
      description:
        "Dismisses an open tooltip without moving focus. It stays dismissed until the current hover/focus activation ends."
    }
  ],
  api: [
    {
      name: "createTooltip(root, options)",
      type: "(root: HTMLElement, options?: TooltipOptions) => TooltipInstance",
      description: "Initializes one tooltip root."
    },
    {
      name: "initTooltipsAll(options?, scope?)",
      type: "(options?: TooltipOptions, scope?: ParentNode) => TooltipInstance[]",
      description: "Explicitly initializes all matching tooltip roots in a scope."
    },
    {
      name: "open(reason?)",
      type: "(reason?: TooltipOpenReason) => boolean",
      description: "Opens the tooltip unless a cancelable before-open event prevents it."
    },
    {
      name: "close(reason?)",
      type: "(reason?: TooltipCloseReason) => boolean",
      description: "Closes the tooltip unless a cancelable before-close event prevents it."
    },
    {
      name: "destroy()",
      type: "() => void",
      description:
        "Removes listeners, addon cleanup, generated state, and restores authored ARIA/visibility attributes."
    },
    {
      name: "createOverflowOnlyAddon(options?)",
      type: "(options?: OverflowOnlyAddonOptions) => TooltipAddon",
      description:
        "From a11y-tooltip/addons: cancels visual opening unless the configured target is actually clipped."
    },
    {
      name: "createAnchorPositioningAddon(options?)",
      type: "(options?: AnchorPositioningAddonOptions) => TooltipAddon",
      description:
        "From a11y-tooltip/addons: progressively enables native CSS Anchor Positioning with placement-aware position-try fallbacks."
    },
    {
      name: "createSelectorAdapter(options)",
      type: "(options: SelectorAdapterOptions) => TooltipAdapter",
      description:
        "From a11y-tooltip/adapters: maps exactly one custom trigger and tooltip selector into the core tooltip contract."
    },
    {
      name: "scanTooltipRoot(root, options?)",
      type: "(root: HTMLElement, options?: ScanTooltipRootOptions) => readonly TooltipDiagnostic[]",
      description:
        "From a11y-tooltip/diagnostics: runs explicit read-only integration checks for one tooltip root."
    },
    {
      name: "scanTooltips(options?)",
      type: "(options?: ScanTooltipsOptions) => readonly TooltipDiagnostic[]",
      description:
        "From a11y-tooltip/diagnostics: scans matching tooltip roots in a scope without mutating them."
    },
    {
      name: "createHintPopoverAddon()",
      type: "() => TooltipAddon",
      description:
        "From a11y-tooltip/addons: experimentally renders supported tooltips as native hint popovers in the top layer and synchronizes platform dismissal."
    },
    {
      name: "createSharedTooltip(container, options)",
      type: "(container: HTMLElement, options: SharedTooltipOptions) => SharedTooltipController",
      description:
        "From a11y-tooltip/shared: coordinates one shared tooltip across many delegated triggers, with opt-in WAAPI FLIP retarget motion, native hint rendering, and experimental describedby ownership."
    },
    {
      name: "scanSharedTooltip(container, options)",
      type: "(container: HTMLElement, options: ScanSharedTooltipOptions) => readonly TooltipDiagnostic[]",
      description:
        "From a11y-tooltip/diagnostics: runs read-only integration checks for a shared-tooltip container."
    }
  ],
  examples: [
    {
      name: "Basic",
      description: "Focus, hover, Escape dismissal, placements, and lifecycle events.",
      path: "examples/basic"
    },
    {
      name: "Overflow only",
      description:
        "Shows the floating tooltip only when the measured target is visually clipped.",
      path: "examples/overflow-only"
    },
    {
      name: "Anchor positioning",
      description:
        "Uses native CSS Anchor Positioning and position-try fallbacks while preserving the default CSS fallback.",
      path: "examples/anchor-positioning"
    },
    {
      name: "Selector adapter",
      description:
        "Maps legacy BEM or design-system selectors into the tooltip core without changing its accessibility behavior.",
      path: "examples/selector-adapter"
    },
    {
      name: "Diagnostics",
      description:
        "Runs explicit read-only checks against intentionally flawed tooltip integrations.",
      path: "examples/diagnostics"
    },
    {
      name: "Native hint popover",
      description:
        "Exercises top-layer hint rendering, clipping escape, hint-stack behavior, and coexistence with an auto popover.",
      path: "examples/hint-popover"
    },
    {
      name: "Shared tooltip controller",
      description:
        "Coordinates one visual tooltip across a dense delegated toolbar, including retargeting and dynamic triggers.",
      path: "examples/shared-tooltip"
    }
  ]
} satisfies PluginDocs;
