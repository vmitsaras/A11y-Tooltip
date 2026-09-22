import type { SharedTooltipOptions } from "../shared/index.js";
import {
  A11yTooltip,
  dataAttributeAdapter,
  tooltipSelectors,
  type TooltipAdapter,
  type TooltipElements
} from "../index.js";

export const TOOLTIP_DIAGNOSTIC_SEVERITIES = Object.freeze([
  "error",
  "warning",
  "info"
] as const);

export type TooltipDiagnosticSeverity =
  (typeof TOOLTIP_DIAGNOSTIC_SEVERITIES)[number];

export const TOOLTIP_DIAGNOSTIC_CODES = Object.freeze([
  "adapter-threw",
  "adapter-unresolved",
  "missing-trigger",
  "duplicate-trigger",
  "missing-tooltip",
  "duplicate-tooltip",
  "trigger-not-focusable",
  "trigger-no-obvious-name",
  "native-title-conflict",
  "tooltip-empty",
  "tooltip-interactive-content",
  "tooltip-duplicate-id",
  "describedby-broken-reference",
  "describedby-missing-tooltip",
  "authored-tooltip-hidden",
  "nested-tooltip-root",
  "nested-shared-tooltip-root",
  "shared-content-empty",
  "shared-invalid-trigger-selector",
  "shared-no-triggers"
] as const);

export type TooltipDiagnosticCode =
  (typeof TOOLTIP_DIAGNOSTIC_CODES)[number];

export interface TooltipDiagnostic {
  readonly code: TooltipDiagnosticCode;
  readonly severity: TooltipDiagnosticSeverity;
  readonly message: string;
  readonly root: HTMLElement;
  readonly element?: HTMLElement;
}

export interface ScanTooltipRootOptions {
  adapter?: TooltipAdapter;
}

export interface ScanTooltipsOptions extends ScanTooltipRootOptions {
  scope?: ParentNode;
  rootSelector?: string;
}

const INTERACTIVE_CONTENT_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function finding(
  root: HTMLElement,
  code: TooltipDiagnosticCode,
  severity: TooltipDiagnosticSeverity,
  message: string,
  element?: HTMLElement
): TooltipDiagnostic {
  return Object.freeze({
    code,
    severity,
    message,
    root,
    ...(element ? { element } : {})
  });
}

function isKeyboardFocusable(element: HTMLElement): boolean {
  if (
    "disabled" in element &&
    Boolean((element as HTMLButtonElement).disabled)
  ) {
    return false;
  }

  return element.tabIndex >= 0;
}

function hasObviousAccessibleName(element: HTMLElement): boolean {
  const ariaLabel = element.getAttribute("aria-label");

  if (ariaLabel && ariaLabel.trim().length > 0) {
    return true;
  }

  const labelledBy = element.getAttribute("aria-labelledby");

  if (labelledBy) {
    const rootNode = element.getRootNode();
    const getElementById = (
      rootNode as Document | ShadowRoot
    ).getElementById;

    if (typeof getElementById === "function") {
      const hasLabelReference = labelledBy
        .trim()
        .split(/\s+/u)
        .filter(Boolean)
        .some((id) => {
          const label = getElementById.call(rootNode, id);

          return Boolean(label?.textContent?.trim());
        });

      if (hasLabelReference) {
        return true;
      }
    }
  }

  if (element.textContent?.trim()) {
    return true;
  }

  if (
    element instanceof HTMLInputElement &&
    element.value.trim().length > 0
  ) {
    return true;
  }

  const imageWithAlt = element.querySelector("img[alt]");

  if (
    imageWithAlt instanceof HTMLImageElement &&
    imageWithAlt.alt.trim().length > 0
  ) {
    return true;
  }

  const title = element.getAttribute("title");

  return Boolean(title?.trim());
}

function duplicateIdCount(element: HTMLElement): number {
  const id = element.id.trim();

  if (!id) {
    return 0;
  }

  return Array.from(
    element.ownerDocument.querySelectorAll("[id]")
  ).filter((candidate) => candidate.id === id).length;
}

