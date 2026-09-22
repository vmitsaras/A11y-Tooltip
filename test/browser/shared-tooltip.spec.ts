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

  await expect.poll(() =>
    tooltip.evaluate((element) =>
      element.getAnimations().length
    )
  ).toBe(1);

  const state = await tooltip.evaluate((element) => {
    const animations = element.getAnimations();
    const keyframes =
      animations[0]?.effect instanceof KeyframeEffect
        ? animations[0].effect.getKeyframes()
        : [];

    return {
      count: animations.length,
      duration:
        animations[0]?.effect?.getTiming().duration ??
        null,
      firstTransform:
        String(keyframes[0]?.transform ?? "")
    };
  });

  expect(state.count).toBe(1);
  expect(state.duration).toBe(600);
  expect(state.firstTransform).toContain(
    "translate"
  );

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

  await expect.poll(() =>
    tooltip.evaluate((element) =>
      element.getAnimations().length
    )
  ).toBe(1);

  await page.waitForTimeout(80);

  const middleRect = await tooltip.boundingBox();

  await triggers.nth(2).focus();

  await expect(tooltip).toHaveText("Command 3");

  await expect.poll(() =>
    tooltip.evaluate((element) =>
      element.getAnimations().length
    )
  ).toBe(1);

  const retargetRect = await tooltip.boundingBox();

  expect(middleRect).not.toBeNull();
  expect(retargetRect).not.toBeNull();

  await expect.poll(async () =>
    tooltip.evaluate((element) =>
      element.getAnimations().length
    )
  ).toBe(0);

  const finalRect = await tooltip.boundingBox();

  expect(finalRect).not.toBeNull();

  if (middleRect && retargetRect && finalRect) {
    const middleCenter =
      middleRect.x + middleRect.width / 2;
    const retargetCenter =
      retargetRect.x + retargetRect.width / 2;
    const finalCenter =
      finalRect.x + finalRect.width / 2;

    expect(
      Math.abs(retargetCenter - middleCenter)
    ).toBeLessThan(
      Math.abs(finalCenter - middleCenter)
    );
  }

  expect(
    await page.evaluate(() =>
      window.__sharedTooltip.activeTrigger?.dataset.triggerIndex
    )
  ).toBe("3");
});

test("scrolled docs demo moves across its row without page-sized travel", async ({
  page
}) => {
  await page.goto("/docs/");

  const toolbar = page.locator(
    "[data-demo-shared-motion-toolbar]"
  );
  const buttons = toolbar.locator("button");

  await expect(toolbar).toHaveClass(
    /is-shared-tooltip-initialized/u
  );
  await page.locator('[data-shared-motion="none"]').click();
  await page.locator('[data-shared-motion="move"]').click();

  await buttons.nth(0).focus();
  await buttons.nth(1).focus();

  const tooltip = page.locator(
    '[data-a11y-shared-tooltip-content]:not([hidden])'
  );

  await expect(tooltip).toHaveText("Archive");
  await expect.poll(() =>
    tooltip.evaluate((element) =>
      element.getAnimations().length
    )
  ).toBe(1);

  const travel = await tooltip.evaluate((element) => {
    const effect = element.getAnimations()[0]?.effect;
    const firstFrame = effect instanceof KeyframeEffect
      ? effect.getKeyframes()[0]
      : undefined;
    const transform = String(firstFrame?.transform ?? "");
    const matrix = new DOMMatrix(transform);

    return { x: matrix.m41, y: matrix.m42 };
  });

  expect(Math.abs(travel.x)).toBeGreaterThan(20);
  expect(Math.abs(travel.y)).toBeLessThan(5);
});

test("docs motion demo visibly travels between differently sized labels", async ({ page }) => {
  await page.goto("/docs/");
  await page.locator('[data-shared-motion="none"]').click();
  await page.locator('[data-shared-motion="move"]').click();
  const buttons = page.locator("[data-demo-shared-motion-toolbar] button");
  const tooltip = page.locator('[data-a11y-shared-tooltip-content]:not([hidden])');

  await buttons.nth(0).focus();
  const start = await tooltip.boundingBox();
  await buttons.nth(1).focus();
  await expect.poll(() => tooltip.evaluate((element) => element.getAnimations().length)).toBe(1);
  const early = await tooltip.boundingBox();
  await page.waitForTimeout(120);
  const middle = await tooltip.boundingBox();
  await expect.poll(() => tooltip.evaluate((element) => element.getAnimations().length)).toBe(0);
  const end = await tooltip.boundingBox();

  if (!start || !early || !middle || !end) throw new Error("Tooltip was not measurable");
  expect(Math.abs(start.width - end.width)).toBeLessThan(1);
  expect(Math.abs(early.width - end.width)).toBeLessThan(1);
  expect(Math.abs(middle.width - end.width)).toBeLessThan(1);
  expect(early.x).toBeLessThan(end.x - 10);
  expect(middle.x).toBeGreaterThan(early.x);
  expect(middle.x).toBeLessThan(end.x);
});

