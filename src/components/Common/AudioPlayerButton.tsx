import React, { useState, useRef, useEffect } from 'react';
import { Loader2, AlertCircle, Volume2, Play, Square } from 'lucide-react';

interface AudioPlayerButtonProps {
    audioUrl?: string;
    status: string;
    label?: string;
    icon?: React.ReactNode;
}

const AudioPlayerButton: React.FC<AudioPlayerButtonProps> = ({ audioUrl, status, label = "Listen", icon }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!audioUrl) return;

        try {
            let resolvedUrl = audioUrl;
            let blobUrl: string | null = null;

            // Convert data URI to Blob URL for better browser compatibility
            if (audioUrl.startsWith('data:audio/')) {
                const [header, base64Data] = audioUrl.split(',');
                if (base64Data) {
                    const mimeMatch = header.match(/data:(.*?);/);
                    const mimeType = mimeMatch ? mimeMatch[1] : 'audio/wav';

                    try {
                        const binaryString = atob(base64Data);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        const blob = new Blob([bytes], { type: mimeType });
                        blobUrl = URL.createObjectURL(blob);
                        resolvedUrl = blobUrl;
                    } catch (err) {
                        console.error("Failed to convert data URI to Blob:", err);
                        return;
                    }
                }
            }

            const audio = new Audio(resolvedUrl);
            audioRef.current = audio;

            audio.onended = () => setIsPlaying(false);
            audio.onpause = () => setIsPlaying(false);
            audio.onerror = (e) => {
                // Ignore errors if we are cleaning up (audioRef might be null or different)
                if (!audioRef.current) return;

                // If error is null/undefined but event fired, it might be a false positive during loading/interruption
                if (!audio.error && audio.networkState === 2) return;

                console.error("Audio playback error:", {
                    event: e,
                    error: audio.error,
                    errorCode: audio.error?.code,
                    errorMessage: audio.error?.message,
                    networkState: audio.networkState,
                    readyState: audio.readyState,
                    src: audio.src?.substring(0, 100)
                });
                setIsPlaying(false);
            };
        } catch (e) {
            console.error("Audio initialization error:", e);
        }

        // Cleanup function
        return () => {
            if (audioRef.current) {
                // Prevent error triggers during cleanup
                audioRef.current.onerror = null;
                audioRef.current.onended = null;
                audioRef.current.onpause = null;

                audioRef.current.pause();
                const srcToCleanup = audioRef.current.src;
                audioRef.current.src = '';
                try {
                    audioRef.current.load();
                } catch (e) {
                    // Ignore load errors during cleanup
                }

                if (srcToCleanup && srcToCleanup.startsWith('blob:')) {
                    URL.revokeObjectURL(srcToCleanup);
                }
                audioRef.current = null;
            }
        };
    }, [audioUrl]);

    const toggleAudio = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!audioRef.current || !audioUrl) return;

        if (isPlaying) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        } else {
            audioRef.current.play().catch(e => {
                console.warn("Playback prevented", e);
                setIsPlaying(false);
            });
            setIsPlaying(true);
        }
    };

    // Show loader for any processing state
    const isLoading = ['pending', 'queued', 'processing', 'loading'].includes(status);

    if (isLoading) return <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />;
    if (status === 'error' || status === 'failed') return <AlertCircle className="w-4 h-4 text-red-400" />;
    if (status === 'completed' && audioUrl) {
        return (
            <button
                onClick={toggleAudio}
                className="flex items-center space-x-1 text-xs bg-slate-700 hover:bg-slate-600 text-indigo-300 px-2 py-1 rounded transition-colors"
                title={isPlaying ? "Stop" : "Play"}
            >
                {isPlaying ? <Square className="w-3 h-3 fill-current" /> : (icon || <Play className="w-3 h-3 fill-current" />)}
                <span>{isPlaying ? 'Stop' : label}</span>
            </button>
        );
    }
    return <Volume2 className="w-4 h-4 text-slate-600" />;
};

export default AudioPlayerButton;