function getBrokenDescribedByIds(
  trigger: HTMLElement
): string[] {
  const describedBy = trigger.getAttribute("aria-describedby");

  if (!describedBy) {
    return [];
  }

  const rootNode = trigger.getRootNode();
  const getElementById = (
    rootNode as Document | ShadowRoot
  ).getElementById;

  if (typeof getElementById !== "function") {
    return [];
  }

  return describedBy
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .filter((id) => !getElementById.call(rootNode, id));
}

function inspectDefaultMarkup(
  root: HTMLElement,
  findings: TooltipDiagnostic[]
): TooltipElements | null {
  const triggerMatches = root.querySelectorAll(
    tooltipSelectors.trigger
  );

  const tooltipMatches = root.querySelectorAll(
    tooltipSelectors.tooltip
  );

  if (triggerMatches.length === 0) {
    findings.push(
      finding(
        root,
        "missing-trigger",
        "error",
        `No element matches ${tooltipSelectors.trigger} inside this tooltip root.`
      )
    );
  } else if (triggerMatches.length > 1) {
    findings.push(
      finding(
        root,
        "duplicate-trigger",
        "error",
        `${triggerMatches.length} elements match ${tooltipSelectors.trigger}; exactly one trigger is required.`
      )
    );
  }

  if (tooltipMatches.length === 0) {
    findings.push(
      finding(
        root,
        "missing-tooltip",
        "error",
        `No element matches ${tooltipSelectors.tooltip} inside this tooltip root.`
      )
    );
  } else if (tooltipMatches.length > 1) {
    findings.push(
      finding(
        root,
        "duplicate-tooltip",
        "error",
        `${tooltipMatches.length} elements match ${tooltipSelectors.tooltip}; exactly one tooltip is required.`
      )
    );
  }

  if (
    triggerMatches.length !== 1 ||
    tooltipMatches.length !== 1
  ) {
    return null;
  }

  const trigger = triggerMatches[0];
  const tooltip = tooltipMatches[0];

  if (
    !(trigger instanceof HTMLElement) ||
    !(tooltip instanceof HTMLElement)
  ) {
    return null;
  }

  return { trigger, tooltip };
}

function resolveElements(
  root: HTMLElement,
  adapter: TooltipAdapter,
  findings: TooltipDiagnostic[]
): TooltipElements | null {
  const initialized = A11yTooltip.get(root);

  if (initialized) {
    return {
      trigger: initialized.trigger,
      tooltip: initialized.tooltip
    };
  }

  if (adapter === dataAttributeAdapter) {
    return inspectDefaultMarkup(root, findings);
  }

  try {
    const elements = adapter.resolve(root);

    if (
      !elements ||
      !(elements.trigger instanceof HTMLElement) ||
      !(elements.tooltip instanceof HTMLElement) ||
      elements.trigger === elements.tooltip
    ) {
      findings.push(
        finding(
          root,
          "adapter-unresolved",
          "error",
          `Tooltip adapter "${adapter.name}" could not resolve one distinct HTMLElement trigger and tooltip for this root.`
        )
      );

      return null;
    }

    return elements;
  } catch {
    findings.push(
      finding(
        root,
        "adapter-threw",
        "error",
        `Tooltip adapter "${adapter.name}" threw while resolving this root.`
      )
    );

    return null;
  }
}

