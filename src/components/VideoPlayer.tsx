import React, { useState, useEffect, useRef } from 'react';
import { Scene } from '../types';
import { Play, Pause, SkipBack, X, Download, VolumeX, Volume2, Loader2, Captions, CaptionsOff, AlertTriangle, Timer, Clock } from 'lucide-react';
import { useVideoExport } from '../hooks/useVideoExport';
import SubtitleOverlay from './SubtitleOverlay';
import { useTranslation } from 'react-i18next';
import { getSceneMedia } from '../services/scenes';

interface VideoPlayerProps {
  scenes: Scene[];
  onClose: () => void;
  bgMusicUrl?: string;
  title?: string;
  projectId?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ scenes, onClose, bgMusicUrl, title = "shorts-ai-video", projectId }) => {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showSubtitles, setShowSubtitles] = useState(true);

  // Relaxed validity check: rely on status, not URL presence (since lazy loaded)
  const validScenes = scenes.filter(s => s.imageStatus === 'completed');
  const activeScene = validScenes[currentSceneIndex];

  const [activeMedia, setActiveMedia] = useState<{ imageUrl?: string | null, audioUrl?: string | null, videoUrl?: string | null }>({});
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  useEffect(() => {
    if (!activeScene) return;

    const loadMedia = async () => {
        setIsLoadingMedia(true);
        let { imageUrl, audioUrl, videoUrl } = activeScene;

        // Fetch if missing and scene has ID
        if ((!imageUrl || !audioUrl || (!videoUrl && activeScene.videoStatus === 'completed')) && activeScene.id) {
            try {
                const media = await getSceneMedia(activeScene.id);
                if (media) {
                    if (!imageUrl) imageUrl = media.image_base64;
                    if (!audioUrl) audioUrl = media.audio_base64;
                    if (!videoUrl) videoUrl = media.video_base64;
                }
            } catch (e) {
                console.error("Failed to load scene media for player", e);
            }
        }
        setActiveMedia({ imageUrl, audioUrl, videoUrl });
        setIsLoadingMedia(false);
    };

    loadMedia();
  }, [activeScene]);


  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  const [showExportOptions, setShowExportOptions] = useState(false);
  const [includeEndingVideo, setIncludeEndingVideo] = useState(false);
  const [endingVideoFile, setEndingVideoFile] = useState<File | null>(null);
  const [exportFormat, setExportFormat] = useState<'mp4' | 'webm'>('mp4');
  const [exportFps, setExportFps] = useState<30 | 60>(60);
  const [isMp4Supported, setIsMp4Supported] = useState(true);
  const [showMobileTips, setShowMobileTips] = useState(false);

  useEffect(() => {
    // Check for native MP4 recording support
    const supported = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4');
    setIsMp4Supported(supported);
    if (!supported) {
      setExportFormat('webm');
    }
  }, []);

  const [volume, setVolume] = useState(0.8);

  // Hook for Download Logic
  const {
    startExport,
    cancelExport,
    isDownloading,
    downloadProgress,
    downloadError,
    eta
  } = useVideoExport({ scenes: validScenes, bgMusicUrl, title, endingVideoFile, showSubtitles, fps: exportFps });


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
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            console.error("Audio play error:", e);
          });
        }
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
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [bgMusicUrl, volume]);

  const handleAudioEnded = () => {
    if (currentSceneIndex < validScenes.length - 1) {
      setCurrentSceneIndex(prev => prev + 1);
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
          <p className="mb-4">{t('video_player.no_scenes')}</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 rounded-lg">{t('video_player.close')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 md:p-8 animate-fade-in">
      {/* Total Duration Badge */}
      <div className="absolute top-6 left-6 z-50 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 text-xs font-medium text-white/90">
        <Clock className="w-3.5 h-3.5 text-white/70" />
        <span>{Math.round(validScenes.reduce((acc, s) => acc + Number(s.durationSeconds || 0), 0))}s</span>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all z-50">
        <X className="w-6 h-6" />
      </button>

      {/* Main Player Container */}
      <div className="relative h-[80vh] max-w-full aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group">

        {/* Background Media */}
        {(
          (activeScene.mediaType === 'video' || (activeScene.videoUrl && activeScene.videoStatus === 'completed')) || 
          (activeMedia.videoUrl)
        ) ? (
          <video
            src={activeMedia.videoUrl || activeScene.videoUrl || ''}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted={true}
            playsInline
            onPlay={() => {
              if (audioRef.current && Math.abs(audioRef.current.currentTime - 0) > 0.5) {
                audioRef.current.currentTime = 0;
              }
            }}
          />
        ) : (
          <img
            src={activeMedia.imageUrl || activeScene.imageUrl || ''}
            alt={`Scene ${currentSceneIndex + 1}`}
            className={`w-full h-full object-cover transition-transform duration-[20s] ease-linear ${isPlaying ? 'scale-110' : 'scale-100'}`}
          />
        )}

        {/* Audio Elements */}
        <audio
          ref={audioRef}
          src={activeMedia.audioUrl || activeScene.audioUrl || ''}
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

        {/* Instagram-style Segmented Progress Bar */}
        <div className="absolute top-3 left-3 right-3 z-30 flex gap-1.5">
          {validScenes.map((_, index) => (
            <div key={index} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{
                  width: index < currentSceneIndex ? '100%' :
                    index === currentSceneIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* EXPORT OPTIONS MODAL */}
        {showExportOptions && !isDownloading && (
          <>
            {/* Dark Overlay with Export Form */}
            <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center text-white p-6 animate-fade-in-up">
              <div className="flex flex-col items-center text-center relative">
                {/* Help Button (Mobile/Tablet Only) */}
                <button
                  onClick={() => setShowMobileTips(true)}
                  className="xl:hidden absolute -top-2 -right-2 p-2 bg-indigo-500 hover:bg-indigo-600 rounded-full transition-colors shadow-lg"
                  title={t('video_player.tips_title')}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                <h3 className="text-xl font-bold mb-2 text-white">{t('video_player.export_options')}</h3>
                <p className="text-xs text-slate-400 mb-6">{t('video_player.resolution_note')}</p>

                <div className="w-full max-w-sm mb-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                  <label className="text-sm font-medium text-slate-300 block mb-3 text-left">{t('video_player.format')}</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => isMp4Supported && setExportFormat('mp4')}
                      disabled={!isMp4Supported}
                      title={!isMp4Supported ? t('video_player.mp4_not_supported') : ""}
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

                <div className="w-full max-w-sm mb-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                  <label className="text-sm font-medium text-slate-300 block mb-3 text-left">{t('video_player.frame_rate')}</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExportFps(30)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${exportFps === 30
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                        }`}
                    >
                      30 FPS
                    </button>
                    <button
                      onClick={() => setExportFps(60)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${exportFps === 60
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                        }`}
                    >
                      60 FPS
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 text-left leading-relaxed">
                    {t('video_player.fps_hint')}
                  </p>
                </div>

                <div className="w-full max-w-sm mb-8 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-slate-300">{t('video_player.merge_video')}</label>
                    <div
                      onClick={() => setIncludeEndingVideo(!includeEndingVideo)}
                      className={`w-10 h-5 rounded-full cursor-pointer transition-colors relative ${includeEndingVideo ? 'bg-indigo-500' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${includeEndingVideo ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  {includeEndingVideo && (
                    <div className="animate-fade-in-up">
                      <div className="relative group">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => setEndingVideoFile(e.target.files?.[0] || null)}
                          className="block w-full text-xs text-slate-400
                                                file:mr-3 file:py-2 file:px-3
                                                file:rounded-lg file:border-0
                                                file:text-xs file:font-semibold
                                                file:bg-indigo-500/10 file:text-indigo-400
                                                hover:file:bg-indigo-500/20
                                                cursor-pointer border border-slate-700 rounded-lg bg-slate-800/50 p-1"
                        />
                        {endingVideoFile && (
                          <button
                            onClick={() => setEndingVideoFile(null)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-400 bg-slate-900 rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2 text-left leading-relaxed">
                        {t('video_player.upload_placeholder')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 w-full max-w-sm">
                  <button
                    onClick={() => setShowExportOptions(false)}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl font-semibold transition-colors text-sm"
                  >
                    {t('video_player.cancel')}
                  </button>
                  <button
                    onClick={confirmExport}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" />
                    {t('video_player.start_export')}
                  </button>
                </div>
              </div>
            </div>

            {/* Export Tips Card (Outside dark overlay, Desktop Only) */}
            <div className="hidden xl:block absolute right-4 top-1/2 -translate-y-1/2 z-[60] w-72 animate-fade-in-up">
              <div className="bg-slate-900/95 backdrop-blur-sm p-5 rounded-xl border border-indigo-500/30 shadow-2xl">
                <h4 className="text-base font-bold text-indigo-300 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('video_player.tips_title')}
                </h4>
                <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                  <div className="flex gap-3">
                    <span className="text-indigo-400 flex-shrink-0">⚡</span>
                    <p>{t('video_player.tip_performance')}</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-indigo-400 flex-shrink-0">🎬</span>
                    <p>{t('video_player.tip_quality')}</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-indigo-400 flex-shrink-0">📁</span>
                    <p>{t('video_player.tip_format')}</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-yellow-400 flex-shrink-0">⚠️</span>
                    <p className="text-yellow-200/90">{t('video_player.tip_stay')}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* DOWNLOAD / ERROR OVERLAY */}
        {(isDownloading || downloadError) && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center animate-fade-in-up">
            {downloadError ? (
              <div className="flex flex-col items-center animate-fade-in-up">
                <div className="p-4 bg-red-500/10 rounded-full mb-4 ring-2 ring-red-500/50">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">{t('video_player.export_failed')}</h3>
                <p className="text-slate-400 text-xs font-mono mb-6 max-w-[90%] leading-relaxed bg-slate-800/50 p-3 rounded border border-slate-700 break-words">{downloadError}</p>
                <button
                  onClick={cancelExport}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg font-semibold transition-colors text-sm hover:text-white"
                >
                  {t('video_player.close')}
                </button>
              </div>
            ) : (
              <>
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                <h3 className="text-lg font-bold mb-2">{t('video_player.exporting')}</h3>
                <p className="text-slate-400 text-sm font-mono mb-4 font-semibold tracking-wide">{downloadProgress}</p>

                {eta && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-300 rounded-full text-xs font-mono mb-6 border border-indigo-500/20">
                    <Timer className="w-3.5 h-3.5" />
                    <span>{t('video_player.est_time')} {eta}</span>
                  </div>
                )}

                <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden mb-6">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-shimmer w-full" style={{ backgroundSize: '200% 100%' }}></div>
                </div>
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl max-w-sm w-full">
                  <p className="text-sm text-yellow-200/90 leading-relaxed">
                    <span className="text-xl align-middle mr-2">⚠️</span>
                    <b className="text-base uppercase tracking-wide align-middle">{t('video_player.warning_tab')}</b>
                    <br />
                    <span className="block mt-2 opacity-80">
                      {t('video_player.warning_desc')}
                    </span>
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center gap-2 sm:gap-6 bg-slate-900/50 backdrop-blur-xl border border-white/5 p-3 rounded-full shadow-2xl z-10">
        <button onClick={resetPlayback} className="p-3 text-slate-300 hover:text-white hover:bg-white/10 rounded-full"><SkipBack className="w-5 h-5" /></button>
        <button onClick={isPlaying ? pausePlayback : startPlayback} className="p-4 bg-white text-black hover:bg-slate-200 rounded-full transition-all transform hover:scale-105 shadow-lg shadow-white/10">{isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}</button>
        <button onClick={handleDownloadClick} disabled={isDownloading} className={`p-3 rounded-full transition-colors flex items-center justify-center ${isDownloading ? 'text-slate-500 cursor-wait' : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10'}`}><Download className="w-5 h-5" /></button>
        <div className="w-px h-6 bg-white/10 mx-1"></div>
        <button onClick={() => setShowSubtitles(!showSubtitles)} className={`p-3 rounded-full transition-colors ${showSubtitles ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>{showSubtitles ? <Captions className="w-5 h-5" /> : <CaptionsOff className="w-5 h-5" />}</button>

        <div className="flex items-center gap-2 px-2 group">
          <button onClick={() => setVolume(volume === 0 ? 0.8 : 0)} className={`p-1 transition-colors rounded-full hover:bg-white/10 ${volume > 0 ? 'text-white' : 'text-slate-600'}`}>
            {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
      </div>

      {/* Mobile Tips Modal (Outside everything, full screen overlay) */}
      {showMobileTips && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in-up">
          <div className="bg-slate-900 p-6 rounded-xl border border-indigo-500/30 shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-indigo-300 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('video_player.tips_title')}
              </h4>
              <button
                onClick={() => setShowMobileTips(false)}
                className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <div className="flex gap-3">
                <span className="text-indigo-400 flex-shrink-0">⚡</span>
                <p>{t('video_player.tip_performance')}</p>
              </div>
              <div className="flex gap-3">
                <span className="text-indigo-400 flex-shrink-0">🎬</span>
                <p>{t('video_player.tip_quality')}</p>
              </div>
              <div className="flex gap-3">
                <span className="text-indigo-400 flex-shrink-0">📁</span>
                <p>{t('video_player.tip_format')}</p>
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400 flex-shrink-0">⚠️</span>
                <p className="text-yellow-200/90">{t('video_player.tip_stay')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
