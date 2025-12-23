import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { getProxyUrl } from '../../utils/urlUtils';
import { Loader2, AlertCircle } from 'lucide-react';
import { resourceQueue } from '../../utils/resourceQueue';

interface SafeVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
    src?: string | null;
    poster?: string;
    proxyFallback?: boolean;
    lazyLoad?: boolean;
}

export const SafeVideo = forwardRef<HTMLVideoElement, SafeVideoProps>((
    {
        src,
        poster,
        proxyFallback = true,
        lazyLoad = true,
        className,
        autoPlay,
        ...props
    },
    forwardedRef
) => {
    const [videoSrc, setVideoSrc] = useState<string | undefined>(undefined);
    const [hasError, setHasError] = useState(false);
    const [isVisible, setIsVisible] = useState(!lazyLoad);
    const [isLoading, setIsLoading] = useState(false);
    const internalVideoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Combine internal ref with forwarded ref
    useEffect(() => {
        if (forwardedRef) {
            if (typeof forwardedRef === 'function') {
                forwardedRef(internalVideoRef.current);
            } else {
                forwardedRef.current = internalVideoRef.current;
            }
        }
    }, [forwardedRef]);

    // Intersection Observer for Lazy Loading
    useEffect(() => {
        if (!lazyLoad) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '200px', threshold: 0.01 }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [lazyLoad]);

    useEffect(() => {
        if (!isVisible) {
            setVideoSrc(undefined);
            setIsLoading(false);
            return;
        }

        if (!src) return;

        setHasError(false);
        setIsLoading(true);

        let cancelQueue: (() => void) | undefined;

        const loadTask = () => {
            setVideoSrc(src);
        };

        cancelQueue = resourceQueue.enqueue(loadTask);

        return () => {
            if (cancelQueue) cancelQueue();
        };
    }, [isVisible, src]);

    const handleError = () => {
        if (hasError) {
            resourceQueue.release();
            return;
        }

        if (videoSrc && videoSrc.includes('/assets?url=')) {
            console.error(`[SafeVideo] Proxy failed for: ${src}`);
            setIsLoading(false);
            resourceQueue.release();
            return;
        }

        if (proxyFallback && src && !src.startsWith('data:') && !src.startsWith('blob:')) {
            const proxyUrl = getProxyUrl(src);
            console.log(`[SafeVideo] Retry via proxy: ${proxyUrl}`);
            setVideoSrc(proxyUrl);
            setHasError(true);
            setIsLoading(true);
        } else {
            console.error(`[SafeVideo] Failed to load: ${src}`);
            setIsLoading(false);
            resourceQueue.release();
        }
    };

    const handleLoadedData = () => {
        setIsLoading(false);
        resourceQueue.release();
    };

    const handleWaiting = () => setIsLoading(true);

    const handlePlaying = () => {
        setIsLoading(false);
        resourceQueue.release();
    };

    return (
        <div ref={containerRef} className={`relative overflow-hidden bg-slate-900 ${className}`}>
            {(isLoading || (!isVisible && !poster)) && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                    {!poster ? (
                        <div className="absolute inset-0 bg-slate-800">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                        </div>
                    ) : (
                        <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]" />
                    )}

                    <div className="relative z-30 p-3 bg-slate-900/80 rounded-full shadow-lg border border-white/10 backdrop-blur-sm">
                        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                    </div>
                </div>
            )}

            {isVisible && videoSrc ? (
                <video
                    ref={internalVideoRef}
                    src={videoSrc}
                    poster={poster}
                    className={`w-full h-full object-cover transition-opacity duration-500 ${isLoading && !poster ? 'opacity-0' : 'opacity-100'}`}
                    onError={handleError}
                    onLoadedData={handleLoadedData}
                    onWaiting={handleWaiting}
                    onPlaying={handlePlaying}
                    onCanPlay={handleLoadedData}
                    autoPlay={autoPlay}
                    preload="metadata"
                    playsInline
                    loop
                    muted
                    {...props}
                />
            ) : (
                poster && (
                    <img
                        src={poster}
                        className="w-full h-full object-cover opacity-60 blur-sm scale-105 transition-transform duration-700"
                        alt="Video placeholder"
                    />
                )
            )}
        </div>
    );
});

SafeVideo.displayName = 'SafeVideo';
