import { expect, test } from "@playwright/test";
import { join } from "node:path";

// Optional real-library suite: provide the demo's pinned GSAP 3.15.0 scripts.
// The wiring suite remains offline; no dependency is added to the package.
const assets = process.env.GSAP_TEST_ASSETS_DIR;
test.skip(!assets, "Set GSAP_TEST_ASSETS_DIR to real GSAP 3.15.0 browser scripts");
test.beforeEach(async ({ page }) => {
  for (const name of ["gsap", "Flip"]) {
    await page.route(`https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/${name}.min.js`,
      (route) => route.fulfill({ path: join(assets!, `${name}.min.js`), contentType: "text/javascript" }));
  }
});

for (const activation of ["focus", "pointer"] as const) {
  test(`real GSAP stays visible on scrolled rapid ${activation} retargets and reopen`, async ({ page }) => {
    await page.goto("/docs/");
    await page.locator('[data-shared-motion="gsap"]').click();
    const buttons = page.locator("[data-demo-shared-motion-toolbar] button");
    const tooltip = page.locator(".shared-toolbar-motion__tooltip");
    if (activation === "focus") await buttons.nth(0).focus();
    else await buttons.nth(0).hover();
    await expect(tooltip).toBeVisible();
    const origin = await tooltip.boundingBox();
    expect(origin).not.toBeNull();
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(500);

    // Sample after paint, including the first held frame. A rAF-only read can
    // miss Chrome's late anchor scroll adjustment and falsely pass this check.
    await page.evaluate(() => {
      const state = { frames: [] as { x: number; y: number; hidden: boolean; generation: number }[], running: true, generation: 0 };
      (window as any).__motionSamples = state;
      document.querySelector("[data-demo-shared-motion-toolbar]")!.addEventListener(
        "a11y-tooltip-shared:before-retarget", () => { state.generation += 1; }
      );
      const sample = () => requestAnimationFrame(() => {
        const generation = state.generation;
        setTimeout(() => {
          // A new input task can run between rAF and this timer. In that case
          // its layout has not painted yet; sample it after the next frame.
          if (generation === state.generation) {
            const tip = document.querySelector<HTMLElement>(".shared-toolbar-motion__tooltip")!;
            const rect = tip.getBoundingClientRect();
            state.frames.push({ x: rect.x, y: rect.y, hidden: Boolean(tip.hidden), generation });
          }
          if (state.running) sample();
        }, 0);
      });
      sample();
    });
    for (const index of [1, 2, 3, 2, 1, 0]) {
      if (activation === "focus") await buttons.nth(index).focus();
      else await buttons.nth(index).hover();
      await page.waitForTimeout(55);
    }
    await page.waitForTimeout(300);
    const frames = await page.evaluate(() => {
      (window as any).__motionSamples.running = false;
      return (window as any).__motionSamples.frames as { x: number; y: number; hidden: boolean; generation: number }[];
    });
    expect(frames.length).toBeGreaterThan(10);
    for (let generation = 1; generation <= 6; generation += 1) {
      expect(frames.some(frame => frame.generation === generation)).toBe(true);
    }
    expect(Math.max(...frames.map(frame => frame.x)) - origin!.x).toBeGreaterThan(20);
    for (const frame of frames) {
      expect(frame.hidden).toBe(false);
      expect(Math.abs(frame.y - origin!.y), JSON.stringify(frame)).toBeLessThan(1);
      expect(frame.x).toBeGreaterThanOrEqual(origin!.x - 1);
      expect(frame.x).toBeLessThan(origin!.x + 300);
    }
    if (activation === "focus") await buttons.nth(1).focus();
    else await buttons.nth(1).hover();
    await page.waitForTimeout(65);
    await page.keyboard.press("Escape");
    await expect(tooltip).toBeHidden();
    if (activation === "focus") await buttons.nth(0).focus();
    else await buttons.nth(0).hover();
    await expect(tooltip).toBeVisible();
    const reopened = await tooltip.boundingBox();
    expect(Math.abs(reopened!.x - origin!.x)).toBeLessThan(1);
    expect(Math.abs(reopened!.y - origin!.y)).toBeLessThan(1);
    expect(await tooltip.evaluate(el => el.style.transform)).toBe("");
  });
}

test("real GSAP cancels pending motion and responds to reduced motion", async ({ page }) => {
  await page.goto("/docs/");
  await page.locator('[data-shared-motion="gsap"]').click();
  const buttons = page.locator("[data-demo-shared-motion-toolbar] button");
  await buttons.nth(0).focus();
  await page.evaluate(() => {
    const buttons = document.querySelectorAll<HTMLButtonElement>("[data-demo-shared-motion-toolbar] button");
    buttons[1]!.focus(); buttons[2]!.focus(); buttons[3]!.focus();
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(80);
  const tooltip = page.locator(".shared-toolbar-motion__tooltip");
  await expect(tooltip).toHaveText("Export");
  expect(await tooltip.evaluate(el => el.style.transform)).toBe("");
  expect(await tooltip.evaluate(el => el.style.translate)).toMatch(/^(none)?$/);
  await page.locator('[data-shared-motion="none"]').click();
  await buttons.nth(0).focus();
  await page.waitForTimeout(80);
  await expect(tooltip).toHaveText("Pin");
  expect(await tooltip.evaluate(el => el.style.transform)).toBe("");
});

test("real GSAP standalone cleans up an interrupted animation on destroy", async ({ page }) => {
  await page.goto("/examples/shared-tooltip-gsap/");
  await page.addStyleTag({ content: "body { padding-top: 1200px; }" });
  const buttons = page.locator("[data-toolbar] button");
  await buttons.nth(0).focus();
  const tooltip = page.locator("[data-a11y-shared-tooltip-content]");
  const origin = await tooltip.boundingBox();
  await buttons.nth(1).focus();
  await page.waitForTimeout(80);
  const moving = await tooltip.boundingBox();
  expect(Math.abs(moving!.y - origin!.y)).toBeLessThan(1);
  await page.evaluate(() => {
    const tip = document.querySelector<HTMLElement>("[data-a11y-shared-tooltip-content]")!;
    (window as any).__removedTooltip = tip;
    (window as any).__sharedGsapTooltip.destroy();
  });
  await page.waitForTimeout(100);
  await expect(tooltip).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__removedTooltip.style.transform)).toBe("");
});
