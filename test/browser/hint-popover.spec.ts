import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/examples/hint-popover/");

  await expect(page.locator("html")).toHaveAttribute(
    "data-hint-bridge-active",
    "true"
  );
});

test("focus opens a native hint and keeps focus on the trigger", async ({
  page
}) => {
  const root = page.locator('[data-hint-root="first"]');
  const trigger = root.locator("[data-a11y-tooltip-trigger]");
  const tooltip = root.locator("[data-a11y-tooltip-content]");

  await trigger.focus();

  await expect(root).toHaveClass(/is-open/u);
  await expect(tooltip).toHaveAttribute("popover", "hint");
  await expect(tooltip).toHaveJSProperty("matches", expect.anything());

  expect(
    await tooltip.evaluate((element) =>
      element.matches(":popover-open")
    )
  ).toBe(true);

  await expect(trigger).toBeFocused();
});

test("core close removes the native popover from the top layer", async ({
  page
}) => {
  const root = page.locator('[data-hint-root="first"]');
  const trigger = root.locator("[data-a11y-tooltip-trigger]");
  const tooltip = root.locator("[data-a11y-tooltip-content]");

  await trigger.focus();

  await page.evaluate(() => {
    window.__hintTooltips.first.close("api");
  });

  await expect(root).not.toHaveClass(/is-open/u);

  expect(
    await tooltip.evaluate((element) =>
      element.matches(":popover-open")
    )
  ).toBe(false);
});

test("native light dismiss synchronizes back to core without immediate reopen", async ({
  page
}) => {
  const root = page.locator('[data-hint-root="first"]');
  const trigger = root.locator("[data-a11y-tooltip-trigger]");
  const tooltip = root.locator("[data-a11y-tooltip-content]");

  await trigger.focus();

  await expect(trigger).toBeFocused();

  await page.locator("[data-light-dismiss-target]").click();

  expect(
    await tooltip.evaluate((element) =>
      element.matches(":popover-open")
    )
  ).toBe(false);

  await expect(root).not.toHaveClass(/is-open/u);

  await page.evaluate(() => {
    document.querySelector(
      '[data-hint-root="first"] [data-a11y-tooltip-trigger]'
    )?.dispatchEvent(
      new MouseEvent("mouseenter", { bubbles: false })
    );
  });

  await expect(root).not.toHaveClass(/is-open/u);
});

test("opening another native hint closes the previous core instance", async ({
  page
}) => {
  const firstRoot = page.locator('[data-hint-root="first"]');
  const secondRoot = page.locator('[data-hint-root="second"]');
  const firstTrigger = firstRoot.locator("[data-a11y-tooltip-trigger]");
  const secondTrigger = secondRoot.locator("[data-a11y-tooltip-trigger]");

  await firstTrigger.hover();
  await expect(firstRoot).toHaveClass(/is-open/u);

  await secondTrigger.hover();

  await expect(secondRoot).toHaveClass(/is-open/u);
  await expect(firstRoot).not.toHaveClass(/is-open/u);
});

test("hint popover does not close its parent auto popover", async ({
  page
}) => {
  await page.getByRole("button", {
    name: "Open auto popover"
  }).click();

  const autoPopover = page.locator("#auto-panel");

  expect(
    await autoPopover.evaluate((element) =>
      element.matches(":popover-open")
    )
  ).toBe(true);

  const trigger = page.locator(
    '[data-hint-root="auto"] [data-a11y-tooltip-trigger]'
  );

  await trigger.hover();

  expect(
    await autoPopover.evaluate((element) =>
      element.matches(":popover-open")
    )
  ).toBe(true);

  expect(
    await page.locator(
      '[data-hint-root="auto"] [data-a11y-tooltip-content]'
    ).evaluate((element) =>
      element.matches(":popover-open")
    )
  ).toBe(true);
});

test("top-layer hint escapes an overflow-hidden ancestor", async ({
  page
}) => {
  const root = page.locator('[data-hint-root="clip"]');
  const trigger = root.locator("[data-a11y-tooltip-trigger]");
  const tooltip = root.locator("[data-a11y-tooltip-content]");
  const clipBox = page.locator("[data-clip-box]");

  await trigger.focus();

  const tooltipBox = await tooltip.boundingBox();
  const clipBoxBounds = await clipBox.boundingBox();

  expect(tooltipBox).not.toBeNull();
  expect(clipBoxBounds).not.toBeNull();

  if (!tooltipBox || !clipBoxBounds) {
    return;
  }

  expect(
    tooltipBox.y + tooltipBox.height
  ).toBeGreaterThan(
    clipBoxBounds.y + clipBoxBounds.height
  );

  const hit = await page.evaluate(
    ({ x, y }) => {
      const target = document.elementFromPoint(x, y);
      return Boolean(
        target?.closest("[data-a11y-tooltip-content]")
      );
    },
    {
      x: tooltipBox.x + tooltipBox.width / 2,
      y: tooltipBox.y + tooltipBox.height / 2
    }
  );

  expect(hit).toBe(true);
});

test("direct native opening cannot bypass core state", async ({
  page
}) => {
  const root = page.locator('[data-hint-root="first"]');
  const tooltip = root.locator("[data-a11y-tooltip-content]");

  const result = await tooltip.evaluate((element) => {
    try {
      element.showPopover();
      return element.matches(":popover-open");
    } catch {
      return false;
    }
  });

  expect(result).toBe(false);
  await expect(root).not.toHaveClass(/is-open/u);
});

test("destroy closes native state and restores authored markup", async ({
  page
}) => {
  const root = page.locator('[data-hint-root="first"]');
  const trigger = root.locator("[data-a11y-tooltip-trigger]");
  const tooltip = root.locator("[data-a11y-tooltip-content]");

  await trigger.focus();

  await page.evaluate(() => {
    window.__hintTooltips.first.destroy();
  });

  expect(
    await tooltip.evaluate((element) =>
      element.matches(":popover-open")
    )
  ).toBe(false);

  await expect(tooltip).not.toHaveAttribute("popover");
  await expect(root).not.toHaveAttribute(
    "data-a11y-tooltip-hint-popover"
  );

  expect(
    await trigger.evaluate((element) =>
      element.style.getPropertyValue("anchor-name")
    )
  ).toBe("");
});
