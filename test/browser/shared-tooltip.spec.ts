import { expect, test } from "@playwright/test";

interface SharedTooltipTestController {
  readonly activeTrigger: HTMLElement | null;
  readonly isOpen: boolean;
  readonly semantics: "visual-only" | "describedby";
  readonly motion: "none" | "move";
  readonly usesNativeHint: boolean;
  refresh(): boolean;
  destroy(): void;
}

declare global {
  interface Window {
    __sharedTooltip: SharedTooltipTestController;
    __sharedHintSources: Array<string | null>;
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

test("experimental describedby mode exposes only the active shared description", async ({
  page
}) => {
  await page.goto(
    "/examples/shared-tooltip/?count=3&semantics=describedby"
  );

  const triggers = page.locator("[data-tooltip-text]");
  const first = triggers.nth(0);
  const second = triggers.nth(1);
  const tooltip = page.locator(
    "[data-a11y-shared-tooltip-content]"
  );

  await page.evaluate(() => {
    const description = document.createElement("span");
    description.id = "existing-help";
    description.hidden = true;
    description.textContent = "Existing description";
    document.body.append(description);

    document
      .querySelector("[data-tooltip-text]")
      ?.setAttribute(
        "aria-describedby",
        "existing-help"
      );
  });

  await first.focus();

  const tooltipId = await tooltip.getAttribute("id");

  expect(tooltipId).toBeTruthy();

  await expect(first).toHaveAttribute(
    "aria-describedby",
    `existing-help ${tooltipId}`
  );

  await expect(first).toHaveAccessibleDescription(
    "Existing description Command 1"
  );

  await second.focus();

  await expect(first).toHaveAttribute(
    "aria-describedby",
    "existing-help"
  );

  await expect(second).toHaveAttribute(
    "aria-describedby",
    tooltipId ?? ""
  );

  await expect(second).toHaveAccessibleDescription(
    "Command 2"
  );

  await page.keyboard.press("Escape");

  await expect(second).not.toHaveAttribute(
    "aria-describedby"
  );
  await expect(tooltip).toBeHidden();
});

test("experimental native hint mode enters the top layer", async ({
  page
}) => {
  await page.goto(
    "/examples/shared-tooltip/?count=3&render=hint"
  );

  const toolbar = page.locator(
    "[data-shared-toolbar]"
  );
  const first = page.locator(
    "[data-tooltip-text]"
  ).nth(0);
  const tooltip = page.locator(
    "[data-a11y-shared-tooltip-content]"
  );

  await expect(toolbar).toHaveAttribute(
    "data-native-hint",
    "true"
  );

  await first.focus();

  await expect(tooltip).toHaveAttribute(
    "popover",
    "hint"
  );

  expect(
    await tooltip.evaluate((element) =>
      element.matches(":popover-open")
    )
  ).toBe(true);

  expect(
    await page.evaluate(() =>
      window.__sharedTooltip.usesNativeHint
    )
  ).toBe(true);
});

test("native hint retargeting updates the popover source without closing controller state", async ({
  page
}) => {
  await page.goto(
    "/examples/shared-tooltip/?count=3&render=hint"
  );

  await page.evaluate(() => {
    const tooltip = document.querySelector(
      "[data-a11y-shared-tooltip-content]"
    );

    window.__sharedHintSources = [];

    tooltip?.addEventListener("beforetoggle", (event) => {
      const toggleEvent = event as ToggleEvent & {
        source?: Element | null;
      };

      if (toggleEvent.newState !== "open") {
        return;
      }

      const source =
        toggleEvent.source instanceof HTMLElement
          ? toggleEvent.source.dataset.triggerIndex ?? null
          : null;

      window.__sharedHintSources.push(source);
    });
  });

  const triggers = page.locator("[data-tooltip-text]");
  const tooltip = page.locator(
    "[data-a11y-shared-tooltip-content]"
  );

  await triggers.nth(0).focus();
  await triggers.nth(1).focus();

  await expect.poll(async () =>
    page.evaluate(() =>
      window.__sharedHintSources.at(-1)
    )
  ).toBe("2");

  expect(
    await tooltip.evaluate((element) =>
      element.matches(":popover-open")
    )
  ).toBe(true);

  expect(
    await page.evaluate(() =>
      window.__sharedTooltip.isOpen
    )
  ).toBe(true);
});

test("native platform close synchronizes controller and describedby ownership", async ({
  page
}) => {
  await page.goto(
    "/examples/shared-tooltip/?count=3&render=hint&semantics=describedby"
  );

  const first = page.locator(
    "[data-tooltip-text]"
  ).nth(0);
  const tooltip = page.locator(
    "[data-a11y-shared-tooltip-content]"
  );

  await first.focus();

  await expect(first).toHaveAttribute(
    "aria-describedby",
    /a11y-tooltip-shared-/u
  );

  await tooltip.evaluate((element) => {
    if (element instanceof HTMLElement) {
      element.hidePopover();
    }
  });

  await expect.poll(async () =>
    page.evaluate(() =>
      window.__sharedTooltip.isOpen
    )
  ).toBe(false);

  await expect(first).not.toHaveAttribute(
    "aria-describedby"
  );

  expect(
    await tooltip.evaluate((element) =>
      element.matches(":popover-open")
    )
  ).toBe(false);
});

test("shared hint does not close an unrelated auto popover", async ({
  page
}) => {
  await page.goto(
    "/examples/shared-tooltip/?count=3&render=hint"
  );

  await page.evaluate(() => {
    const auto = document.createElement("div");
    auto.id = "shared-auto-popover";
    auto.setAttribute("popover", "auto");
    auto.textContent = "Auto popover";
    document.body.append(auto);
    auto.showPopover();
  });

  const auto = page.locator(
    "#shared-auto-popover"
  );
  const first = page.locator(
    "[data-tooltip-text]"
  ).nth(0);

  expect(
    await auto.evaluate((element) =>
      element.matches(":popover-open")
    )
  ).toBe(true);

  await first.focus();

  expect(
    await auto.evaluate((element) =>
      element.matches(":popover-open")
    )
  ).toBe(true);
});

test("direct native shared opening cannot bypass controller state", async ({
  page
}) => {
  await page.goto(
    "/examples/shared-tooltip/?count=3&render=hint"
  );

  const tooltip = page.locator(
    "[data-a11y-shared-tooltip-content]"
  );

  const shown = await tooltip.evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    try {
      element.hidden = false;
      element.showPopover();
      return element.matches(":popover-open");
    } catch {
      return false;
    }
  });

  expect(shown).toBe(false);

  expect(
    await page.evaluate(() =>
      window.__sharedTooltip.isOpen
    )
  ).toBe(false);
});

