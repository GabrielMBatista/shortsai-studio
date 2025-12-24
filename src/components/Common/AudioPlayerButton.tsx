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

    const toggleAudio = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!audioUrl) return;

        // Initialize Audio on first click (Lazy Load)
        if (!audioRef.current) {
            try {
                let resolvedUrl = audioUrl;

                // Use proxy for R2 URLs to avoid CORS/flooding
                if (audioUrl.startsWith('http') && !audioUrl.startsWith('data:') && !audioUrl.startsWith('blob:') && !audioUrl.includes('/assets?url=')) {
                    const { getProxyUrl } = await import('../../utils/urlUtils');
                    resolvedUrl = getProxyUrl(audioUrl);
                }
                // Convert data URI to Blob URL for compatibility
                else if (audioUrl.startsWith('data:audio/')) {
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
                            resolvedUrl = URL.createObjectURL(blob);
                        } catch (err) {
                            console.error("Failed to convert data URI to Blob:", err);
                            return;
                        }
                    }
                }

                const audio = new Audio(resolvedUrl);
                audio.onended = () => setIsPlaying(false);
                audio.onpause = () => setIsPlaying(false);
                audio.onerror = (e) => {
                    console.error("Audio playback error:", audio.error);
                    setIsPlaying(false);
                };

                audioRef.current = audio;
            } catch (e) {
                console.error("Audio initialization error:", e);
                return;
            }
        }

        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            audio.currentTime = 0;
            setIsPlaying(false);
        } else {
            try {
                await audio.play();
                setIsPlaying(true);
            } catch (e) {
                console.warn("Playback failed/prevented", e);
                setIsPlaying(false);
            }
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                const src = audioRef.current.src;
                audioRef.current.src = '';
                if (src.startsWith('blob:')) URL.revokeObjectURL(src);
                audioRef.current = null;
            }
        };
    }, []);

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