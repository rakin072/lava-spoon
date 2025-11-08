## Visual Rendering & Dynamic Color System

This document describes the advanced visual stack for Lava Legends.

### 1. Dynamic Color / Theme System
Implemented in `src/components/game/themeSystem.ts`.

Key features:
- HSL-based palette shifting across difficulty (warm → cool → danger).
- Stage + time inputs blend into a difficulty factor `t` producing a hue path.
- Ambient, collectible, glow, and particle colors generated on-the-fly.
- Heat zones: vertical position influences particle/glow brightness.

Usage:
```ts
const palette = computeDynamicPalette(stageId, elapsedMs);
camera.setBackgroundColor(palette.ambientHex);
```

### 2. Post-Processing Pipelines
Defined inline in `GameCanvas.tsx` (can be moved to separate files later):
- BloomPipeline: Amplifies highlight regions for HDR-like glow.
- ChromaticPipeline: Subtle horizontal RGB shift reacting to time for motion feel.

Applied via:
```ts
camera.setPostPipeline(['BloomPipeline', 'ChromaticPipeline']);
```

### 3. Pixel-Perfect Rendering
- Game canvas size uses multiples of 16 (800x608).
- Phaser config sets `pixelArt: true` and `roundPixels: true`.
- Global CSS sets `image-rendering: pixelated` on canvas and body.
- Sprites currently primitives; when replacing with textures ensure `setFilter(Phaser.Textures.FilterMode.NEAREST)` or rely on pixelArt flag.

### 4. Dithering Overlay
Generated tiny 2x2 texture tiled across the screen using MULTIPLY blend at low alpha (0.15) to give subtle retro shading pattern.

### 5. Particle & Object Color Logic
- Spawn logic queries dynamic palette each frame.
- Gems brighten base collectible color.
- Power-ups use glow color and pulsate.
- Particle burst color: base spawn color lightened by heat factor.

### 6. Extending the System
Suggestions:
- Add a dedicated WebGL pipeline for bloom threshold & blur passes (dual-pass Gaussian) for richer glow.
- Introduce palette presets per stage (e.g., Ice Cavern, Toxic Mines) hooking into difficulty gradient.
- Cache computed palettes per second to reduce GC pressure.

### 7. Performance Notes
- PostFX pipelines are lightweight single-pass shaders; cost scales with viewport size.
- Avoid excessive re-generation of textures in update loop.
- Compute palette once per update tick (already done) – consider throttling to 60Hz if uncapped.

### 8. Fallbacks
- If renderer is Canvas, pipelines are skipped; gameplay remains functional.
- Colors still applied by numeric fills.

### 9. Future Enhancements
- Chromatic aberration intensity could scale with player velocity or combo level.
- Heat map could incorporate horizontal gradients (e.g., volcanic vents at x zones).
- Add a vignette + scanline pass (fragment shader) for CRT simulation.

---
Maintainer: Visual system initial version.