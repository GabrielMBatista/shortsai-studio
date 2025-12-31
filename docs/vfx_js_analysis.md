# Analysis of VFX-JS Integration

## Overview
[VFX-JS](https://amagi.dev/vfx-js/) is a library for applying WebGL effects (Glitch, RGB Shift, Pixelate) to DOM elements. The user requested an analysis of its viability for ShortsAI.

## Technical Analysis

### How It Works
1.  Takes a DOM element (Img, Video, Div).
2.  Creates a WebGL Canvas overlay.
3.  Replaces the original element's rendering with a shader-based render loop.
4.  Updates automatically using internal animation loops.

### Challenges for Video Export (Headless/Server)
1.  **DOM Dependency**: VFX-JS is designed to mount on DOM elements. Our export pipeline runs in a "headless" context (using `OffscreenCanvas` or hidden generic `<canvas>`) where we control the rendering loop explicitly.
2.  **Loop Synchronization**:
    *   ShortsAI export requires **deterministic frame-by-frame rendering** (e.g., Frame 1 at 0.0s, Frame 2 at 0.033s).
    *   VFX-JS typically runs on `requestAnimationFrame` and internal clocks. Synchronizing its internal `time` uniform with our export timeline to ensure the "Glitch" looks the same in the exported video as it did in the preview is difficult.
3.  **Performance overhead**:
    *   Current: `Canvas 2D` (Draw) -> `VideoEncoder`.
    *   With VFX-JS: `Canvas 2D` (Source) -> `Texture Upload` -> `WebGL Draw` -> `ReadPixels`/`Transfer` -> `VideoEncoder`.
    *   This adds texture overhead for every frame.

### Comparison
| Feature | VFX-JS | Native Canvas Engine (Our Solution) |
| :--- | :--- | :--- |
| **Complexity** | High (WebGL, Context switching) | Low (Pure JS/Canvas API) |
| **Export Safe** | No (Hard to sync time) | Yes (100% Deterministic) |
| **Performance** | Medium (GPU overhead per frame) | High (Simple 2D ops) |
| **Effects** | Glitch, Pixelate, RGB Shift | Can replicate these in 2D |

## Recommendation
**Do not use VFX-JS directly.**
Instead, we should **replicate** the specific desired effects (Glitch, RGB Shift) using the **Native Canvas Effects Engine**. This ensures:
1.  The specific frame 100 will always look the same (no random sync issues).
2.  Zero external dependencies.
3.  Unified code for Preview and Export.

## Implementation Plan
I will proceed to add **RGB Shift** and **Glitch** effects to our `canvasEffects.ts` to prove we can achieve the same visual style without the library.
