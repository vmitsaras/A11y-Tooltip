import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __gsapRegistered?: boolean;
    __gsapFlipGetState?: number;
    __gsapFlipKills?: number;
    __gsapFlipFrom?: number;
    __gsapFlipDuration?: number;
    __sharedGsapTooltip?: {
      readonly isOpen: boolean;
    };
  }
}

async function stubGsap(page: import("@playwright/test").Page) {
  await page.route(
    "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js",
    async (route) => {
      await route.fulfill({
        contentType: "text/javascript",
        body: `
          window.gsap = {
            registerPlugin(plugin) {
              window.__gsapRegistered = Boolean(plugin);
            }
          };
        `
      });
    }
  );

  await page.route(
    "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/Flip.min.js",
    async (route) => {
      await route.fulfill({
        contentType: "text/javascript",
        body: `
          window.Flip = {
            getState(target, vars) {
              window.__gsapFlipGetState =
                (window.__gsapFlipGetState || 0) + 1;

              return { target, vars };
            },

            killFlipsOf() {
              window.__gsapFlipKills =
                (window.__gsapFlipKills || 0) + 1;
            },

            from(state, vars) {
              window.__gsapFlipFrom =
                (window.__gsapFlipFrom || 0) + 1;
              window.__gsapFlipDuration = vars.duration;

              return { state, vars };
            }
          };
        `
      });
    }
  );
}

test("main demo compares native move and optional GSAP Flip", async ({
  page
}) => {
  await stubGsap(page);
  await page.goto("/docs/");

  const toolbar = page.locator(
    "[data-demo-shared-motion-toolbar]"
  );

  await expect(toolbar).toHaveAttribute(
    "data-motion",
    "move"
  );

  const gsapControl = page.getByRole("button", {
    name: "GSAP Flip"
  });

  await expect(gsapControl).toBeEnabled();
  await gsapControl.click();

  await expect(toolbar).toHaveAttribute(
    "data-motion",
    "gsap"
  );
  await expect(gsapControl).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  const triggers = toolbar.locator(
    "[data-tooltip-text]"
  );

  await triggers.nth(0).focus();
  await triggers.nth(1).focus();

  const tooltip = page.locator(
    ".shared-toolbar-motion__tooltip"
  );

  await expect(tooltip).toHaveText("Archive");

  await expect.poll(() => page.evaluate(() => window.__gsapFlipFrom ?? 0)).toBeGreaterThan(0);

  const gsapState = await page.evaluate(() => ({
    registered: window.__gsapRegistered,
    getState: window.__gsapFlipGetState,
    from: window.__gsapFlipFrom,
    duration: window.__gsapFlipDuration
  }));

  expect(gsapState.registered).toBe(true);
  expect(gsapState.getState).toBeGreaterThan(0);
  expect(gsapState.from).toBeGreaterThan(0);
  expect(gsapState.duration).toBe(0.22);
});

test("standalone GSAP example uses shared retarget lifecycle", async ({
  page
}) => {
  await stubGsap(page);
  await page.goto("/examples/shared-tooltip-gsap/");

  const triggers = page.locator(
    "[data-tooltip-text]"
  );

  await triggers.nth(0).focus();
  await triggers.nth(1).focus();

  await expect(
    page.locator("[data-a11y-shared-tooltip-content]")
  ).toHaveText("Italic");

  await expect.poll(() => page.evaluate(() => window.__gsapFlipFrom ?? 0)).toBeGreaterThan(0);

  const state = await page.evaluate(() => ({
    open: window.__sharedGsapTooltip?.isOpen,
    getState: window.__gsapFlipGetState,
    kills: window.__gsapFlipKills,
    from: window.__gsapFlipFrom
  }));

  expect(state.open).toBe(true);
  expect(state.getState).toBeGreaterThan(0);
  expect(state.kills).toBeGreaterThan(0);
  expect(state.from).toBeGreaterThan(0);
});

test("GSAP example skips Flip retarget animation for reduced motion", async ({
  page
}) => {
  await page.emulateMedia({
    reducedMotion: "reduce"
  });

  await stubGsap(page);
  await page.goto("/examples/shared-tooltip-gsap/");

  const triggers = page.locator(
    "[data-tooltip-text]"
  );

  await triggers.nth(0).focus();
  await triggers.nth(1).focus();

  expect(
    await page.evaluate(() =>
      window.__gsapFlipFrom ?? 0
    )
  ).toBe(0);

  await expect(
    page.locator("[data-a11y-shared-tooltip-content]")
  ).toHaveText("Italic");
});
