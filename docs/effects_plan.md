# Analysis of Video Effects Libraries for ShortsAI

## Objective
Enable advanced video effects (beyond pan/zoom) such as "Glitch", "VHS", "Film Grain", and color grading in both **Real-time Preview** and **Frame-by-Frame Export** (MP4 generation).

## Constraints & Requirements
1. **Unified Pipeline**: Must work identically in the Browser Preview (`<video>`/`<canvas>`) and the Headless Export (`Canvas` -> `VideoEncoder`).
2. **"Built-in" Feel**: Ready-to-use effects without needing to download external video assets (overlays).
3. **Ease of Use**: Simple API for applying effects.
4. **No External Assets**: Effects should be generated programmatically.

## Architecture Context
Current pipeline uses a **Canvas 2D** context (`drawFrame.ts`) where images and videos are drawn frame-by-frame. This is compatible with `Mp4Muxer` and `VideoEncoder`.

## Library Analysis

### 1. VFX-JS
*   **Pros**: Excellent for easy WebGL effects (glitch, rgb shift) on DOM elements.
*   **Cons**: Designed for DOM manipulation (`<div>`, `<img>`). Integrating it into a headless frame-by-frame `Canvas` export loop is difficult because it expects a DOM rendering context. It doesn't natively output to a lightweight `Canvas2D` source for the `VideoEncoder`.
*   **Verdict**: **Not recommended** for the export pipeline.

### 2. Seriously.js
*   **Pros**: Node-based compositor specifically for WebGL. Has built-in effects (`film-grain`, `vignette`, `pixelate`, `tv-glitch`).
*   **Cons**: Library is older and effectively unmaintained.
*   **Verdict**: Powerful, but risky due to age.

### 3. Native Canvas 2D Effects (Custom Implementation)
*   **Pros**:
    *   **Zero Dependencies**: No extra bundle size.
    *   **Perfect Compatibility**: Works exactly the same in Preview and Export.
    *   **Full Control**: We write the logic for "Grain", "Vignette", "Scanlines" once.
*   **Cons**: We have to write the math for the effects (but many are simple).
*   **Feasibility**:
    *   *Vignette*: Radial Gradient (Easy).
    *   *Film Grain*: Random noise pattern (Easy).
    *   *VHS Scanlines*: Drawing lines (Easy).
    *   *Color Grading*: `globalCompositeOperation` (Easy).
    *   *Shake/Earthquake*: Random X/Y offset (Easy).
*   **Verdict**: **Highly Recommended**. It meets the "Built-in" requirement by creating a library of *internal* effects.

## Proposed Solution: "Native Effects Engine"
Instead of a 3rd party library, we build a lightweight **Effects Module** inside `shortsai-studio`.

### Planned Effects (No external assets required)
1.  **Cinematic Vignette**: Darkens corners to focus attention.
2.  **Film Grain**: Adds texture/noise for a filmic look.
3.  **VHS/CRT Lines**: Horizontal scanlines overlay.
4.  **Flash/Strobe**: High impact transitions.
5.  **Camera Shake**: Random jitter for "intense" moments.
6.  **Duotone/Filters**: Color overlays using blending modes (`multiply`, `screen`, `overlay`).

### Implementation Strategy
1.  Create `src/utils/video-effects/canvasEffects.ts`.
2.  Implement functions like `applyVignette(ctx, w, h, strength)`, `applyGrain(ctx, w, h, intensity)`.
3.  Call these functions in `drawFrame.ts` based on Scene configuration.
4.  Add UI controls in `VideoPlayer.tsx` / `SceneCard.tsx` to toggle these effects.

This approach gives the user the "Built-in" experience (checkboxes/sliders in UI) without the complexity of WebGL context management in the 2D export loop.
