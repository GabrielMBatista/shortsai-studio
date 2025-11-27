
import React, { useState, useEffect, useRef } from 'react';
import { Scene } from '../types';
import { Play, Pause, SkipBack, X, Download, VolumeX, Volume2, Loader2, Captions, CaptionsOff, AlertTriangle, Timer } from 'lucide-react';
import { useVideoExport } from '../hooks/useVideoExport';
import SubtitleOverlay from './SubtitleOverlay';

interface VideoPlayerProps {
  scenes: Scene[];
  onClose: () => void;
  bgMusicUrl?: string;
  title?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ scenes, onClose, bgMusicUrl, title = "shorts-ai-video" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showSubtitles, setShowSubtitles] = useState(true);
  
  const validScenes = scenes.filter(s => s.imageStatus === 'completed' && s.imageUrl);
  const activeScene = validScenes[currentSceneIndex];
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);

  // Hook for Download Logic
  const { 
      startExport, 
      cancelExport, 
      isDownloading, 
      downloadProgress, 
      downloadError,
      eta
  } = useVideoExport({ scenes: validScenes, bgMusicUrl, title });

  useEffect(() => {
    if (activeScene) durationRef.current = activeScene.durationSeconds * 1000;
  }, [currentSceneIndex, activeScene]);

  // Preview Logic with Error Fixes
  useEffect(() => {
    if (!audioRef.current || !activeScene) return;

    // Fix: Only attempt playback if audioUrl is valid
    const hasAudio = activeScene.audioUrl && activeScene.audioUrl.trim() !== '';

    const handleAudio = async () => {
        try {
            if (isPlaying && hasAudio) {
                // Prevent reloading if same src
                if (audioRef.current!.src !== activeScene.audioUrl) {
                    audioRef.current!.src = activeScene.audioUrl!;
                }
                // Sync Time (Approximate)
                const targetTime = activeScene.durationSeconds > 0 ? (progress / 100) * activeScene.durationSeconds : 0;
                if (Math.abs(audioRef.current!.currentTime - targetTime) > 0.5) {
                    audioRef.current!.currentTime = targetTime;
                }
                
                await audioRef.current!.play();
            } else {
                audioRef.current!.pause();
            }
        } catch (e) {
            // Silently catch play interruptions to avoid console spam
            console.debug("Audio playback interrupted", e);
        }
    };

    handleAudio();

    // Background Music Logic
    if (bgMusicUrl && musicRef.current) {
        if (!musicRef.current.src || musicRef.current.src !== bgMusicUrl) {
             musicRef.current.src = bgMusicUrl;
             musicRef.current.loop = true;
             musicRef.current.volume = 0.15;
        }
        if (isPlaying) {
            musicRef.current.play().catch(() => {});
        } else {
            musicRef.current.pause();
        }
    }
  }, [currentSceneIndex, isPlaying, activeScene, bgMusicUrl]);

  const startPlayback = () => {
    if (validScenes.length === 0) return;
    setIsPlaying(true);
    const safeDuration = durationRef.current || 5000;
    startTimeRef.current = Date.now() - (progress / 100) * safeDuration;
    
    timerRef.current = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const sceneDuration = durationRef.current || 5000;
      
      if (elapsed >= sceneDuration) {
        if (currentSceneIndex < validScenes.length - 1) {
          setCurrentSceneIndex(prev => prev + 1);
          setProgress(0);
          startTimeRef.current = Date.now();
        } else {
          setIsPlaying(false);
          setProgress(100);
          if (timerRef.current) clearInterval(timerRef.current);
          if (musicRef.current) {
              musicRef.current.pause();
              musicRef.current.currentTime = 0;
          }
        }
      } else {
        setProgress((elapsed / sceneDuration) * 100);
      }
    }, 30);
  };

  const pausePlayback = () => {
    setIsPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioRef.current) audioRef.current.pause();
    if (musicRef.current) musicRef.current.pause();
  };

  const resetPlayback = () => {
    pausePlayback();
    setCurrentSceneIndex(0);
    setProgress(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
    if (musicRef.current) musicRef.current.currentTime = 0;
  };

  const handleDownloadClick = () => {
      pausePlayback();
      startExport();
  };

  useEffect(() => {
      return () => { if (timerRef.current) clearInterval(timerRef.current); }; 
  }, []);

  useEffect(() => {
    if (validScenes.length > 0 && !isPlaying && progress === 0) startPlayback();
  }, [validScenes.length]);

  useEffect(() => {
      if (currentSceneIndex >= validScenes.length && validScenes.length > 0) {
          setCurrentSceneIndex(0);
          setProgress(0);
      }
  }, [validScenes.length, currentSceneIndex]);

  if (validScenes.length === 0 || !activeScene) return null;
  
  const currentTimeInScene = (progress / 100) * activeScene.durationSeconds;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-3xl">
      <audio ref={audioRef} className="hidden" />
      <audio ref={musicRef} className="hidden" />
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
          <h2 className="text-white font-bold text-xl drop-shadow-md hidden md:block opacity-80 truncate max-w-md">{title}</h2>
          <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/10"><X className="w-6 h-6" /></button>
      </div>
      <div className="relative w-full max-w-[420px] aspect-[9/16] bg-black rounded-[2.5rem] shadow-2xl overflow-hidden ring-4 ring-slate-800/50">
        <div className="absolute inset-0 overflow-hidden">
          <img key={activeScene.sceneNumber} src={activeScene.imageUrl} className={`w-full h-full object-cover transition-opacity duration-500 ${isPlaying ? 'animate-ken-burns' : ''}`} style={{ animationDuration: `${activeScene.durationSeconds + 2}s` }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />
        </div>
        
        {/* REUSABLE SUBTITLE COMPONENT */}
        <SubtitleOverlay 
            text={activeScene.narration} 
            duration={activeScene.durationSeconds} 
            currentTime={currentTimeInScene} 
            show={showSubtitles} 
        />

        <div className="absolute top-6 left-4 right-4 flex space-x-1.5 z-10">
           {validScenes.map((_, idx) => (
             <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
               <div className={`h-full bg-white shadow-[0_0_10px_white] transition-all duration-75 ${idx < currentSceneIndex ? 'w-full' : idx === currentSceneIndex ? '' : 'w-0'}`} style={{ width: idx === currentSceneIndex ? `${progress}%` : undefined }} />
             </div>
           ))}
        </div>
        
        {/* DOWNLOAD / ERROR OVERLAY */}
        {(isDownloading || downloadError) && (
            <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center animate-fade-in-up">
                {downloadError ? (
                     <div className="flex flex-col items-center animate-fade-in-up">
                        <div className="p-4 bg-red-500/10 rounded-full mb-4 ring-2 ring-red-500/50">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-white">Export Failed</h3>
                        <p className="text-slate-400 text-xs font-mono mb-6 max-w-[90%] leading-relaxed bg-slate-800/50 p-3 rounded border border-slate-700 break-words">{downloadError}</p>
                        <button 
                            onClick={cancelExport} 
                            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg font-semibold transition-colors text-sm hover:text-white"
                        >
                            Close
                        </button>
                     </div>
                ) : (
                     <>
                        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                        <h3 className="text-lg font-bold mb-2">Exporting Video</h3>
                        <p className="text-slate-400 text-sm font-mono mb-4 font-semibold tracking-wide">{downloadProgress}</p>
                        
                        {eta && (
                             <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-300 rounded-full text-xs font-mono mb-6 border border-indigo-500/20">
                                <Timer className="w-3.5 h-3.5" />
                                <span>Est. time: {eta}</span>
                             </div>
                        )}

                        <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden mb-6">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-shimmer w-full" style={{ backgroundSize: '200% 100%' }}></div>
                        </div>
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg max-w-[280px]">
                            <p className="text-[10px] text-yellow-200/80 leading-tight">
                                ⚠️ <b>Keep this tab active.</b><br/>Switching tabs may pause the renderer and cause the video to freeze or desync.
                            </p>
                        </div>
                     </>
                )}
            </div>
        )}
      </div>
      <div className="mt-8 flex items-center gap-6 bg-slate-900/50 backdrop-blur-xl border border-white/5 p-3 rounded-full shadow-2xl z-10">
        <button onClick={resetPlayback} className="p-3 text-slate-300 hover:text-white hover:bg-white/10 rounded-full"><SkipBack className="w-5 h-5" /></button>
        <button onClick={isPlaying ? pausePlayback : startPlayback} className="p-4 bg-white text-black hover:bg-slate-200 rounded-full transition-all transform hover:scale-105 shadow-lg shadow-white/10">{isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}</button>
        <button onClick={handleDownloadClick} disabled={isDownloading} className={`p-3 rounded-full transition-colors flex items-center justify-center ${isDownloading ? 'text-slate-500 cursor-wait' : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10'}`}><Download className="w-5 h-5" /></button>
        <div className="w-px h-6 bg-white/10 mx-1"></div>
        <button onClick={() => setShowSubtitles(!showSubtitles)} className={`p-3 rounded-full transition-colors ${showSubtitles ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>{showSubtitles ? <Captions className="w-5 h-5" /> : <CaptionsOff className="w-5 h-5" />}</button>
        <div className={`p-3 transition-colors ${activeScene.audioUrl ? 'text-white' : 'text-slate-600'}`}>{activeScene.audioUrl ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}</div>
      </div>
    </div>
  );
};

export default VideoPlayer;