function inspectElements(
  root: HTMLElement,
  elements: TooltipElements,
  findings: TooltipDiagnostic[]
): void {
  const { trigger, tooltip } = elements;

  if (!isKeyboardFocusable(trigger)) {
    findings.push(
      finding(
        root,
        "trigger-not-focusable",
        "error",
        "The resolved tooltip trigger is not keyboard-focusable.",
        trigger
      )
    );
  }

  if (!hasObviousAccessibleName(trigger)) {
    findings.push(
      finding(
        root,
        "trigger-no-obvious-name",
        "warning",
        "No obvious accessible-name source was detected on the trigger. This is a heuristic, not a computed accessible-name calculation.",
        trigger
      )
    );
  }

  const nativeTitle = trigger.getAttribute("title");

  if (nativeTitle?.trim()) {
    findings.push(
      finding(
        root,
        "native-title-conflict",
        "warning",
        "The trigger has a non-empty title attribute, which may create a second native tooltip alongside A11y Tooltip.",
        trigger
      )
    );
  }

  if (!tooltip.textContent?.trim()) {
    findings.push(
      finding(
        root,
        "tooltip-empty",
        "error",
        "Tooltip content is empty or whitespace-only.",
        tooltip
      )
    );
  }

  if (
    tooltip.matches(INTERACTIVE_CONTENT_SELECTOR) ||
    tooltip.querySelector(INTERACTIVE_CONTENT_SELECTOR)
  ) {
    findings.push(
      finding(
        root,
        "tooltip-interactive-content",
        "error",
        "Tooltip content is interactive. Use a popover or dialog pattern instead.",
        tooltip
      )
    );
  }

  if (duplicateIdCount(tooltip) > 1) {
    findings.push(
      finding(
        root,
        "tooltip-duplicate-id",
        "error",
        `Tooltip id "${tooltip.id}" is duplicated in the document.`,
        tooltip
      )
    );
  }

  const brokenIds = getBrokenDescribedByIds(trigger);

  if (brokenIds.length > 0) {
    findings.push(
      finding(
        root,
        "describedby-broken-reference",
        "warning",
        `aria-describedby references missing id${brokenIds.length === 1 ? "" : "s"}: ${brokenIds.join(", ")}.`,
        trigger
      )
    );
  }

  const initialized = A11yTooltip.get(root);

  if (initialized) {
    const describedByTokens = (
      trigger.getAttribute("aria-describedby") ?? ""
    )
      .trim()
      .split(/\s+/u)
      .filter(Boolean);

    if (
      tooltip.id.trim().length === 0 ||
      !describedByTokens.includes(tooltip.id)
    ) {
      findings.push(
        finding(
          root,
          "describedby-missing-tooltip",
          "error",
          "The initialized trigger no longer references its tooltip id through aria-describedby.",
          trigger
        )
      );
    }
  } else if (tooltip.hidden) {
    findings.push(
      finding(
        root,
        "authored-tooltip-hidden",
        "warning",
        "The authored tooltip is hidden before initialization, so the progressive no-JavaScript fallback is not visible.",
        tooltip
      )
    );
  }

}

/**
 * Runs read-only diagnostics for one tooltip root.
 *
 * The scanner never initializes, opens, closes, or mutates the tooltip.
 */
export function scanTooltipRoot(
  root: HTMLElement,
  options: ScanTooltipRootOptions = {}
): readonly TooltipDiagnostic[] {
  if (!(root instanceof HTMLElement)) {
    throw new TypeError(
      "scanTooltipRoot() requires an HTMLElement root."
    );
  }

  const findings: TooltipDiagnostic[] = [];
  const nestedRoot = root.querySelector(tooltipSelectors.root);

  if (nestedRoot instanceof HTMLElement) {
    findings.push(
      finding(
        root,
        "nested-tooltip-root",
        "warning",
        "A tooltip root is nested inside another tooltip root. Nested activation regions can make hover and lifecycle behavior difficult to reason about.",
        nestedRoot
      )
    );
  }

  const adapter = options.adapter ?? dataAttributeAdapter;
  const elements = resolveElements(root, adapter, findings);

  if (elements) {
    inspectElements(root, elements, findings);
  }

  return Object.freeze(findings);
}

/**
 * Runs read-only diagnostics for matching tooltip roots in a scope.
 *
 * Use rootSelector + adapter to scan custom design-system markup.
 */
export function scanTooltips(
  options: ScanTooltipsOptions = {}
): readonly TooltipDiagnostic[] {
  const scope = options.scope ?? document;
  const rootSelector =
    options.rootSelector ?? tooltipSelectors.root;

  if (
    typeof rootSelector !== "string" ||
    rootSelector.trim().length === 0
  ) {
    throw new TypeError(
      "scanTooltips() requires a non-empty rootSelector."
    );
  }

  let roots: NodeListOf<Element>;

  try {
    roots = scope.querySelectorAll(rootSelector);
  } catch {
    throw new TypeError(
      `scanTooltips() received an invalid rootSelector: ${rootSelector}`
    );
  }

  const findings = Array.from(roots)
    .filter(
      (root): root is HTMLElement => root instanceof HTMLElement
    )
    .flatMap((root) =>
      scanTooltipRoot(root, {
        adapter: options.adapter
      })
    );

  return Object.freeze(findings);
}

