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
  const [currentTime, setCurrentTime] = useState(0);
  const [showSubtitles, setShowSubtitles] = useState(true);

  const validScenes = scenes.filter(s => s.imageStatus === 'completed' && s.imageUrl);
  const activeScene = validScenes[currentSceneIndex];

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  const [showExportOptions, setShowExportOptions] = useState(false);
  const [includeOutro, setIncludeOutro] = useState(false);
  const [outroFile, setOutroFile] = useState<File | null>(null);
  const [exportFormat, setExportFormat] = useState<'mp4' | 'webm'>('mp4');
  const [isMp4Supported, setIsMp4Supported] = useState(true);

  useEffect(() => {
    // Check for native MP4 recording support
    const supported = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4');
    setIsMp4Supported(supported);
    if (!supported) {
      setExportFormat('webm');
    }
  }, []);

  // Hook for Download Logic
  const {
    startExport,
    cancelExport,
    isDownloading,
    downloadProgress,
    downloadError,
    eta
  } = useVideoExport({ scenes: validScenes, bgMusicUrl, title, outroFile });

  // Reset state when scenes change
  useEffect(() => {
    setCurrentSceneIndex(0);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  }, [scenes]);

  // Handle audio playback and scene progression
  useEffect(() => {
    if (!activeScene) return;

    if (isPlaying) {
      // Play audio
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.error("Audio play error:", e));
      }
      if (musicRef.current) {
        musicRef.current.play().catch(e => console.error("Music play error:", e));
      }
    } else {
      // Pause audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (musicRef.current) {
        musicRef.current.pause();
      }
    }
  }, [isPlaying, activeScene]);

  // Set music volume
  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.volume = 0.3;
    }
  }, [bgMusicUrl]);

  const handleAudioEnded = () => {
    if (currentSceneIndex < validScenes.length - 1) {
      setCurrentSceneIndex(prev => prev + 1);
      // Reset progress/time for next scene
      setProgress(0);
      setCurrentTime(0);
    } else {
      setIsPlaying(false);
      setCurrentSceneIndex(0);
      setProgress(0);
      setCurrentTime(0);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const duration = audioRef.current.duration || 1;
      const current = audioRef.current.currentTime;
      setCurrentTime(current);
      setProgress((current / duration) * 100);
    }
  };

  const startPlayback = () => setIsPlaying(true);
  const pausePlayback = () => setIsPlaying(false);

  const resetPlayback = () => {
    setIsPlaying(false);
    setCurrentSceneIndex(0);
    setProgress(0);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    if (musicRef.current) {
      musicRef.current.currentTime = 0;
    }
  };

  const handleDownloadClick = () => {
    pausePlayback();
    setShowExportOptions(true);
  };

  const confirmExport = () => {
    setShowExportOptions(false);
    startExport(exportFormat);
  };

  if (!activeScene) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="mb-4">No valid scenes to play.</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 md:p-8 animate-fade-in">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all z-50"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Main Player Container */}
      <div className="relative h-[80vh] aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group">

        {/* Background Image */}
        <img
          src={activeScene.imageUrl || ''}
          alt={`Scene ${currentSceneIndex + 1}`}
          className={`w-full h-full object-cover transition-transform duration-[20s] ease-linear ${isPlaying ? 'scale-110' : 'scale-100'}`}
        />

        {/* Audio Elements */}
        <audio
          ref={audioRef}
          src={activeScene.audioUrl || ''}
          onEnded={handleAudioEnded}
          onTimeUpdate={handleTimeUpdate}
          autoPlay={isPlaying}
        />
        {bgMusicUrl && (
          <audio
            ref={musicRef}
            src={bgMusicUrl}
            loop
          />
        )}

        {/* Subtitles */}
        {showSubtitles && activeScene.narration && (
          <SubtitleOverlay
            text={activeScene.narration}
            duration={activeScene.durationSeconds || 5}
            currentTime={currentTime}
            show={true}
            wordTimings={activeScene.wordTimings}
          />
        )}

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div
            className="h-full bg-indigo-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* EXPORT OPTIONS MODAL */}
        {showExportOptions && !isDownloading && (
          <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center animate-fade-in-up">
            <h3 className="text-xl font-bold mb-2 text-white">Export Options</h3>
            <p className="text-xs text-slate-400 mb-6">Resolution: 1080x1920 (9:16 Vertical)</p>

            <div className="w-full max-w-xs mb-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <label className="text-sm font-medium text-slate-300 block mb-3 text-left">Format</label>
              <div className="flex gap-2">
                <button
                  onClick={() => isMp4Supported && setExportFormat('mp4')}
                  disabled={!isMp4Supported}
                  title={!isMp4Supported ? "MP4 export is not supported by your browser. Please use WebM." : ""}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${exportFormat === 'mp4'
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : !isMp4Supported
                      ? 'bg-slate-800/50 border-slate-800 text-slate-600 cursor-not-allowed'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    }`}
                >
                  MP4 {!isMp4Supported && '(N/A)'}
                </button>
                <button
                  onClick={() => setExportFormat('webm')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${exportFormat === 'webm' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                >
                  WebM
                </button>
              </div>
            </div>

            <div className="w-full max-w-xs mb-8 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-slate-300">Merge Video</label>
                <div
                  onClick={() => setIncludeOutro(!includeOutro)}
                  className={`w-10 h-5 rounded-full cursor-pointer transition-colors relative ${includeOutro ? 'bg-indigo-500' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${includeOutro ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>

              {includeOutro && (
                <div className="animate-fade-in-up">
                  <div className="relative group">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setOutroFile(e.target.files?.[0] || null)}
                      className="block w-full text-xs text-slate-400
                                        file:mr-3 file:py-2 file:px-3
                                        file:rounded-lg file:border-0
                                        file:text-xs file:font-semibold
                                        file:bg-indigo-500/10 file:text-indigo-400
                                        hover:file:bg-indigo-500/20
                                        cursor-pointer border border-slate-700 rounded-lg bg-slate-800/50 p-1"
                    />
                    {outroFile && (
                      <button
                        onClick={() => setOutroFile(null)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-400 bg-slate-900 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 text-left leading-relaxed">
                    Upload a vertical video (1080x1920) to play after the generated content.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 w-full max-w-xs">
              <button
                onClick={() => setShowExportOptions(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl font-semibold transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmExport}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Start Export
              </button>
            </div>
          </div>
        )}

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
                    ⚠️ <b>Keep this tab active.</b><br />Switching tabs may pause the renderer and cause the video to freeze or desync.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
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
