import { expect, test } from "@playwright/test";

interface SharedTooltipTestController {
  readonly activeTrigger: HTMLElement | null;
  readonly isOpen: boolean;
  refresh(): boolean;
  destroy(): void;
}

declare global {
  interface Window {
    __sharedTooltip: SharedTooltipTestController;
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto("/examples/shared-tooltip/?count=500");
});

test("uses one tooltip node for 500 triggers", async ({ page }) => {
  await expect(
    page.locator("[data-tooltip-text]")
  ).toHaveCount(500);

  await expect(
    page.locator("[data-a11y-shared-tooltip-content]")
  ).toHaveCount(1);

  await expect(
    page.locator("[data-a11y-shared-tooltip-content]")
  ).toHaveAttribute("aria-hidden", "true");

  expect(
    await page.locator("[data-tooltip-text]").first().getAttribute(
      "aria-describedby"
    )
  ).toBeNull();
});

test("focus retargets one open tooltip across distant triggers", async ({
  page
}) => {
  const triggers = page.locator("[data-tooltip-text]");
  const tooltip = page.locator(
    "[data-a11y-shared-tooltip-content]"
  );

  await triggers.nth(0).focus();
  await expect(tooltip).toHaveText("Command 1");

  await triggers.nth(249).focus();
  await expect(tooltip).toHaveText("Command 250");

  await triggers.nth(499).focus();
  await expect(tooltip).toHaveText("Command 500");

  expect(
    await page.evaluate(() =>
      window.__sharedTooltip.activeTrigger?.dataset.triggerIndex
    )
  ).toBe("500");
});

test("rapid pointer traversal retargets without hide/show flicker", async ({
  page
}) => {
  const triggers = page.locator("[data-tooltip-text]");
  const tooltip = page.locator(
    "[data-a11y-shared-tooltip-content]"
  );

  await triggers.nth(0).hover();
  await expect(tooltip).toHaveText("Command 1");

  await triggers.nth(1).hover();
  await expect(tooltip).toHaveText("Command 2");

  await triggers.nth(2).hover();
  await expect(tooltip).toHaveText("Command 3");

  await expect(tooltip).toBeVisible();
});

test("keyboard focus wins over pointer hover", async ({ page }) => {
  const triggers = page.locator("[data-tooltip-text]");
  const tooltip = page.locator(
    "[data-a11y-shared-tooltip-content]"
  );

  await triggers.nth(0).focus();
  await triggers.nth(1).hover();

  await expect(tooltip).toHaveText("Command 1");

  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

  await expect(tooltip).toHaveText("Command 2");
});

test("Escape dismisses the current activation without moving focus", async ({
  page
}) => {
  const first = page.locator("[data-tooltip-text]").nth(0);
  const second = page.locator("[data-tooltip-text]").nth(1);
  const tooltip = page.locator(
    "[data-a11y-shared-tooltip-content]"
  );

  await first.focus();
  await page.keyboard.press("Escape");

  await expect(tooltip).toBeHidden();
  await expect(first).toBeFocused();

  await first.evaluate((element) => {
    element.dispatchEvent(
      new PointerEvent("pointerover", {
        bubbles: true
      })
    );
  });

  await expect(tooltip).toBeHidden();

  await second.focus();
  await expect(tooltip).toHaveText("Command 2");
});

test("pointer can move from trigger onto the shared tooltip", async ({
  page
}) => {
  const trigger = page.locator("[data-tooltip-text]").nth(0);
  const tooltip = page.locator(
    "[data-a11y-shared-tooltip-content]"
  );

  await trigger.hover();
  await expect(tooltip).toBeVisible();

  await tooltip.hover();
  await page.waitForTimeout(120);

  await expect(tooltip).toBeVisible();
});

test("dynamic triggers work without reinitialization", async ({ page }) => {
  await page.getByRole("button", {
    name: "Add dynamic trigger"
  }).click();

  const triggers = page.locator("[data-tooltip-text]");
  const tooltip = page.locator(
    "[data-a11y-shared-tooltip-content]"
  );

  await expect(triggers).toHaveCount(501);

  await triggers.nth(500).focus();

  await expect(tooltip).toHaveText("Command 501");
});

test("removed active triggers close safely on refresh", async ({ page }) => {
  const trigger = page.locator("[data-tooltip-text]").nth(0);
  const tooltip = page.locator(
    "[data-a11y-shared-tooltip-content]"
  );

  await trigger.focus();
  await expect(tooltip).toBeVisible();

  const result = await page.evaluate(() => {
    window.__sharedTooltip.activeTrigger?.remove();
    return window.__sharedTooltip.refresh();
  });

  expect(result).toBe(true);
  await expect(tooltip).toBeHidden();
});

test("active anchor ownership moves between triggers and restores the previous trigger", async ({
  page
}) => {
  const triggers = page.locator("[data-tooltip-text]");
  const first = triggers.nth(0);
  const second = triggers.nth(1);
  const tooltip = page.locator(
    "[data-a11y-shared-tooltip-content]"
  );

  await first.focus();

  const firstAnchor = await first.evaluate((element) =>
    element.style.getPropertyValue("anchor-name")
  );

  const positionAnchor = await tooltip.evaluate((element) =>
    element.style.getPropertyValue("position-anchor")
  );

  if (positionAnchor) {
    expect(firstAnchor).toContain(positionAnchor);

    await second.focus();

    expect(
      await first.evaluate((element) =>
        element.style.getPropertyValue("anchor-name")
      )
    ).toBe("");

    expect(
      await second.evaluate((element) =>
        element.style.getPropertyValue("anchor-name")
      )
    ).toContain(positionAnchor);
  }
});

test("RTL layout keeps the tooltip within the viewport", async ({ page }) => {
  await page.getByRole("button", {
    name: "Toggle RTL"
  }).click();

  const trigger = page.locator("[data-tooltip-text]").nth(250);
  const tooltip = page.locator(
    "[data-a11y-shared-tooltip-content]"
  );

  await trigger.focus();

  const box = await tooltip.boundingBox();

  expect(box).not.toBeNull();

  if (!box) {
    return;
  }

  const viewport = page.viewportSize();

  expect(viewport).not.toBeNull();

  if (!viewport) {
    return;
  }

  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(
    viewport.width
  );
  expect(box.y + box.height).toBeLessThanOrEqual(
    viewport.height
  );
});

test("destroy removes the generated tooltip and delegated state", async ({
  page
}) => {
  const trigger = page.locator("[data-tooltip-text]").nth(0);

  await trigger.focus();

  await page.evaluate(() => {
    window.__sharedTooltip.destroy();
  });

  await expect(
    page.locator("[data-a11y-shared-tooltip-content]")
  ).toHaveCount(0);

  await expect(
    page.locator("[data-shared-toolbar]")
  ).not.toHaveAttribute(
    "data-a11y-shared-tooltip"
  );
});
