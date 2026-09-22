import { TooltipAdapter } from "../index.js";
import { SharedTooltipOptions } from "../shared/index.js";
//#region src/diagnostics/index.d.ts
declare const TOOLTIP_DIAGNOSTIC_SEVERITIES: readonly ["error", "warning", "info"];
type TooltipDiagnosticSeverity = (typeof TOOLTIP_DIAGNOSTIC_SEVERITIES)[number];
declare const TOOLTIP_DIAGNOSTIC_CODES: readonly ["adapter-threw", "adapter-unresolved", "missing-trigger", "duplicate-trigger", "missing-tooltip", "duplicate-tooltip", "trigger-not-focusable", "trigger-no-obvious-name", "native-title-conflict", "tooltip-empty", "tooltip-interactive-content", "tooltip-duplicate-id", "describedby-broken-reference", "describedby-missing-tooltip", "authored-tooltip-hidden", "nested-tooltip-root", "nested-shared-tooltip-root", "shared-content-empty", "shared-invalid-trigger-selector", "shared-no-triggers"];
type TooltipDiagnosticCode = (typeof TOOLTIP_DIAGNOSTIC_CODES)[number];
interface TooltipDiagnostic {
  readonly code: TooltipDiagnosticCode;
  readonly severity: TooltipDiagnosticSeverity;
  readonly message: string;
  readonly root: HTMLElement;
  readonly element?: HTMLElement;
}
interface ScanTooltipRootOptions {
  adapter?: TooltipAdapter;
}
interface ScanTooltipsOptions extends ScanTooltipRootOptions {
  scope?: ParentNode;
  rootSelector?: string;
}
/**
 * Runs read-only diagnostics for one tooltip root.
 *
 * The scanner never initializes, opens, closes, or mutates the tooltip.
 */
declare function scanTooltipRoot(root: HTMLElement, options?: ScanTooltipRootOptions): readonly TooltipDiagnostic[];
/**
 * Runs read-only diagnostics for matching tooltip roots in a scope.
 *
 * Use rootSelector + adapter to scan custom design-system markup.
 */
declare function scanTooltips(options?: ScanTooltipsOptions): readonly TooltipDiagnostic[];
interface ScanSharedTooltipOptions {
  triggers: SharedTooltipOptions["triggers"];
  getContent: SharedTooltipOptions["getContent"];
  tooltip?: HTMLElement;
}
/**
 * Runs read-only diagnostics for a shared-tooltip container.
 *
 * The scanner does not initialize a controller or mutate triggers.
 */
declare function scanSharedTooltip(container: HTMLElement, options: ScanSharedTooltipOptions): readonly TooltipDiagnostic[];
//#endregion
export { ScanSharedTooltipOptions, ScanTooltipRootOptions, ScanTooltipsOptions, TOOLTIP_DIAGNOSTIC_CODES, TOOLTIP_DIAGNOSTIC_SEVERITIES, TooltipDiagnostic, TooltipDiagnosticCode, TooltipDiagnosticSeverity, scanSharedTooltip, scanTooltipRoot, scanTooltips };
//# sourceMappingURL=index.d.ts.map