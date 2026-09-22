import { TooltipAdapter } from "../index.js";
//#region src/adapters/index.d.ts
interface SelectorAdapterOptions {
  /**
   * Human-readable adapter name used in integration errors.
   */
  name: string;
  /**
   * Selector for exactly one trigger inside the tooltip root.
   */
  trigger: string;
  /**
   * Selector for exactly one tooltip element inside the tooltip root.
   */
  tooltip: string;
}
/**
 * Creates a small TooltipAdapter from design-system or legacy selectors.
 *
 * Resolution is intentionally strict: the trigger and tooltip selectors must
 * each match exactly one distinct HTMLElement inside the supplied root.
 * Missing, duplicate, invalid-selector, non-HTMLElement, or same-element
 * matches return null so the core tooltip can fail with its normal adapter
 * resolution error.
 */
declare function createSelectorAdapter(options: SelectorAdapterOptions): TooltipAdapter;
//#endregion
export { SelectorAdapterOptions, createSelectorAdapter };
//# sourceMappingURL=index.d.ts.map