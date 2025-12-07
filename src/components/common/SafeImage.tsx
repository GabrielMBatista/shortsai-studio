import React, { useState, useEffect } from 'react';
import { getProxyUrl } from '../../utils/urlUtils';

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

    useEffect(() => {
        if (!src) {
            setImgSrc(fallbackSrc);
            setIsLoading(false);
            return;
        }

        setImgSrc(src);
        setHasError(false);
        setIsLoading(true);
    }, [src, fallbackSrc]);

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
        <img
            src={imgSrc}
            alt={alt}
            onError={handleError}
            onLoad={handleLoad}
            className={`${className} ${isLoading ? 'opacity-50 blur-sm' : 'opacity-100 blur-0'} transition-all duration-300`}
            {...props}
        />
    );
};
