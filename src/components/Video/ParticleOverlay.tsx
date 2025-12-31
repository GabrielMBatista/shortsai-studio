import React, { useRef, useEffect } from 'react';

interface ParticleOverlayProps {
    particleName: string; // ex: 'particles-dust'
    show: boolean;
}

export const ParticleOverlay: React.FC<ParticleOverlayProps> = ({ particleName, show }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (show) {
            video.play().catch(() => { });
        } else {
            video.pause();
            video.currentTime = 0;
        }
    }, [show]);

    if (!particleName) return null;

    const particleUrl = `/cinematic-assets/overlays/${particleName}.mp4`;

    return (
        <video
            ref={videoRef}
            src={particleUrl}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none z-15"
            style={{
                mixBlendMode: 'screen', // Para vídeos com fundo preto
                opacity: 0.7
            }}
            loop
            muted
            playsInline
            crossOrigin="anonymous"
        />
    );
};