test("scrolled docs keeps the tooltip in place until retarget motion begins", async ({ page }) => {
  await page.goto("/docs/");
  await page.locator('[data-shared-motion="none"]').click();
  await page.locator('[data-shared-motion="move"]').click();

  const positions = await page.evaluate(async () => {
    const buttons = document.querySelectorAll<HTMLButtonElement>(
      "[data-demo-shared-motion-toolbar] button"
    );
    if (!buttons[0] || !buttons[1]) {
      throw new Error("Motion demo is missing");
    }

    buttons[0].focus();
    const tooltip = document.querySelector<HTMLElement>(
      "[data-a11y-shared-tooltip-content]:not([hidden])"
    );
    if (!tooltip) {
      throw new Error("Motion tooltip is missing");
    }
    const before = tooltip.getBoundingClientRect();
    buttons[1].focus();
    const immediate = tooltip.getBoundingClientRect();
    const nextFrame = await new Promise<DOMRect>((resolve) => {
      requestAnimationFrame(() => resolve(tooltip.getBoundingClientRect()));
    });

    return { before: before.x, immediate: immediate.x, nextFrame: nextFrame.x };
  });

  expect(Math.abs(positions.immediate - positions.before)).toBeLessThan(5);
  expect(Math.abs(positions.nextFrame - positions.before)).toBeLessThan(5);
});

test("scrolled docs retarget stays on screen after every paint", async ({ page }) => {
  await page.goto("/docs/");
  await page.locator('[data-shared-motion="none"]').click();
  await page.locator('[data-shared-motion="move"]').click();

  const samples = await page.evaluate(async () => {
    const buttons = document.querySelectorAll<HTMLButtonElement>(
      "[data-demo-shared-motion-toolbar] button"
    );
    const afterPaint = () => new Promise<void>((resolve) => {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    });
    buttons[0]!.focus();
    await afterPaint();
    await afterPaint();
    const tooltip = document.querySelector<HTMLElement>(
      "[data-a11y-shared-tooltip-content]:not([hidden])"
    )!;
    const origin = tooltip.getBoundingClientRect();
    const frames: { x: number; y: number; hidden: boolean }[] = [];
    // Include interruptions before the preceding animation finishes.
    for (const index of [1, 2, 3, 2, 1, 0]) {
      buttons[index]!.focus();
      for (let frame = 0; frame < 4; frame += 1) {
        await afterPaint();
        const rect = tooltip.getBoundingClientRect();
        frames.push({ x: rect.x, y: rect.y, hidden: Boolean(tooltip.hidden) });
      }
    }
    return { scrollY, origin: { x: origin.x, y: origin.y }, frames };
  });

  expect(samples.scrollY).toBeGreaterThan(500);
  for (const frame of samples.frames) {
    expect(frame.hidden).toBe(false);
    expect(Math.abs(frame.y - samples.origin.y)).toBeLessThan(1);
    expect(frame.x).toBeGreaterThanOrEqual(samples.origin.x - 1);
    expect(frame.x).toBeLessThan(samples.origin.x + 300);
  }
});

test("docs motion demo retains the shared tooltip across a brief pointer gap", async ({ page }) => {
  await page.goto("/docs/");
  await page.locator('[data-shared-motion="none"]').click();
  await page.locator('[data-shared-motion="move"]').click();

  const buttons = page.locator("[data-demo-shared-motion-toolbar] button");
  const tooltip = page.locator('[data-a11y-shared-tooltip-content]:not([hidden])');
  await page.evaluate(() => {
    const toolbar = document.querySelector<HTMLElement>("[data-demo-shared-motion-toolbar]");
    toolbar?.addEventListener(
      "a11y-tooltip-shared:close",
      () => { toolbar.dataset.closeCount = String(Number(toolbar.dataset.closeCount ?? 0) + 1); }
    );
  });

  await buttons.nth(0).hover();
  await expect(tooltip).toHaveText("Pin");
  await page.evaluate(() => {
    const first = document.querySelector("[data-demo-shared-motion-toolbar] button");
    first?.dispatchEvent(new PointerEvent("pointerout", { bubbles: true }));
  });
  await page.waitForTimeout(140);
  await expect(tooltip).toHaveText("Pin");
  await buttons.nth(1).hover();
  await expect(tooltip).toHaveText("Archive");
  await expect(page.locator("[data-demo-shared-motion-toolbar]")).not.toHaveAttribute("data-close-count");
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

  await expect.poll(() =>
    tooltip.evaluate((element) =>
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

  await expect.poll(() =>
    tooltip.evaluate((element) =>
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

  await expect.poll(() =>
    tooltip.evaluate((element) =>
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
