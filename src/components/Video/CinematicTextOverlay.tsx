import React, { useEffect, useState } from 'react';

interface CinematicTextOverlayProps {
    text: string;
    style: {
        font?: string;
        color?: string;
        position?: 'top' | 'center' | 'bottom';
        size?: 'small' | 'medium' | 'large';
    };
    currentTime: number;
    duration?: number;
}

export const CinematicTextOverlay: React.FC<CinematicTextOverlayProps> = ({
    text,
    style,
    currentTime,
    duration = 3 // Mostrar apenas nos primeiros 3 segundos
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Mostrar apenas nos primeiros 3 segundos da cena
        setIsVisible(currentTime > 0 && currentTime < duration);
    }, [currentTime, duration]);

    if (!text || !isVisible) return null;

    const {
        font = 'bebas-neue',
        color = '#FFD700',
        position = 'center',
        size = 'large'
    } = style;

    // Mapeamento de posições
    const positionClasses = {
        top: 'top-12 sm:top-16',
        center: 'top-1/2 -translate-y-1/2',
        bottom: 'bottom-12 sm:bottom-16'
    };

    // Mapeamento de tamanhos
    const sizeClasses = {
        small: 'text-2xl sm:text-3xl',
        medium: 'text-3xl sm:text-4xl',
        large: 'text-4xl sm:text-5xl md:text-6xl'
    };

    // Mapeamento de fontes
    const fontFamilies: Record<string, string> = {
        'bebas-neue': "'Bebas Neue', sans-serif",
        'anton': "'Anton', sans-serif",
        'bangers': "'Bangers', cursive",
        'righteous': "'Righteous', cursive"
    };

    return (
        <>
            {/* Google Fonts Loader */}
            {font && (
                <link
                    href={`https://fonts.googleapis.com/css2?family=${font.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('+')}:wght@400;700&display=swap`}
                    rel="stylesheet"
                />
            )}

            {/* Text Overlay */}
            <div
                className={`absolute ${positionClasses[position]} left-0 right-0 z-20 px-4 sm:px-6 text-center pointer-events-none animate-fade-in-up`}
                style={{
                    animation: 'fadeInUp 0.4s ease-out'
                }}
            >
                <h1
                    className={`${sizeClasses[size]} font-black uppercase tracking-wider leading-tight drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-all duration-300`}
                    style={{
                        color: color,
                        fontFamily: fontFamilies[font] || fontFamilies['bebas-neue'],
                        textShadow: `
                            3px 3px 0 #000,
                            -1px -1px 0 #000,
                            1px -1px 0 #000,
                            -1px 1px 0 #000,
                            1px 1px 0 #000,
                            0 0 20px rgba(0,0,0,0.9),
                            0 0 40px rgba(0,0,0,0.7)
                        `,
                        WebkitTextStroke: '1px black',
                        letterSpacing: '0.08em',
                        lineHeight: '1.1'
                    }}
                >
                    {text}
                </h1>
            </div>
        </>
    );
};
