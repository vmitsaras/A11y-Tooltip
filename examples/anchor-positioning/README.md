# Anchor positioning addon example

Build the package first:

```bash
npm run build:dist
```

Then serve the repository root and open `examples/anchor-positioning/`.

The example places tooltip triggers close to different edges. With CSS Anchor
Positioning support, `createAnchorPositioningAddon()` associates each tooltip
with its trigger and supplies placement-aware `position-try-fallbacks`.

Browsers without the required Anchor Positioning features keep the package's
existing absolute-position CSS fallback.

The addon does not change focus, keyboard behavior, ARIA, or DOM ownership.