export interface ScanSharedTooltipOptions {
  triggers: SharedTooltipOptions["triggers"];
  getContent: SharedTooltipOptions["getContent"];
  tooltip?: HTMLElement;
}

/**
 * Runs read-only diagnostics for a shared-tooltip container.
 *
 * The scanner does not initialize a controller or mutate triggers.
 */
export function scanSharedTooltip(
  container: HTMLElement,
  options: ScanSharedTooltipOptions
): readonly TooltipDiagnostic[] {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError(
      "scanSharedTooltip() requires an HTMLElement container."
    );
  }

  const findings: TooltipDiagnostic[] = [];
  const selector =
    typeof options.triggers === "string"
      ? options.triggers.trim()
      : "";

  if (!selector) {
    findings.push(
      finding(
        container,
        "shared-invalid-trigger-selector",
        "error",
        "Shared tooltip diagnostics require a non-empty trigger selector."
      )
    );

    return Object.freeze(findings);
  }

  let matches: Element[];

  try {
    matches = Array.from(
      container.querySelectorAll(selector)
    );
  } catch {
    findings.push(
      finding(
        container,
        "shared-invalid-trigger-selector",
        "error",
        `Invalid shared-tooltip trigger selector: ${selector}`
      )
    );

    return Object.freeze(findings);
  }

  const nestedRoot = container.querySelector(
    "[data-a11y-shared-tooltip]"
  );

  if (nestedRoot instanceof HTMLElement) {
    findings.push(
      finding(
        container,
        "nested-shared-tooltip-root",
        "warning",
        "A shared-tooltip controller root is nested inside this container. Delegated ownership must remain isolated.",
        nestedRoot
      )
    );
  }

  const triggers = matches.filter(
    (match): match is HTMLElement => {
      if (!(match instanceof HTMLElement)) {
        return false;
      }

      const owner = match.closest(
        "[data-a11y-shared-tooltip]"
      );

      return owner === null || owner === container;
    }
  );

  if (triggers.length === 0) {
    findings.push(
      finding(
        container,
        "shared-no-triggers",
        "warning",
        "No shared-tooltip triggers currently match the configured selector."
      )
    );
  }

  for (const trigger of triggers) {
    if (!isKeyboardFocusable(trigger)) {
      findings.push(
        finding(
          container,
          "trigger-not-focusable",
          "error",
          "A shared-tooltip trigger is not keyboard-focusable.",
          trigger
        )
      );
    }

    if (!hasObviousAccessibleName(trigger)) {
      findings.push(
        finding(
          container,
          "trigger-no-obvious-name",
          "warning",
          "No obvious accessible-name source was detected on a shared-tooltip trigger. The shared visual tooltip is not an accessible-name substitute.",
          trigger
        )
      );
    }

    if (trigger.getAttribute("title")?.trim()) {
      findings.push(
        finding(
          container,
          "native-title-conflict",
          "warning",
          "A shared-tooltip trigger has a non-empty title attribute, which may create a second native tooltip.",
          trigger
        )
      );
    }

    let resolved = "";

    try {
      resolved = String(
        options.getContent(trigger) ?? ""
      ).trim();
    } catch {
      resolved = "";
    }

    if (!resolved) {
      findings.push(
        finding(
          container,
          "shared-content-empty",
          "warning",
          "A matching shared-tooltip trigger resolves to empty visual tooltip content.",
          trigger
        )
      );
    }
  }

  if (
    options.tooltip &&
    (
      options.tooltip.matches(
        INTERACTIVE_CONTENT_SELECTOR
      ) ||
      options.tooltip.querySelector(
        INTERACTIVE_CONTENT_SELECTOR
      )
    )
  ) {
    findings.push(
      finding(
        container,
        "tooltip-interactive-content",
        "error",
        "Shared tooltip content must remain non-interactive.",
        options.tooltip
      )
    );
  }

  return Object.freeze(findings);
}
