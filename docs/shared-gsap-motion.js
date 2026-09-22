/** Optional application integration; GSAP is supplied by the consuming page. */
export function attachSharedGsapMotion(controller, gsap, Flip, events) {
  const { tooltip, container } = controller;
  const view = tooltip.ownerDocument.defaultView;
  const reducedMotion = view.matchMedia("(prefers-reduced-motion: reduce)");
  let candidate = null;
  let pending = null;
  let frame = null;
  let restoreHold = null;

  const releaseHold = () => {
    restoreHold?.();
    restoreHold = null;
  };

  const cancel = () => {
    if (frame !== null) view.cancelAnimationFrame(frame);
    frame = null;
    pending = null;
    candidate = null;
    releaseHold();
    // Complete after capturing the rendered state: this restores Flip's inline
    // transforms and dimensions before measuring another destination/reopening.
    Flip.killFlipsOf(tooltip, true);
  };

  const beforeRetarget = (event) => {
    if (event.detail?.controller !== controller) return;
    if (reducedMotion.matches) {
      cancel();
      return;
    }
    // A second retarget may arrive before the first held frame has painted.
    // Reuse its visual origin instead of sampling stale anchor coordinates.
    candidate = pending ?? {
      state: Flip.getState(tooltip, { simple: true, kill: false }),
      rect: tooltip.getBoundingClientRect()
    };
  };

  const retarget = (event) => {
    if (event.detail?.controller !== controller || !candidate) return;
    const origin = candidate;
    cancel();
    pending = origin;
    const value = tooltip.style.getPropertyValue("translate");
    const priority = tooltip.style.getPropertyPriority("translate");
    const restore = () => {
      if (value) tooltip.style.setProperty("translate", value, priority);
      else tooltip.style.removeProperty("translate");
    };
    const hold = () => {
      releaseHold();
      const rect = tooltip.getBoundingClientRect();
      const style = view.getComputedStyle(tooltip);
      const anchor = style.getPropertyValue("position-anchor");
      const layout = style.position === "fixed" && tooltip.offsetParent === null &&
        anchor && anchor !== "auto" && (style.translate === "none" || !style.translate);
      const x = origin.rect.left - (layout ? tooltip.offsetLeft : rect.left);
      const y = origin.rect.top - (layout ? tooltip.offsetTop : rect.top);
      tooltip.style.setProperty("translate", `${x}px ${y}px`);
      restoreHold = restore;
    };

    // CSS anchor scroll adjustment settles after layout/paint. Keep the same
    // node visible at its origin while waiting, then let Flip measure the end.
    hold();
    frame = view.requestAnimationFrame(() => {
      hold();
      frame = view.requestAnimationFrame(() => {
        frame = null;
        pending = null;
        releaseHold();
        if (!controller.isOpen || !tooltip.isConnected || reducedMotion.matches) return;
        Flip.from(origin.state, {
          targets: tooltip,
          duration: 0.22,
          ease: "power2.out",
          simple: true,
          scale: false
        });
      });
    });
  };

  const close = (event) => {
    if (event.detail?.controller === controller) cancel();
  };
  const preferenceChanged = () => {
    if (reducedMotion.matches) cancel();
  };
  const destroy = (event) => {
    if (event.detail?.controller === controller) detach();
  };
  function detach() {
    cancel();
    container.removeEventListener(events.beforeRetarget, beforeRetarget);
    container.removeEventListener(events.retarget, retarget);
    container.removeEventListener(events.close, close);
    container.removeEventListener(events.destroy, destroy);
    reducedMotion.removeEventListener("change", preferenceChanged);
  }
  container.addEventListener(events.beforeRetarget, beforeRetarget);
  container.addEventListener(events.retarget, retarget);
  container.addEventListener(events.close, close);
  container.addEventListener(events.destroy, destroy);
  reducedMotion.addEventListener("change", preferenceChanged);
  return detach;
}
