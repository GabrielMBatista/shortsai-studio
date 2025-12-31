
// Basic types for effect configuration
export interface EffectConfig {
    vignette?: { strength: number }; // 0 to 1
    grain?: { intensity: number }; // 0 to 100
    scanlines?: { intensity: number, spacing: number };
    shake?: { intensity: number };
    sepia?: { intensity: number };
    chromaticAberration?: { offset: number }; // In pixels
    glitch?: { intensity: number, seed: number }; // New: Glitch effect
    flash?: { intensity: number }; // Simplified flash (handled outside usually, but can be configured here)
}

/**
 * Applies a cinematic vignette (dark corners)
 */
export const applyVignette = (ctx: CanvasRenderingContext2D, width: number, height: number, strength: number = 0.5) => {
    if (strength <= 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    // Create radial gradient
    // Center (transparent) -> Outer (Black opacity based on strength)
    const radius = Math.max(width, height) * 0.8;
    const gradient = ctx.createRadialGradient(
        width / 2, height / 2, radius * 0.4, // Inner circle (start fading)
        width / 2, height / 2, radius        // Outer circle
    );

    // Adjust opacity slope
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.5, `rgba(0,0,0,${strength * 0.3})`);
    gradient.addColorStop(1, `rgba(0,0,0,${strength * 0.9})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
};

/**
 * Applies procedural film grain/noise
 * Note: Generating noise per frame is expensive. 
 * Optimization: Pre-generate a noise pattern or use a small repeating tile.
 * For now, simple random fill which is heavy but effective for testing.
 */
let cachedNoisePattern: CanvasPattern | null = null;
let cachedNoiseCanvas: HTMLCanvasElement | null = null;

const getNoisePattern = (ctx: CanvasRenderingContext2D) => {
    if (cachedNoisePattern) return cachedNoisePattern;

    const noiseSize = 256;
    const canvas = document.createElement('canvas');
    canvas.width = noiseSize;
    canvas.height = noiseSize;
    const nCtx = canvas.getContext('2d');
    if (!nCtx) return null;

    const imgData = nCtx.createImageData(noiseSize, noiseSize);
    const buffer = new Uint32Array(imgData.data.buffer);

    for (let i = 0; i < buffer.length; i++) {
        // Random grey value with varying alpha
        const val = Math.random() * 255;
        // ABGR order for little-endian
        // Alpha is random to create density
        const alpha = Math.floor(Math.random() * 100);
        buffer[i] = (alpha << 24) | (val << 16) | (val << 8) | val;
    }

    nCtx.putImageData(imgData, 0, 0);
    cachedNoiseCanvas = canvas;
    cachedNoisePattern = ctx.createPattern(canvas, 'repeat');

    return cachedNoisePattern;
};

export const applyGrain = (ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number = 20) => {
    if (intensity <= 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'overlay'; // Blend mode essential for grain
    ctx.globalAlpha = intensity / 100;

    // Jitter the pattern origin for animation effect
    const offsetX = Math.random() * 256;
    const offsetY = Math.random() * 256;

    const pattern = getNoisePattern(ctx);
    if (pattern) {
        ctx.fillStyle = pattern;
        ctx.translate(offsetX, offsetY);
        ctx.fillRect(-offsetX, -offsetY, width + 256, height + 256);
    }

    ctx.restore();
};

/**
 * Applies retro TV scanlines
 */
export const applyScanlines = (ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number = 0.2, spacing: number = 4) => {
    if (intensity <= 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(0,0,0,${intensity})`;

    for (let y = 0; y < height; y += spacing) {
        ctx.fillRect(0, y, width, 1); // 1px line
    }
    ctx.restore();
};

/**
 * Simulates camera shake
 * NOTE: This must be applied BEFORE drawing the main content ideally, 
 * or by shifting the entire canvas context.
 * Returns the offset {x, y} to apply to the context translation.
 */
export const getShakeOffset = (intensity: number = 0) => {
    if (intensity <= 0) return { x: 0, y: 0 };
    const x = (Math.random() - 0.5) * intensity * 20; // +/- pixels
    const y = (Math.random() - 0.5) * intensity * 20;
    return { x, y };
};

export const applyShake = (ctx: CanvasRenderingContext2D, intensity: number) => {
    const { x, y } = getShakeOffset(intensity);
    ctx.translate(x, y);
};

/**
 * Flash effect (e.g. for beats)
 * 'progress' should be 0 to 1, where 1 is full white
 */
export const applyFlash = (ctx: CanvasRenderingContext2D, width: number, height: number, opacity: number) => {
    if (opacity <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(255,255,255,${opacity})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
};

/**
 * Applies RGB Shift (Chromatic Aberration)
 * Draws the canvas 3 times with offset channels.
 * Note: This is an expensive operation as it requires reading/drawing the canvas itself.
 * For optimization, we only do this if strictly requested.
 * 
 * Strategy:
 * 1. Draw Red channel slightly left.
 * 2. Draw Blue channel slightly right.
 * 3. Draw Green channel center.
 * 
 * This requires the content to already be on the canvas.
 * It is best applied as a post-processing step on the layer.
 */
export const applyRGBShift = (ctx: CanvasRenderingContext2D, width: number, height: number, offset: number) => {
    if (offset <= 0) return;

    // We can't easily read back the canvas content and separate channels in 2D without `getImageData` (slow).
    // Alternative: Using `globalCompositeOperation` with multiple passes of the SOURCE IMAGE if we had it.
    // BUT we are in a composed context.

    // Fake/Cheap RGB Shift:
    // Just simple color overlays? No, that looks bad.
    // The proper way in 2D is:
    // 1. Save canvas to image/pattern.
    // 2. Clear.
    // 3. Draw Red (multiply/screen) at -offset.
    // 4. Draw Blue at +offset.
    // 5. Draw Green at 0.

    // Efficient Hack:
    // We assume this function is called immediately after drawing the video/image frame, 
    // but BEFORE overlays.
    // Actually, to support this properly in the render loop, we should invoke it *instead* of standard drawImage.
    // For now, let's leave it as a placeholder or use a very lightweight 'edge color' hack if possible.
};

/**
 * Simple Glitch Effect (Slice offsets + RGB Shift)
 */
export const applyGlitch = (ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number, seed: number) => {
    if (intensity <= 0) return;

    // Random slices
    const numSlices = Math.floor(intensity * 10);
    const maxOffset = intensity * 50;

    for (let i = 0; i < numSlices; i++) {
        const sliceY = Math.random() * height;
        const sliceH = Math.random() * (height / 10);
        const offsetX = (Math.random() - 0.5) * maxOffset;

        try {
            // Draw a slice of the *existing* canvas content onto itself
            // Note: This copies what's already there (so apply this AFTER main content, BEFORE UI)
            ctx.drawImage(
                ctx.canvas,
                0, sliceY, width, sliceH,
                offsetX, sliceY, width, sliceH
            );
        } catch (e) {
            // Context might be OffscreenCanvas or similar where drawing itself is tricky locally?
            // Usually standard Canvas allows drawing itself.
        }
    }
};
