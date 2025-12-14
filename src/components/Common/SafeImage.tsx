import React, { useState, useEffect } from 'react';
import { getProxyUrl } from '../../utils/urlUtils';
import { Loader2 } from 'lucide-react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src?: string | null;
    fallbackSrc?: string;
    proxyFallback?: boolean;
}

export const SafeImage: React.FC<SafeImageProps> = ({
    src,
    fallbackSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 800 600'%3E%3Crect fill='%231f2937' width='800' height='600'/%3E%3Ctext fill='%234b5563' font-family='sans-serif' font-size='30' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3EImage Not Found%3C/text%3E%3C/svg%3E",
    proxyFallback = true,
    className,
    alt,
    ...props
}) => {
    const [imgSrc, setImgSrc] = useState<string | undefined>(undefined);
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isVisible, setIsVisible] = useState(false);
    const imgRef = React.useRef<HTMLImageElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        if (!src) {
            setImgSrc(fallbackSrc);
            setIsLoading(false);
            return;
        }

        setImgSrc(src);
        setHasError(false);
        setIsLoading(true);
    }, [src, fallbackSrc, isVisible]);

    const handleError = () => {
        if (hasError) return; // Already tried fallback

        if (proxyFallback && src && !src.startsWith('data:') && !src.startsWith('blob:') && !src.includes('/assets?url=')) {
            // Try via proxy
            const proxyUrl = getProxyUrl(src);
            console.log(`[SafeImage] Retry via proxy: ${proxyUrl}`);
            setImgSrc(proxyUrl);
            setHasError(true); // Mark as "in fallback mode" so we don't loop if proxy fails too
        } else {
            // Proxy failed or not enabled, show fallback
            setImgSrc(fallbackSrc);
            setIsLoading(false);
        }
    };

    const handleLoad = () => {
        setIsLoading(false);
    };

    return (
        <div className={`relative overflow-hidden bg-slate-900 ${className}`}>  {/* Wrapper consumes external className */}

            {/* Skeleton / Loading State */}
            {(isLoading || !isVisible) && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-800">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                    <div className="relative z-20 p-3 bg-slate-800/50 rounded-full">
                        <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
                    </div>
                </div>
            )}

            <img
                ref={imgRef}
                src={isVisible ? imgSrc : undefined}
                alt={alt}
                onError={handleError}
                onLoad={handleLoad}
                className={`w-full h-full object-cover transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`} // Internal img fills wrapper
                {...props}
            />
        </div>
    );
};
