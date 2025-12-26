import React, { useState, useEffect, useRef } from 'react';
import { Scene } from '../../types';
import { Play, Pause, SkipBack, X, Download, VolumeX, Volume2, Loader2, Captions, CaptionsOff, AlertTriangle, Timer, Clock, UploadCloud } from 'lucide-react';
import { useVideoExport } from '../../hooks/useVideoExport';
import SubtitleOverlay from './SubtitleOverlay';
import { useTranslation } from 'react-i18next';
import { getSceneMedia } from '../../services/scenes';
import { SafeImage } from '../Common/SafeImage';
import { SafeVideo } from '../Common/SafeVideo';
import { ScheduleUploadModal } from './ScheduleUploadModal';

interface VideoPlayerProps {
  scenes: Scene[];
  onClose: () => void;
  bgMusicUrl?: string;
  title?: string;
  projectId?: string;
  onStartTour: (tour: 'preview' | 'export') => void;
  activeTour: 'settings' | 'creation' | 'script' | 'preview' | 'export' | 'folders' | null;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ scenes, onClose, bgMusicUrl, title = "shorts-ai-video", projectId, onStartTour, activeTour }) => {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [videoEnded, setVideoEnded] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Detect mock projects
  const isMock = projectId === '__mock__-tour-project';

  // Use useMemo to ensure validScenes is recalculated when scenes prop changes
  const validScenes = React.useMemo(() => {
    // Include scenes that have EITHER completed image OR completed video
    return scenes.filter(s =>
      s.imageStatus === 'completed' ||
      (s.videoStatus === 'completed' && s.videoUrl)
    );
  }, [scenes]);

  // Use useMemo to ensure activeScene is always fresh from validScenes
  const activeScene = React.useMemo(() => {
    return validScenes[currentSceneIndex];
  }, [validScenes, currentSceneIndex]);

  // --- SIMPLIFIED PLAYER STATE ---
  const [activeMedia, setActiveMedia] = useState<{ imageUrl?: string, audioUrl?: string, videoUrl?: string }>({});

  // 1. Scene Change & Media Loading (Simple & Direct)
  useEffect(() => {
    if (!activeScene) return;

    const prepareMedia = async () => {
      // Direct URLs from Proxy (Backend handles caching now)
      // Images: Use cache if needed, but simple blob is fine
      let imageUrl = activeScene.imageUrl;
      let audioUrl = activeScene.audioUrl;
      let videoUrl = activeScene.videoUrl;

      // Handle missing details
      if ((!imageUrl || !audioUrl) && activeScene.id) {
        try {
          const media = await getSceneMedia(activeScene.id);
          if (media) {
            imageUrl = imageUrl || media.image_base64;
            audioUrl = audioUrl || media.audio_base64;
            videoUrl = videoUrl || media.video_base64;
          }
        } catch (e) { console.warn("Fetch media detail fail:", e); }
      }

      // Image Optimization Only (Blob Cache for smooth slideshow)
      if (imageUrl?.startsWith('http')) {
        try {
          const { mediaCache } = await import('../../utils/mediaCache');
          imageUrl = await mediaCache.fetchAndCache(imageUrl, 'image');
        } catch (e) {/* ignore */ }
      }

      // Video/Audio: USE PROXY DIRECTLY.
      // Do NOT try to fetch/cache blobs (too slow/heavy). 
      // Do NOT try to bypass proxy (CORS/SSL issues).
      // The backend proxy now has SSD Cache + Range Support. Best of both worlds.
      if (videoUrl?.startsWith('http') && !videoUrl.includes('/api/assets')) {
        const { getProxyUrl } = await import('../../utils/urlUtils');
        videoUrl = getProxyUrl(videoUrl);
      }
      if (audioUrl?.startsWith('http') && !audioUrl.includes('/api/assets')) {
        const { getProxyUrl } = await import('../../utils/urlUtils');
        audioUrl = getProxyUrl(audioUrl);
      }

      setActiveMedia({ imageUrl, audioUrl, videoUrl });
    };

    prepareMedia();
  }, [activeScene]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // 2. Playback Control (The "Just Works" Approach)
  useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    const m = musicRef.current;

    const playAll = async () => {
      try {
        if (v && v.paused) await v.play();
        if (a && a.paused) {
          // Basic Sync Attempt on Play
          if (v) a.currentTime = v.currentTime;
          await a.play();
        }
        if (m && m.paused) await m.play();
      } catch (e) {
        console.warn("Playback interrupted (user likely navigated away):", e);
      }
    };

    const pauseAll = () => {
      v?.pause();
      a?.pause();
      m?.pause();
    };

    if (activeScene && isPlaying) {
      playAll();
    } else {
      pauseAll();
    }

  }, [isPlaying, activeMedia]); // Re-run if media changes while playing

  // 3. Simple Scene Progression
  const handleMediaEnded = () => {
    // If video ends, next scene. 
    // We rely on video 'ended' event mostly, or audio if video is missing.
    if (currentSceneIndex < validScenes.length - 1) {
      setCurrentSceneIndex(prev => prev + 1);
      setProgress(0);
      setVideoEnded(false);
    } else {
      setIsPlaying(false);
      setCurrentSceneIndex(0);
      setProgress(0);
      setVideoEnded(false);
    }
  };

  const [showExportOptions, setShowExportOptions] = useState(false);
  const [includeEndingVideo, setIncludeEndingVideo] = useState(false);
  const [endingVideoFile, setEndingVideoFile] = useState<File | null>(null);
  const [exportFormat, setExportFormat] = useState<'mp4' | 'webm'>('mp4');
  const [exportResolution, setExportResolution] = useState<'1080p' | '720p'>('1080p');
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

  // Auto-open export modal for export tour
  useEffect(() => {
    if (activeTour === 'export') {
      setTimeout(() => {
        setShowExportOptions(true);
        pausePlayback();
      }, 1000);
    }
  }, [activeTour]);

  const [volume, setVolume] = useState(0.8);

  // Hook for Download Logic
  const {
    startExport,
    cancelExport,
    isDownloading,
    downloadProgress,
    downloadError,
    eta
  } = useVideoExport({ scenes: validScenes, bgMusicUrl, title, endingVideoFile, showSubtitles, fps: exportFps, resolution: exportResolution });


  // Reset state when scenes change
  useEffect(() => {
    setCurrentSceneIndex(0);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setVideoEnded(false);
  }, [scenes]);

  // Reset video ended state when changing scenes within the same list
  useEffect(() => {
    setVideoEnded(false);
  }, [currentSceneIndex]);

  // Set music volume
  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.volume = 0.3;
    }
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [bgMusicUrl, volume]);

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
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
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
      <div className="absolute top-6 right-6 z-50">
        <button
          id="btn-close-player"
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Player Container */}
      <div id="video-preview-player" className="relative h-[80vh] max-w-full aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group">

        {/* Media Render (Clean) */}
        {(() => {
          const vSrc = activeMedia.videoUrl;
          const iSrc = activeMedia.imageUrl;
          const aSrc = activeMedia.audioUrl;

          // Video Layer
          if (vSrc) {
            return (
              <>
                {/* Poster Image */}
                <img src={iSrc} className={`absolute inset-0 w-full h-full object-cover ${videoEnded ? 'opacity-100' : 'opacity-0'}`} />

                {/* Video Element - Master Clock when present */}
                <video
                  ref={videoRef}
                  key={`vid-${currentSceneIndex}`} // Remount on scene change
                  src={vSrc}
                  className={`absolute inset-0 w-full h-full object-cover ${videoEnded ? 'opacity-0' : 'opacity-100'}`}
                  style={{ objectPosition: `${activeScene.videoCropConfig?.x ?? 50}% center` }}
                  crossOrigin="anonymous"
                  playsInline
                  muted // Video is visual only, audio track handles sound
                  onEnded={handleMediaEnded}
                  onWaiting={() => {
                    setIsBuffering(true);
                    audioRef.current?.pause();
                  }}
                  onPlaying={() => {
                    setIsBuffering(false);
                    if (audioRef.current) {
                      // SYNC: Snap audio to video time
                      const diff = Math.abs(audioRef.current.currentTime - (videoRef.current?.currentTime || 0));
                      if (diff > 0.2) {
                        audioRef.current.currentTime = videoRef.current?.currentTime || 0;
                      }
                      audioRef.current.play().catch(() => { });
                    }
                  }}
                  onPause={() => {
                    audioRef.current?.pause();
                  }}
                  onTimeUpdate={(e) => {
                    // Video drives the UI progress
                    if (e.currentTarget.duration) {
                      const p = (e.currentTarget.currentTime / e.currentTarget.duration) * 100;
                      setProgress(p);
                      setCurrentTime(e.currentTarget.currentTime);
                    }
                    // Sync check every tick (optional, but good for drift)
                    if (audioRef.current && !audioRef.current.paused) {
                      const diff = Math.abs(audioRef.current.currentTime - e.currentTarget.currentTime);
                      if (diff > 0.3) {
                        audioRef.current.currentTime = e.currentTarget.currentTime;
                      }
                    }
                    // Simple Fade Logic
                    if (e.currentTarget.duration - e.currentTarget.currentTime < 0.5) {
                      setVideoEnded(true);
                    }
                  }}
                  onError={(e) => console.error("Video Error:", e.currentTarget.error)}
                />
              </>
            );
          } else {
            // Image Only
            return <img src={iSrc} className="w-full h-full object-cover animate-pulse-slow" />;
          }
        })()}

        {/* Audio Layer - Slave to Video (if video exists), Master if Image only */}
        {activeMedia.audioUrl && (
          <audio
            ref={audioRef}
            key={`aud-${currentSceneIndex}`} // Remount on scene change
            src={activeMedia.audioUrl}
            onEnded={() => {
              // If there is NO video, Audio end triggers scene change
              if (!activeMedia.videoUrl) handleMediaEnded();
            }}
            onTimeUpdate={(e) => {
              // If NO video, Audio drives UI progress
              if (!activeMedia.videoUrl && e.currentTarget.duration) {
                const p = (e.currentTarget.currentTime / e.currentTarget.duration) * 100;
                setProgress(p);
                setCurrentTime(e.currentTarget.currentTime);
              }
            }}
          />
        )}
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
                <button
                  onClick={() => setShowMobileTips(true)}
                  className="xl:hidden absolute -top-12 -right-4 p-3 bg-indigo-500 hover:bg-indigo-600 rounded-full transition-all shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-pulse z-50"
                  title={t('video_player.tips_title')}
                >
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                <h3 className="text-xl font-bold mb-2 text-white">{t('video_player.export_options')}</h3>
                <p className="text-xs text-slate-400 mb-6">{t('video_player.resolution_note')}</p>

                <div id="video-export-format" className="w-full max-w-sm mb-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
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

                <div id="video-export-resolution" className="w-full max-w-sm mb-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                  <label className="text-sm font-medium text-slate-300 block mb-3 text-left">{t('video_player.resolution')}</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExportResolution('1080p')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${exportResolution === '1080p'
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                        }`}
                    >
                      1080p (FHD)
                    </button>
                    <button
                      onClick={() => setExportResolution('720p')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${exportResolution === '720p'
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                        }`}
                    >
                      720p (HD)
                    </button>
                  </div>
                </div>

                <div id="video-export-fps" className="w-full max-w-sm mb-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
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

                <div id="video-export-merge" className="w-full max-w-sm mb-8 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
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
                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl font-semibold transition-colors text-sm"
                  >
                    {t('video_player.cancel')}
                  </button>
                  <button
                    id="btn-confirm-export"
                    onClick={confirmExport}
                    className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" />
                    {t('video_player.start_export')}
                  </button>
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

      {/* Export Tips Card (Desktop Only - Moved to Side) */}
      {showExportOptions && !isDownloading && (
        <div className="hidden xl:block absolute right-12 top-1/2 -translate-y-1/2 z-[60] w-80 animate-fade-in-up">
          <div className="bg-slate-900/95 backdrop-blur-md p-6 rounded-2xl border border-indigo-500/30 shadow-2xl ring-1 ring-white/10">
            <h4 className="text-lg font-bold text-indigo-300 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('video_player.tips_title')}
            </h4>
            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <div className="flex gap-3 items-start">
                <span className="text-indigo-400 flex-shrink-0 mt-0.5">⚡</span>
                <p>{t('video_player.tip_performance')}</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-indigo-400 flex-shrink-0 mt-0.5">🎬</span>
                <p>{t('video_player.tip_quality')}</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-indigo-400 flex-shrink-0 mt-0.5">📁</span>
                <p>{t('video_player.tip_format')}</p>
              </div>
              <div className="flex gap-3 items-start p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <span className="text-yellow-400 flex-shrink-0 mt-0.5">⚠️</span>
                <p className="text-yellow-100/90 font-medium">{t('video_player.tip_stay')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div id="video-controls" className="mt-8 flex items-center gap-2 sm:gap-6 bg-slate-900/50 backdrop-blur-xl border border-white/5 p-3 rounded-full shadow-2xl z-10">
        <button onClick={resetPlayback} className="p-3 text-slate-300 hover:text-white hover:bg-white/10 rounded-full"><SkipBack className="w-5 h-5" /></button>
        <button onClick={isPlaying ? pausePlayback : startPlayback} className="p-4 bg-white text-black hover:bg-slate-200 rounded-full transition-all transform hover:scale-105 shadow-lg shadow-white/10">{isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}</button>
        <button
          id="btn-video-export"
          onClick={() => {
            if (isMock) return; // Silent for tours
            handleDownloadClick();
          }}
          disabled={isDownloading}
          className={`p-3 rounded-full transition-colors flex items-center justify-center ${isDownloading ? 'text-slate-500 cursor-wait' : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10'}`}
          title={t('video_player.export_tooltip', 'Export Video')}
        >
          <Download className="w-5 h-5" />
        </button>

        {/* <button
          id="btn-video-schedule"
          onClick={() => {
            if (isMock) return;
            setShowScheduleModal(true);
            pausePlayback();
          }}
          className="p-3 rounded-full transition-colors flex items-center justify-center text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
          title={t('video_player.schedule_tooltip', 'Schedule Upload')}
        >
          <UploadCloud className="w-5 h-5" />
        </button> */}

        <div className="w-px h-6 bg-white/10 mx-1"></div>
        <button id="btn-toggle-subs" onClick={() => setShowSubtitles(!showSubtitles)} className={`p-3 rounded-full transition-colors ${showSubtitles ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>{showSubtitles ? <Captions className="w-5 h-5" /> : <CaptionsOff className="w-5 h-5" />}</button>

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

      <ScheduleUploadModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        preselectedMetadata={{ title: title }}
        onSuccess={() => {
          setShowScheduleModal(false);
          // Optionally guide user to Channels page
        }}
      />

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