test("WAAPI move motion animates one shared tooltip between triggers", async ({
  page
}) => {
  await page.goto(
    "/examples/shared-tooltip/?count=3&motion=move&motionDuration=600"
  );

  const triggers = page.locator("[data-tooltip-text]");
  const tooltip = page.locator(
    "[data-a11y-shared-tooltip-content]"
  );

  await triggers.nth(0).focus();
  await triggers.nth(1).focus();

  await expect(tooltip).toHaveText("Command 2");

  const state = await tooltip.evaluate((element) => {
    const animations = element.getAnimations();

    return {
      count: animations.length,
      duration:
        animations[0]?.effect?.getTiming().duration ??
        null
    };
  });

  expect(state.count).toBe(1);
  expect(state.duration).toBe(600);

  expect(
    await page.evaluate(() =>
      window.__sharedTooltip.motion
    )
  ).toBe("move");

  await expect.poll(async () =>
    tooltip.evaluate((element) =>
      element.getAnimations().length
    )
  ).toBe(0);
});

test("rapid WAAPI retargeting replaces motion instead of queueing it", async ({
  page
}) => {
  await page.goto(
    "/examples/shared-tooltip/?count=5&motion=move&motionDuration=700"
  );

  const triggers = page.locator("[data-tooltip-text]");
  const tooltip = page.locator(
    "[data-a11y-shared-tooltip-content]"
  );

  await triggers.nth(0).focus();
  await triggers.nth(1).focus();

  await page.waitForTimeout(80);

  const middleRect = await tooltip.boundingBox();

  await triggers.nth(2).focus();

  await expect(tooltip).toHaveText("Command 3");

  expect(
    await tooltip.evaluate((element) =>
      element.getAnimations().length
    )
  ).toBe(1);

  const retargetRect = await tooltip.boundingBox();

  expect(middleRect).not.toBeNull();
  expect(retargetRect).not.toBeNull();

  if (middleRect && retargetRect) {
    const middleCenter =
      middleRect.x + middleRect.width / 2;
    const retargetCenter =
      retargetRect.x + retargetRect.width / 2;

    expect(
      Math.abs(retargetCenter - middleCenter)
    ).toBeLessThan(40);
  }

  await expect.poll(async () =>
    tooltip.evaluate((element) =>
      element.getAnimations().length
    )
  ).toBe(0);

  expect(
    await page.evaluate(() =>
      window.__sharedTooltip.activeTrigger?.dataset.triggerIndex
    )
  ).toBe("3");
});

