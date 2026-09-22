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
    }
  ],
  examples: [
    {
      name: "Basic",
      description: "Focus, hover, Escape dismissal, placements, and lifecycle events.",
      path: "examples/basic"
    }
  ]
} satisfies PluginDocs;
