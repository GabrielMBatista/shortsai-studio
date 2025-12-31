import React, { useMemo } from 'react';
import { EffectConfig } from '../../utils/video-effects/canvasEffects';

interface VideoEffectsOverlayProps {
    config?: EffectConfig;
    isPlaying: boolean;
}

export const VideoEffectsOverlay: React.FC<VideoEffectsOverlayProps> = ({ config, isPlaying }) => {
    if (!config) return null;

    const { vignette, grain, scanlines, sepia, shake, flash, glitch } = config;

    // --- Dynamic Styles for Keyframe Animations ---
    // We inject style tag for dynamic keyframes if needed, or use inline styles with standard classes
    // unique IDs for animations to avoid conflicts
    const shakeAnimName = `shake-${shake?.intensity || 0}`;
    const flashAnimName = `flash-${flash?.intensity || 0}`;

    return (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-2xl">
            {/* 1. SEPIA (Applied via backdrop-filter or mix-blend-mode wrapper) */}
            {/* Note: backdrop-filter acts on what's BEHIND. */}
            {sepia && (
                <div
                    className="absolute inset-0 z-10 block"
                    style={{
                        backgroundColor: `rgba(162, 118, 76, ${sepia.intensity * 0.4})`,
                        mixBlendMode: 'color'
                        // backdropFilter: `sepia(${sepia.intensity * 100}%)` // backdrop-filter isn't widely supported in all contexts perfectly
                    }}
                />
            )}

            {/* 2. GRAIN (Noise Overlay) */}
            {grain && (
                <div
                    className="absolute inset-0 z-20 opacity-0 mix-blend-mode-overlay animate-grain"
                    style={{
                        opacity: grain.intensity / 100,
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E\")",
                        // Simple animation simulation handled by CSS 'animate-grain' if available, else static
                    }}
                />
            )}

            {/* 3. SCANLINES */}
            {scanlines && (
                <div
                    className="absolute inset-0 z-30 pointer-events-none"
                    style={{
                        background: `linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,${scanlines.intensity}) 50%)`,
                        backgroundSize: `100% ${scanlines.spacing * 2}px`
                    }}
                />
            )}

            {/* 4. VIGNETTE */}
            {vignette && (
                <div
                    className="absolute inset-0 z-40 pointer-events-none"
                    style={{
                        background: `radial-gradient(circle, transparent 50%, rgba(0,0,0,${vignette.strength}) 100%)`
                    }}
                />
            )}

            {/* 5. FLASH (Strobe) */}
            {flash && isPlaying && (
                <div
                    className="absolute inset-0 z-50 bg-white mix-blend-screen animate-pulse-fast"
                    style={{
                        opacity: flash.intensity || 0.1,
                        animationDuration: '0.1s'
                    }}
                />
            )}

            {/* 6. GLITCH (Simplified CSS Glitch) */}
            {glitch && isPlaying && (
                <div className="absolute inset-0 z-50 mix-blend-hard-light opacity-50 animate-glitch-lines"
                    style={{
                        // This is a placeholder for a complex glitch. 
                        // Real glitch requires duplicating the video which we can't do easily here.
                        // We use a color shift overlay instead.
                        background: 'linear-gradient(90deg, rgba(255,0,0,0.2), rgba(0,255,0,0.2), rgba(0,0,255,0.2))',
                        backgroundSize: '200% 200%',
                    }}
                />
            )}

            {/* STYLE INJECTION for Keyframes */}
            <style>{`
                @keyframes grain {
                    0%, 100% { transform: translate(0, 0); }
                    10% { transform: translate(-5%, -5%); }
                    20% { transform: translate(-10%, 5%); }
                    30% { transform: translate(5%, -10%); }
                    40% { transform: translate(-5%, 15%); }
                    50% { transform: translate(-10%, 5%); }
                    60% { transform: translate(15%, 0); }
                    70% { transform: translate(0, 10%); }
                    80% { transform: translate(-15%, 0); }
                    90% { transform: translate(10%, 5%); }
                }
                .animate-grain {
                    animation: grain 8s steps(10) infinite;
                }
                .animate-pulse-fast {
                    animation: pulse 0.1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0; }
                    50% { opacity: 1; }
                }
            `}</style>
        </div>
    );
};
