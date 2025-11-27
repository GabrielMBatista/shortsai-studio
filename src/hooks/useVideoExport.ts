
import { useState, useRef } from 'react';
import { Scene } from '../types';
import { getWordTimings, SubtitleLayout } from '../utils/videoUtils';
import { SUBTITLE_STYLES } from '../utils/styleConstants';

interface UseVideoExportProps {
    scenes: Scene[];
    bgMusicUrl?: string;
    title?: string;
}

export const useVideoExport = ({ scenes, bgMusicUrl, title }: UseVideoExportProps) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState("");
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [eta, setEta] = useState<string | null>(null);
    const isDownloadingRef = useRef(false);
    
    const validScenes = scenes.filter(s => s.imageStatus === 'completed' && s.imageUrl);

    // --- Helpers ---
    const loadAudioBuffer = async (ctx: BaseAudioContext, url: string): Promise<AudioBuffer | null> => {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return await ctx.decodeAudioData(arrayBuffer);
        } catch (e) { 
            console.warn("Audio load error", e);
            return null; 
        }
    };

    const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => {
                const fallback = new Image();
                // 1x1 Transparent pixel
                fallback.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
                resolve(fallback);
            };
            img.src = url;
        });
    };

    const precomputeSubtitleLayouts = (ctx: CanvasRenderingContext2D, scenes: any[], canvasWidth: number): SubtitleLayout[] => {
        // Use shared font style
        ctx.font = `${SUBTITLE_STYLES.fontWeight} ${SUBTITLE_STYLES.canvasFontSize}px ${SUBTITLE_STYLES.fontFamily}`;
        
        return scenes.map(scene => {
            const duration = scene.durationSeconds || 5;
            const timings = getWordTimings(scene.narration, duration);
            const words = timings.map(t => t.word);
            const lines: string[][] = [];
            let currentLine: string[] = [];
            let currentWidth = 0;
            const maxWidth = canvasWidth - 160; 
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

    const startExport = async () => {
        if (isDownloadingRef.current || validScenes.length === 0) return;
        
        setIsDownloading(true);
        setDownloadError(null);
        setEta("calculating...");
        isDownloadingRef.current = true;
        setDownloadProgress("Loading assets (0%)...");
        
        await new Promise(r => setTimeout(r, 100)); // UI Breath

        let mainAudioCtx: AudioContext | null = null;
        let recorder: MediaRecorder | null = null;
        let animationFrameId: number;
        let lastProgressUpdate = 0;

        try {
            // 1. Setup Canvas (High Quality)
            const canvas = document.createElement('canvas');
            canvas.width = 1080;
            canvas.height = 1920;
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) throw new Error("Could not create canvas context");

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1080, 1920);

            // 2. Audio Context (Real-time with Safety Graph)
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            mainAudioCtx = new AudioContextClass(); // Use native sample rate to avoid resampling artifacts
            
            // Create a virtual destination stream
            const dest = mainAudioCtx.createMediaStreamDestination();

            // AUDIO GRAPH: Sources -> FadeGain -> MasterGain -> Compressor -> Destination
            // This structure prevents clipping and ensures smooth transitions
            const compressor = mainAudioCtx.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-2, mainAudioCtx.currentTime);
            compressor.knee.setValueAtTime(40, mainAudioCtx.currentTime);
            compressor.ratio.setValueAtTime(12, mainAudioCtx.currentTime);
            compressor.attack.setValueAtTime(0, mainAudioCtx.currentTime);
            compressor.release.setValueAtTime(0.25, mainAudioCtx.currentTime);

            const masterGain = mainAudioCtx.createGain();
            masterGain.gain.value = 0.8; // Headroom to prevent clipping when mixing music + voice
            
            masterGain.connect(compressor);
            compressor.connect(dest);

            // 3. Load Assets
            setEta("~15s");
            const assets = await Promise.all(validScenes.map(async (s, index) => {
                const percent = Math.round((index / validScenes.length) * 20);
                setDownloadProgress(`Loading assets (${percent}%)...`);
                
                const img = await loadImage(s.imageUrl!);
                let buffer: AudioBuffer | null = null;
                if (s.audioUrl) buffer = await loadAudioBuffer(mainAudioCtx!, s.audioUrl);
                
                // Use actual buffer duration if available, otherwise DB duration
                const fallbackDuration = Number(s.durationSeconds) || 5;
                const realDuration = (buffer && Number.isFinite(buffer.duration)) ? buffer.duration : fallbackDuration;
                
                return { ...s, img, buffer, renderDuration: realDuration };
            }));

            let bgMusicBuffer: AudioBuffer | null = null;
            if (bgMusicUrl) {
                try { bgMusicBuffer = await loadAudioBuffer(mainAudioCtx, bgMusicUrl); } catch (e) {}
            }

            // 4. Schedule Audio (The "Live" Mix with Micro-Fades)
            setDownloadProgress("Scheduling audio timeline...");
            
            const totalDuration = assets.reduce((acc, s) => acc + s.renderDuration, 0);
            const startTime = mainAudioCtx.currentTime + 0.2; // Small buffer before start
            let currentAudioTime = startTime;

            // Schedule Narrations with Anti-Pop Fades
            assets.forEach(asset => {
                if (asset.buffer) {
                    const source = mainAudioCtx!.createBufferSource();
                    source.buffer = asset.buffer;
                    
                    // Individual gain for micro-fades
                    const clipGain = mainAudioCtx!.createGain();
                    source.connect(clipGain);
                    clipGain.connect(masterGain);

                    const startT = currentAudioTime;
                    const duration = asset.renderDuration;
                    const endT = startT + duration;
                    const fadeTime = 0.005; // 5ms fade to avoid zero-crossing pops

                    source.start(startT);

                    // Fade In
                    clipGain.gain.setValueAtTime(0, startT);
                    clipGain.gain.linearRampToValueAtTime(1, startT + fadeTime);
                    
                    // Fade Out
                    clipGain.gain.setValueAtTime(1, endT - fadeTime);
                    clipGain.gain.linearRampToValueAtTime(0, endT);
                }
                currentAudioTime += asset.renderDuration;
            });

            // Schedule Background Music
            if (bgMusicBuffer) {
                const musicSource = mainAudioCtx.createBufferSource();
                musicSource.buffer = bgMusicBuffer;
                musicSource.loop = true;
                
                const musicGain = mainAudioCtx.createGain();
                musicGain.gain.value = 0.12; // Subtle background
                
                musicSource.connect(musicGain);
                musicGain.connect(masterGain);
                
                musicSource.start(startTime);
                // Stop music with a fade out at the end
                const musicEnd = startTime + totalDuration;
                musicGain.gain.setValueAtTime(0.12, musicEnd - 1.0);
                musicGain.gain.linearRampToValueAtTime(0, musicEnd);
                musicSource.stop(musicEnd + 0.5);
            }

            // 5. Recorder Setup
            const stream = canvas.captureStream(30); // 30 FPS video
            
            // Add the "Live" audio track from our mix
            const audioTrack = dest.stream.getAudioTracks()[0];
            if (audioTrack) stream.addTrack(audioTrack);

            // Prioritize VP9/Opus for best sync and quality
            const mimeTypes = [
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=h264,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm',
                'video/mp4'
            ];
            const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';

            recorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 6000000, // 6 Mbps (Reduced slightly for stability)
                audioBitsPerSecond: 192000   // 192 Kbps Opus
            });

            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
            
            recorder.onerror = (e: any) => {
                if (isDownloadingRef.current) setDownloadError("Encoding failed: " + (e.error?.message || "Unknown"));
            };

            recorder.onstop = () => {
                if (!isDownloadingRef.current) return;
                try {
                    const blob = new Blob(chunks, { type: mimeType });
                    const url = URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
                    const safeTitle = (title || 'video').replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 50);
                    a.href = url;
                    a.download = `${safeTitle}.${ext}`;
                    document.body.appendChild(a);
                    a.click();
                    
                    setTimeout(() => { 
                        window.URL.revokeObjectURL(url); 
                        document.body.removeChild(a); 
                    }, 1000);

                    setIsDownloading(false);
                    setDownloadProgress("");
                    setEta(null);
                } catch (e: any) {
                    setDownloadError(e.message || "Failed to save file.");
                } finally {
                    if (mainAudioCtx && mainAudioCtx.state !== 'closed') mainAudioCtx.close();
                    isDownloadingRef.current = false;
                }
            };

            // 6. Start Recording & Rendering
            recorder.start(1000); // 1s chunks
            const recordingStartTime = Date.now();
            
            // Precompute Text Layouts
            const syncedScenes = assets.map(a => ({...a, durationSeconds: a.renderDuration}));
            const subtitleLayouts = precomputeSubtitleLayouts(ctx, syncedScenes, canvas.width);

            const draw = () => {
                if (!isDownloadingRef.current) return;

                const now = mainAudioCtx!.currentTime;
                // Sync video time to audio time (Master Clock)
                const elapsedTime = Math.max(0, now - startTime);
                
                // Progress UI
                const realTimeNow = Date.now();
                if (realTimeNow - lastProgressUpdate > 200) {
                    const pct = Math.min((elapsedTime / totalDuration), 0.99);
                    const renderProgress = Math.round(pct * 100);
                    setDownloadProgress(`Rendering video (${renderProgress}%)...`);
                    
                    if (pct > 0.1) {
                        const elapsedMs = realTimeNow - recordingStartTime;
                        const totalMs = elapsedMs / pct;
                        const remainSec = Math.ceil((totalMs - elapsedMs) / 1000);
                        setEta(remainSec < 60 ? `~${remainSec}s` : `~${Math.floor(remainSec/60)}m ${remainSec%60}s`);
                    }
                    lastProgressUpdate = realTimeNow;
                }

                // End Condition
                if (elapsedTime >= totalDuration + 0.1) {
                    if (recorder && recorder.state === 'recording') recorder.stop();
                    return;
                }

                // Determine Current Scene
                let currentSceneIdx = 0;
                let accumTime = 0;
                let timeInScene = 0;
                
                for (let i = 0; i < assets.length; i++) {
                    if (elapsedTime < accumTime + assets[i].renderDuration) {
                        currentSceneIdx = i;
                        timeInScene = elapsedTime - accumTime;
                        break;
                    }
                    accumTime += assets[i].renderDuration;
                }
                
                // Safety clamp
                if (currentSceneIdx >= assets.length) {
                    currentSceneIdx = assets.length - 1;
                    timeInScene = assets[currentSceneIdx].renderDuration;
                }

                const asset = assets[currentSceneIdx];
                const layout = subtitleLayouts[currentSceneIdx];

                // --- Drawing ---
                const w = canvas.width;
                const h = canvas.height;
                
                // Ken Burns Effect
                const scale = 1.0 + (0.15 * (timeInScene / asset.renderDuration));
                
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, w, h);
                
                if (asset.img) {
                    const sw = w * scale;
                    const sh = h * scale;
                    const ox = (w - sw) / 2;
                    const oy = (h - sh) / 2;
                    ctx.drawImage(asset.img, ox, oy, sw, sh);
                }
                
                // Gradient Overlay
                // We use a linear gradient from transparent (top) to black (bottom)
                // Using explicit rgba(0,0,0,0) ensures clean blending in Canvas
                const gradient = ctx.createLinearGradient(0, h * 0.4, 0, h);
                gradient.addColorStop(0, 'rgba(0,0,0,0)');
                gradient.addColorStop(0.3, 'rgba(0,0,0,0)');
                gradient.addColorStop(0.7, 'rgba(0,0,0,0.6)');
                gradient.addColorStop(1, 'rgba(0,0,0,0.95)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, w, h);

                // Subtitles
                if (layout) {
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    // Match the shared constants
                    ctx.shadowColor = SUBTITLE_STYLES.shadowColor;
                    ctx.shadowBlur = SUBTITLE_STYLES.shadowBlur;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = SUBTITLE_STYLES.shadowOffsetY;

                    const timings = layout.timings;
                    const lines = layout.lines;
                    const activeWordObj = timings.find(t => timeInScene >= t.start && timeInScene < t.end);
                    const activeIndex = activeWordObj ? timings.indexOf(activeWordObj) : -1;

                    const lineHeight = 80;
                    const totalBlockHeight = lines.length * lineHeight;
                    const startY = h - 200 - totalBlockHeight; 

                    let wordGlobalIndex = 0;
                    lines.forEach((line, lineIdx) => {
                        const lineStr = line.join(' ');
                        const lineWidth = ctx.measureText(lineStr).width;
                        let x = (w - lineWidth) / 2;
                        const y = startY + (lineIdx * lineHeight);

                        line.forEach((word) => {
                            const isCurrent = wordGlobalIndex === activeIndex;
                            // Re-apply font to ensure weight is correct if changed elsewhere (safety)
                            ctx.font = isCurrent 
                                ? `${SUBTITLE_STYLES.fontWeight} 58px ${SUBTITLE_STYLES.fontFamily}` 
                                : `${SUBTITLE_STYLES.fontWeight} ${SUBTITLE_STYLES.canvasFontSize}px ${SUBTITLE_STYLES.fontFamily}`;
                            
                            // Highlight active word
                            ctx.fillStyle = isCurrent ? SUBTITLE_STYLES.activeColor : SUBTITLE_STYLES.inactiveColor;
                            
                            ctx.fillText(word, x + (ctx.measureText(word).width/2), y);
                            x += ctx.measureText(word + ' ').width;
                            wordGlobalIndex++;
                        });
                    });
                }

                animationFrameId = requestAnimationFrame(draw);
            };

            animationFrameId = requestAnimationFrame(draw);

        } catch (err: any) {
            console.error("Export error", err);
            setDownloadError(err.message || "Unknown error");
            if (mainAudioCtx && mainAudioCtx.state !== 'closed') mainAudioCtx.close();
            isDownloadingRef.current = false;
        }
    };

    const cancelExport = () => {
         setIsDownloading(false);
         setDownloadError(null);
         setEta(null);
         isDownloadingRef.current = false;
    };

    return {
        startExport,
        cancelExport,
        isDownloading,
        downloadProgress,
        downloadError,
        eta
    };
};
