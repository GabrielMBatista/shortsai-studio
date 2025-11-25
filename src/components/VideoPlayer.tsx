import React, { useState, useEffect, useRef } from 'react';
import { Scene } from '../types';
import { Play, Pause, SkipBack, X, Download, VolumeX, Volume2, Loader2, Captions, CaptionsOff } from 'lucide-react';

interface VideoPlayerProps {
  scenes: Scene[];
  onClose: () => void;
  bgMusicUrl?: string;
  projectTopic?: string;
}

interface SubtitleLayout {
    lines: string[][];
    timings: { word: string; start: number; end: number }[];
}

const getWordTimings = (text: string, totalDuration: number) => {
    const words = text.trim().split(/\s+/);
    if (words.length === 0) return [];
    const weights = words.map(word => {
        let weight = word.length;
        if (word.match(/[.,;!?]$/)) weight += 5; 
        if (word.match(/[.!?]$/)) weight += 5; 
        return weight;
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const timePerWeight = totalDuration / totalWeight;
    let currentTime = 0;
    return words.map((word, i) => {
        const duration = weights[i] * timePerWeight;
        const start = currentTime;
        currentTime += duration;
        return { word, start, end: currentTime };
    });
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({ scenes, onClose, bgMusicUrl, projectTopic = "shorts-ai-video" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");
  const [showSubtitles, setShowSubtitles] = useState(true);
  
  const validScenes = scenes.filter(s => s.imageStatus === 'completed' && s.imageUrl);
  
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  const activeScene = validScenes[currentSceneIndex];

  useEffect(() => {
    if (activeScene) durationRef.current = activeScene.durationSeconds * 1000;
  }, [currentSceneIndex, activeScene]);

  useEffect(() => {
    if (!audioRef.current || !activeScene) return;
    if (isPlaying && activeScene.audioUrl) {
        audioRef.current.src = activeScene.audioUrl;
        audioRef.current.currentTime = activeScene.durationSeconds > 0 ? (progress / 100) * activeScene.durationSeconds : 0;
        audioRef.current.play().catch(e => console.log("Narration play failed", e));
    } else {
        audioRef.current.pause();
    }
    if (bgMusicUrl && musicRef.current) {
        if (!musicRef.current.src || musicRef.current.src !== bgMusicUrl) {
             musicRef.current.src = bgMusicUrl;
             musicRef.current.loop = true;
             musicRef.current.volume = 0.15;
        }
        if (isPlaying) musicRef.current.play().catch(e => console.log("Music play failed", e));
        else musicRef.current.pause();
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

  const precomputeSubtitleLayouts = (ctx: CanvasRenderingContext2D, scenes: Scene[], canvasWidth: number): SubtitleLayout[] => {
      ctx.font = 'bold 54px Inter, sans-serif';
      return scenes.map(scene => {
          const timings = getWordTimings(scene.narration, scene.durationSeconds);
          const words = timings.map(t => t.word);
          const lines: string[][] = [];
          let currentLine: string[] = [];
          let currentWidth = 0;
          const maxWidth = canvasWidth - 160; // Increased padding
          words.forEach(word => {
               const width = ctx.measureText(word + ' ').width;
               if (currentWidth + width > maxWidth && currentLine.length > 0) {
                   lines.push(currentLine);
                   currentLine = [word];
                   currentWidth = width;
               } else {
                   currentLine.push(word);
                   currentWidth += width;
               }
          });
          if (currentLine.length > 0) lines.push(currentLine);
          return { lines, timings };
      });
  };

  const handleDownload = async () => {
    if (isDownloading || validScenes.length === 0) return;
    setIsDownloading(true);
    setDownloadProgress("Preparing assets...");
    pausePlayback(); 

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not create canvas context");

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      
      const loadAudioBuffer = async (url: string): Promise<AudioBuffer | null> => {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return await audioCtx.decodeAudioData(arrayBuffer);
        } catch (e) { return null; }
      };

      const loadImage = (url: string): Promise<HTMLImageElement> => {
          return new Promise((resolve) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = async () => {
                  try { await img.decode(); } catch (e) {}
                  resolve(img);
              };
              img.onerror = () => resolve(new Image()); 
              img.src = url;
          });
      };

      const assets = await Promise.all(validScenes.map(async (s, index) => {
          setDownloadProgress(`Loading Scene ${index + 1}...`);
          const img = await loadImage(s.imageUrl!);
          const buffer = s.audioUrl ? await loadAudioBuffer(s.audioUrl) : null;
          return { ...s, img, buffer };
      }));

      setDownloadProgress("Processing text layouts...");
      const subtitleLayouts = precomputeSubtitleLayouts(ctx, assets, canvas.width);

      let bgMusicBuffer: AudioBuffer | null = null;
      if (bgMusicUrl) {
          setDownloadProgress("Loading Music...");
          try { bgMusicBuffer = await loadAudioBuffer(bgMusicUrl); } catch (e) {}
      }

      const stream = canvas.captureStream(30);
      stream.addTrack(dest.stream.getAudioTracks()[0]);
      
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.start(1000); 
      
      const totalDuration = assets.reduce((acc, s) => acc + s.durationSeconds, 0);
      let audioTimeOffset = 0;
      assets.forEach(asset => {
          if (asset.buffer) {
              const source = audioCtx.createBufferSource();
              source.buffer = asset.buffer;
              source.connect(dest);
              source.start(audioCtx.currentTime + audioTimeOffset);
          }
          audioTimeOffset += asset.durationSeconds;
      });

      if (bgMusicBuffer) {
          const musicSource = audioCtx.createBufferSource();
          musicSource.buffer = bgMusicBuffer;
          musicSource.loop = true;
          const gainNode = audioCtx.createGain();
          gainNode.gain.value = 0.15;
          musicSource.connect(gainNode);
          gainNode.connect(dest);
          musicSource.start(audioCtx.currentTime);
          musicSource.stop(audioCtx.currentTime + totalDuration + 0.5);
      }

      let startTime = performance.now();
      
      const renderFrame = async () => {
        const now = performance.now();
        const elapsedTime = (now - startTime) / 1000;
        if (isDownloading) setDownloadProgress(`Rendering Video: ${Math.min(Math.round((elapsedTime / totalDuration) * 100), 99)}%`);

        if (elapsedTime >= totalDuration) {
           recorder.stop();
           setTimeout(() => audioCtx.close(), 200);
           return;
        }

        let currentSceneIdx = 0;
        let timeInScene = elapsedTime;
        let accumTime = 0;
        for (let i = 0; i < assets.length; i++) {
            if (elapsedTime < accumTime + assets[i].durationSeconds) {
                currentSceneIdx = i;
                timeInScene = elapsedTime - accumTime;
                break;
            }
            accumTime += assets[i].durationSeconds;
        }
        if (currentSceneIdx >= assets.length) currentSceneIdx = assets.length - 1;
        const asset = assets[currentSceneIdx];
        const layout = subtitleLayouts[currentSceneIdx];

        const scale = 1.0 + (0.15 * (timeInScene / asset.durationSeconds));
        const w = canvas.width;
        const h = canvas.height;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        
        const sw = w * scale;
        const sh = h * scale;
        const ox = (w - sw) / 2;
        const oy = (h - sh) / 2;
        ctx.drawImage(asset.img, ox, oy, sw, sh);
        
        const gradient = ctx.createLinearGradient(0, h * 0.5, 0, h);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        if (showSubtitles && layout) {
            ctx.font = 'bold 54px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.9)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 4;
            ctx.shadowOffsetY = 4;

            const timings = layout.timings;
            const lines = layout.lines;
            const activeWordObj = timings.find(t => timeInScene >= t.start && timeInScene < t.end);
            const activeIndex = activeWordObj ? timings.indexOf(activeWordObj) : -1;

            const lineHeight = 80;
            // Calculate total block height to position it nicely at the bottom
            const totalBlockHeight = lines.length * lineHeight;
            const startY = h - 250 - totalBlockHeight; 

            let wordGlobalIndex = 0;
            lines.forEach((line, lineIdx) => {
                const lineStr = line.join(' ');
                const lineWidth = ctx.measureText(lineStr).width;
                let x = (w - lineWidth) / 2;
                
                // Static Y Position based on line index within the block, not scrolling
                const y = startY + (lineIdx * lineHeight);

                line.forEach((word) => {
                     const isCurrent = wordGlobalIndex === activeIndex;
                     // Inactive words are transparent (0.25) to highlight active word
                     ctx.fillStyle = isCurrent ? '#facc15' : 'rgba(255,255,255,0.25)';
                     ctx.fillText(word, x + (ctx.measureText(word).width/2), y);
                     x += ctx.measureText(word + ' ').width;
                     wordGlobalIndex++;
                });
            });
        }
        requestAnimationFrame(renderFrame);
      };
      requestAnimationFrame(renderFrame);

      recorder.onstop = () => {
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          const safeTopic = projectTopic.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 50);
          a.href = url;
          a.download = `${safeTopic}.${ext}`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => { window.URL.revokeObjectURL(url); document.body.removeChild(a); }, 100);
          setIsDownloading(false);
          setDownloadProgress("");
      };
    } catch (err) {
        setIsDownloading(false);
        setDownloadProgress("");
        alert("Failed to generate video download.");
    }
  };

  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

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
  
  const timings = getWordTimings(activeScene.narration, activeScene.durationSeconds);
  const currentTimeInScene = (progress / 100) * activeScene.durationSeconds;
  const activeWordIndex = timings.findIndex(t => currentTimeInScene >= t.start && currentTimeInScene < t.end);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-3xl">
      <audio ref={audioRef} className="hidden" />
      <audio ref={musicRef} className="hidden" />
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
          <h2 className="text-white font-bold text-xl drop-shadow-md hidden md:block opacity-80">{projectTopic}</h2>
          <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/10"><X className="w-6 h-6" /></button>
      </div>
      <div className="relative w-full max-w-[420px] aspect-[9/16] bg-black rounded-[2.5rem] shadow-2xl overflow-hidden ring-4 ring-slate-800/50">
        <div className="absolute inset-0 overflow-hidden">
          <img key={activeScene.sceneNumber} src={activeScene.imageUrl} className={`w-full h-full object-cover transition-opacity duration-500 ${isPlaying ? 'animate-ken-burns' : ''}`} style={{ animationDuration: `${activeScene.durationSeconds + 2}s` }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />
        </div>
        {showSubtitles && (
            <div className="absolute bottom-24 left-0 right-0 p-6 text-center z-10 pointer-events-none">
            {/* 
                We render ALL words for the scene. 
                Flex-wrap handles line breaks naturally.
                No scrolling or positional shifts.
            */}
            <div className="text-white font-bold text-xl md:text-2xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] leading-normal flex flex-wrap justify-center gap-x-1.5 gap-y-1">
                {timings.map((t, i) => {
                    const isActive = i === activeWordIndex;
                    // Removed the visibility filtering to make the block static
                    return <span key={i} className={`transition-all duration-200 ${isActive ? 'text-yellow-400 scale-105 shadow-black opacity-100' : 'text-white/25 blur-[0px]'}`}>{t.word}</span>;
                })}
            </div>
            </div>
        )}
        <div className="absolute top-6 left-4 right-4 flex space-x-1.5 z-10">
           {validScenes.map((_, idx) => (
             <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
               <div className={`h-full bg-white shadow-[0_0_10px_white] transition-all duration-75 ${idx < currentSceneIndex ? 'w-full' : idx === currentSceneIndex ? '' : 'w-0'}`} style={{ width: idx === currentSceneIndex ? `${progress}%` : undefined }} />
             </div>
           ))}
        </div>
        {isDownloading && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center animate-fade-in-up">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
                <h3 className="text-xl font-bold mb-2">Rendering Video</h3>
                <p className="text-slate-300 text-sm">{downloadProgress}</p>
                <div className="mt-4 w-48 h-1 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 animate-pulse w-full"></div></div>
            </div>
        )}
      </div>
      <div className="mt-8 flex items-center gap-6 bg-slate-900/50 backdrop-blur-xl border border-white/5 p-3 rounded-full shadow-2xl z-10">
        <button onClick={resetPlayback} className="p-3 text-slate-300 hover:text-white hover:bg-white/10 rounded-full"><SkipBack className="w-5 h-5" /></button>
        <button onClick={isPlaying ? pausePlayback : startPlayback} className="p-4 bg-white text-black hover:bg-slate-200 rounded-full transition-all transform hover:scale-105 shadow-lg shadow-white/10">{isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}</button>
        <button onClick={handleDownload} disabled={isDownloading} className={`p-3 rounded-full transition-colors flex items-center justify-center ${isDownloading ? 'text-slate-500 cursor-wait' : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10'}`}><Download className="w-5 h-5" /></button>
        <div className="w-px h-6 bg-white/10 mx-1"></div>
        <button onClick={() => setShowSubtitles(!showSubtitles)} className={`p-3 rounded-full transition-colors ${showSubtitles ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>{showSubtitles ? <Captions className="w-5 h-5" /> : <CaptionsOff className="w-5 h-5" />}</button>
        <div className={`p-3 transition-colors ${activeScene.audioUrl ? 'text-white' : 'text-slate-600'}`}>{activeScene.audioUrl ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}</div>
      </div>
    </div>
  );
};

export default VideoPlayer;