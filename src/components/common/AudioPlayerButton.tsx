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
        // Fix: Prevent creating Audio object if URL is invalid to avoid 'no supported sources' error
        if (!audioUrl) return;

        if (!audioRef.current) {
            try {
                audioRef.current = new Audio(audioUrl);
                audioRef.current.onended = () => setIsPlaying(false);
                audioRef.current.onpause = () => setIsPlaying(false);
                audioRef.current.onerror = () => setIsPlaying(false);
            } catch(e) {
                console.warn("Audio init error", e);
            }
        } else if (audioRef.current.src !== audioUrl) {
             audioRef.current.src = audioUrl;
        }
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

    if (status === 'loading') return <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />;
    if (status === 'error') return <AlertCircle className="w-4 h-4 text-red-400" />;
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