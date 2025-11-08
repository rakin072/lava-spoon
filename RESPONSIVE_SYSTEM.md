## Responsive & Adaptive Layout System

This project implements an advanced responsive architecture for the game shell and HUD.

### Adaptive Resolution System
- Hook: `src/hooks/useAdaptiveViewport.ts`
- Detects device class (mobile/tablet/desktop), DPR, and orientation.
- Provides a pixel-perfect integer `zoom` and base playfield size (800x608).
- Phaser Scale Manager uses `FIT` mode with `CENTER_BOTH` and camera zoom from the hook.

### Safe Zones (Mobile)
- Uses CSS `env(safe-area-inset-*)` with fallbacks and extra padding for:
  - Top notch/island (44px target)
  - Bottom home indicator (34px) and control zone (88px)
- Apply via classes on the shell: `.p-safe-shell`, `.safe-top-offset`, `.control-zone`.

### Container Queries
- `.game-shell` is a named container. CSS adjusts UI density based on container width.
- See `src/index.css` `@container gameShell ...` blocks for button sizing and borders.

### Orientation Prompt
- Component: `src/components/game/OrientationPrompt.tsx`
- Shows a simple overlay encouraging landscape when on mobile portrait.

### Foldable Support (Initial)
- CSS safe areas are used; hinge-specific segment queries are not widely supported yet.
- Future: add `@media (spanning: single-fold-vertical)` to reposition HUD from hinge.

### Dynamic Font Scaling
- Global body font-size uses `clamp(12px, 2vw, 24px)` for fluid typography.

### Notes
- Pixel art remains crisp via `pixelArt: true`, `roundPixels: true`, and CSS image-rendering.
- If you introduce texture sprites, ensure nearest-neighbor is respected (default with pixelArt).