test("prefers-reduced-motion disables shared retarget travel", async ({
  page
}) => {
  await page.emulateMedia({
    reducedMotion: "reduce"
  });

  await page.goto(
    "/examples/shared-tooltip/?count=3&motion=move&motionDuration=600"
  );

  const triggers = page.locator("[data-tooltip-text]");
  const tooltip = page.locator(
    "[data-a11y-shared-tooltip-content]"
  );

  await triggers.nth(0).focus();
  await triggers.nth(1).focus();

  await expect(tooltip).toHaveText("Command 2");

  expect(
    await tooltip.evaluate((element) =>
      element.getAnimations().length
    )
  ).toBe(0);
});

test("motion does not delay describedby ownership updates", async ({
  page
}) => {
  await page.goto(
    "/examples/shared-tooltip/?count=3&motion=move&motionDuration=600&semantics=describedby"
  );

  const triggers = page.locator("[data-tooltip-text]");
  const first = triggers.nth(0);
  const second = triggers.nth(1);
  const tooltip = page.locator(
    "[data-a11y-shared-tooltip-content]"
  );

  await first.focus();

  const tooltipId = await tooltip.getAttribute("id");

  expect(tooltipId).toBeTruthy();

  await second.focus();

  await expect(first).not.toHaveAttribute(
    "aria-describedby"
  );
  await expect(second).toHaveAttribute(
    "aria-describedby",
    tooltipId ?? ""
  );
  await expect(second).toHaveAccessibleDescription(
    "Command 2"
  );

  expect(
    await tooltip.evaluate((element) =>
      element.getAnimations().length
    )
  ).toBe(1);
});

test("WAAPI move motion works with native hint top-layer retargeting", async ({
  page
}) => {
  await page.goto(
    "/examples/shared-tooltip/?count=3&motion=move&motionDuration=600&render=hint"
  );

  const triggers = page.locator("[data-tooltip-text]");
  const tooltip = page.locator(
    "[data-a11y-shared-tooltip-content]"
  );

  await triggers.nth(0).focus();
  await triggers.nth(1).focus();

  expect(
    await tooltip.evaluate((element) =>
      element.matches(":popover-open")
    )
  ).toBe(true);

  expect(
    await tooltip.evaluate((element) =>
      element.getAnimations().length
    )
  ).toBe(1);

  expect(
    await page.evaluate(() =>
      window.__sharedTooltip.isOpen
    )
  ).toBe(true);
});

test("closing during shared motion cancels the active animation", async ({
  page
}) => {
  await page.goto(
    "/examples/shared-tooltip/?count=3&motion=move&motionDuration=900"
  );

  const triggers = page.locator("[data-tooltip-text]");
  const tooltip = page.locator(
    "[data-a11y-shared-tooltip-content]"
  );

  await triggers.nth(0).focus();
  await triggers.nth(1).focus();

  expect(
    await tooltip.evaluate((element) =>
      element.getAnimations().length
    )
  ).toBe(1);

  await page.keyboard.press("Escape");

  await expect(tooltip).toBeHidden();

  expect(
    await tooltip.evaluate((element) =>
      element.getAnimations().length
    )
  ).toBe(0);
});

