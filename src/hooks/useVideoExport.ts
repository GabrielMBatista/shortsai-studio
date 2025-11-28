import { useState, useRef } from 'react';
import { Scene } from '../types';
import { getWordTimings, SubtitleLayout } from '../utils/videoUtils';
import { SUBTITLE_STYLES } from '../utils/styleConstants';
import * as Mp4Muxer from 'mp4-muxer';

interface UseVideoExportProps {
    scenes: Scene[];
    bgMusicUrl?: string;
    title?: string;
    outroFile?: File | null;
}

export const useVideoExport = ({ scenes, bgMusicUrl, title, outroFile }: UseVideoExportProps) => {
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
            const timings = getWordTimings(scene.narration, duration, scene.wordTimings);
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

    const startExport = async (format: 'mp4' | 'webm' = 'mp4') => {
        if (isDownloadingRef.current || validScenes.length === 0) return;

        setIsDownloading(true);
        setDownloadError(null);
        setEta("calculating...");
        isDownloadingRef.current = true;
        setDownloadProgress("Loading assets (0%)...");

        await new Promise(r => setTimeout(r, 100)); // UI Breath

        let mainAudioCtx: AudioContext | null = null;

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

            // 2. Audio Context (For decoding and final playback)
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            // Force 48kHz to match video standards
            mainAudioCtx = new AudioContextClass({ sampleRate: 48000 });

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
                try { bgMusicBuffer = await loadAudioBuffer(mainAudioCtx, bgMusicUrl); } catch (e) { }
            }

            // Load Outro Video & Audio
            let outroElement: HTMLVideoElement | null = null;
            let outroBuffer: AudioBuffer | null = null;
            let outroDuration = 0;

            if (outroFile) {
                setDownloadProgress("Loading outro video...");

                // Load Video Element (for visuals)
                outroElement = document.createElement('video');
                outroElement.src = URL.createObjectURL(outroFile);
                outroElement.crossOrigin = "anonymous";
                outroElement.muted = true; // We will play audio via WebAudio, not the element

                await new Promise((resolve) => {
                    outroElement!.onloadedmetadata = () => {
                        outroDuration = outroElement!.duration;
                        resolve(null);
                    };
                    outroElement!.onerror = () => {
                        console.warn("Failed to load outro video");
                        outroElement = null;
                        resolve(null);
                    };
                });

                // Decode Outro Audio (for mixing)
                try {
                    const arrayBuffer = await outroFile.arrayBuffer();
                    outroBuffer = await mainAudioCtx.decodeAudioData(arrayBuffer);
                } catch (e) {
                    console.warn("Failed to decode outro audio track", e);
                }
            }

            // 4. PRE-RENDER AUDIO MIX (OfflineAudioContext)
            // This eliminates real-time CPU load glitches (pops/crackles)
            setDownloadProgress("Mixing audio...");

            const totalScenesDuration = assets.reduce((acc, s) => acc + s.renderDuration, 0);
            const totalDuration = totalScenesDuration + outroDuration;

            // Create Offline Context
            const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * 48000), 48000);

            // Re-create the Audio Graph in Offline Context
            const compressor = offlineCtx.createDynamicsCompressor();
            compressor.threshold.value = -12;
            compressor.knee.value = 30;
            compressor.ratio.value = 12;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;

            const masterGain = offlineCtx.createGain();
            masterGain.gain.value = 0.9;

            masterGain.connect(compressor);
            compressor.connect(offlineCtx.destination);

            let currentAudioTime = 0; // Start at 0 in the offline buffer

            // Schedule Narrations
            assets.forEach(asset => {
                if (asset.buffer) {
                    const source = offlineCtx.createBufferSource();
                    source.buffer = asset.buffer;

                    const clipGain = offlineCtx.createGain();
                    source.connect(clipGain);
                    clipGain.connect(masterGain);

                    const startT = currentAudioTime;
                    const duration = asset.renderDuration;
                    const endT = startT + duration;
                    const fadeTime = 0.01;

                    source.start(startT);
                    clipGain.gain.setValueAtTime(0, startT);
                    clipGain.gain.linearRampToValueAtTime(1, startT + fadeTime);
                    clipGain.gain.setValueAtTime(1, endT - fadeTime);
                    clipGain.gain.linearRampToValueAtTime(0, endT);
                }
                currentAudioTime += asset.renderDuration;
            });

            // Schedule Background Music
            if (bgMusicBuffer) {
                const musicSource = offlineCtx.createBufferSource();
                musicSource.buffer = bgMusicBuffer;
                musicSource.loop = true;

                const musicGain = offlineCtx.createGain();
                musicGain.gain.value = 0.12;

                musicSource.connect(musicGain);
                musicGain.connect(masterGain);

                musicSource.start(0);
                const musicEnd = totalScenesDuration;
                musicGain.gain.setValueAtTime(0.12, musicEnd - 1.0);
                musicGain.gain.linearRampToValueAtTime(0, musicEnd);
                musicSource.stop(musicEnd + 0.5);
            }

            // Schedule Outro Audio
            if (outroBuffer) {
                const outroSource = offlineCtx.createBufferSource();
                outroSource.buffer = outroBuffer;

                const outroGain = offlineCtx.createGain();
                outroGain.gain.value = 1.0;

                outroSource.connect(outroGain);
                outroGain.connect(masterGain);

                outroSource.start(totalScenesDuration);
            }

            // Render the mix
            const renderedAudioBuffer = await offlineCtx.startRendering();

            // 5. EXPORT BRANCHING
            if (format === 'mp4') {
                await exportMp4(canvas, ctx, assets, outroElement, totalScenesDuration, totalDuration, renderedAudioBuffer, title);
            } else {
                await exportWebM(canvas, ctx, mainAudioCtx, assets, outroElement, totalScenesDuration, totalDuration, renderedAudioBuffer, title);
            }

        } catch (err: any) {
            console.error("Export error", err);
            setDownloadError(err.message || "Unknown error");
        } finally {
            if (mainAudioCtx && mainAudioCtx.state !== 'closed') mainAudioCtx.close();
            isDownloadingRef.current = false;
            setIsDownloading(false);
            setDownloadProgress("");
            setEta(null);
        }
    };

    // --- MP4 Export Strategy (WebCodecs + mp4-muxer) ---
    const exportMp4 = async (
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        assets: any[],
        outroElement: HTMLVideoElement | null,
        totalScenesDuration: number,
        totalDuration: number,
        audioBuffer: AudioBuffer,
        title?: string
    ) => {
        const muxer = new Mp4Muxer.Muxer({
            target: new Mp4Muxer.ArrayBufferTarget(),
            video: {
                codec: 'avc',
                width: 1080,
                height: 1920
            },
            audio: {
                codec: 'aac',
                numberOfChannels: 2,
                sampleRate: 48000
            },
            fastStart: 'in-memory'
        });

        const videoEncoder = new VideoEncoder({
            output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
            error: (e) => console.error("VideoEncoder error", e)
        });

        videoEncoder.configure({
            codec: 'avc1.42002A', // H.264 Baseline Profile Level 4.2
            width: 1080,
            height: 1920,
            bitrate: 6_000_000, // 6 Mbps
            framerate: 30
        });

        const audioEncoder = new AudioEncoder({
            output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
            error: (e) => console.error("AudioEncoder error", e)
        });

        audioEncoder.configure({
            codec: 'mp4a.40.2', // AAC LC
            numberOfChannels: 2,
            sampleRate: 48000,
            bitrate: 128000
        });

        // Encode Audio
        setDownloadProgress("Encoding audio...");
        const numberOfChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length;
        const sampleRate = audioBuffer.sampleRate;

        // Interleave audio data for AudioData
        const interleaved = new Float32Array(length * numberOfChannels);
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                interleaved[i * numberOfChannels + channel] = channelData[i];
            }
        }

        // Chunk audio into 1s segments for encoding
        const chunkSize = sampleRate; // 1 second of samples
        for (let i = 0; i < length; i += chunkSize) {
            const end = Math.min(i + chunkSize, length);
            const frameCount = end - i;
            const chunkData = interleaved.slice(i * numberOfChannels, end * numberOfChannels);

            const audioData = new AudioData({
                format: 'f32',
                sampleRate: sampleRate,
                numberOfFrames: frameCount,
                numberOfChannels: numberOfChannels,
                timestamp: (i / sampleRate) * 1_000_000, // microseconds
                data: chunkData
            });

            audioEncoder.encode(audioData);
            audioData.close();
        }
        await audioEncoder.flush();

        // Encode Video
        const fps = 30;
        const frameDuration = 1 / fps;
        const totalFrames = Math.ceil(totalDuration * fps);
        const subtitleLayouts = precomputeSubtitleLayouts(ctx, assets.map(a => ({ ...a, durationSeconds: a.renderDuration })), canvas.width);

        for (let i = 0; i < totalFrames; i++) {
            if (!isDownloadingRef.current) break;

            const time = i * frameDuration;
            setDownloadProgress(`Encoding video (${Math.round((i / totalFrames) * 100)}%)...`);

            // Draw Frame
            drawFrame(ctx, canvas.width, canvas.height, time, assets, outroElement, totalScenesDuration, subtitleLayouts);

            const frame = new VideoFrame(canvas, {
                timestamp: time * 1_000_000 // microseconds
            });

            videoEncoder.encode(frame, { keyFrame: i % 60 === 0 });
            frame.close();

            // Yield to event loop every few frames to keep UI responsive
            if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));
        }

        await videoEncoder.flush();
        muxer.finalize();

        const { buffer } = muxer.target;
        saveFile(new Blob([buffer], { type: 'video/mp4' }), title, 'mp4');
    };

    // --- WebM Export Strategy (MediaRecorder) ---
    const exportWebM = async (
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        audioCtx: AudioContext,
        assets: any[],
        outroElement: HTMLVideoElement | null,
        totalScenesDuration: number,
        totalDuration: number,
        audioBuffer: AudioBuffer,
        title?: string
    ) => {
        const dest = audioCtx.createMediaStreamDestination();
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(dest);

        const stream = canvas.captureStream(30);
        const audioTrack = dest.stream.getAudioTracks()[0];
        if (audioTrack) stream.addTrack(audioTrack);

        const recorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9,opus',
            videoBitsPerSecond: 6000000,
            audioBitsPerSecond: 128000
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

        const finished = new Promise<void>((resolve) => {
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                saveFile(blob, title, 'webm');
                resolve();
            };
        });

        recorder.start(1000);
        source.start(0);

        const startTime = Date.now();
        const subtitleLayouts = precomputeSubtitleLayouts(ctx, assets.map(a => ({ ...a, durationSeconds: a.renderDuration })), canvas.width);

        const drawLoop = () => {
            if (!isDownloadingRef.current || recorder.state === 'inactive') return;

            const elapsedTime = (Date.now() - startTime) / 1000;
            if (elapsedTime >= totalDuration) {
                recorder.stop();
                return;
            }

            drawFrame(ctx, canvas.width, canvas.height, elapsedTime, assets, outroElement, totalScenesDuration, subtitleLayouts);

            setDownloadProgress(`Rendering (${Math.round((elapsedTime / totalDuration) * 100)}%)...`);
            requestAnimationFrame(drawLoop);
        };

        drawLoop();
        await finished;
    };

    // --- Shared Drawing Logic ---
    const drawFrame = (
        ctx: CanvasRenderingContext2D,
        w: number,
        h: number,
        time: number,
        assets: any[],
        outroElement: HTMLVideoElement | null,
        totalScenesDuration: number,
        subtitleLayouts: SubtitleLayout[]
    ) => {
        // Outro Phase
        if (time >= totalScenesDuration && outroElement) {
            // For WebCodecs, we need to seek the video element if we want frame-perfect accuracy, 
            // but for simple playback, updating it in real-time or seeking works.
            // Since WebCodecs loop is async but fast, we should ideally seek the video element to `time - totalScenesDuration`.
            // However, seeking HTMLVideoElement is slow. 
            // For this implementation, we'll assume the video element can keep up or we seek it.
            const outroTime = time - totalScenesDuration;
            outroElement.currentTime = outroTime;

            const vw = outroElement.videoWidth;
            const vh = outroElement.videoHeight;
            if (vw > 0 && vh > 0) {
                const scale = Math.max(w / vw, h / vh);
                const sw = vw * scale;
                const sh = vh * scale;
                const ox = (w - sw) / 2;
                const oy = (h - sh) / 2;
                ctx.drawImage(outroElement, ox, oy, sw, sh);
            } else {
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, w, h);
            }
            return;
        }

        // Scenes Phase
        let currentSceneIdx = 0;
        let accumTime = 0;
        let timeInScene = 0;

        for (let i = 0; i < assets.length; i++) {
            if (time < accumTime + assets[i].renderDuration) {
                currentSceneIdx = i;
                timeInScene = time - accumTime;
                break;
            }
            accumTime += assets[i].renderDuration;
        }

        if (currentSceneIdx >= assets.length) {
            currentSceneIdx = assets.length - 1;
            timeInScene = assets[currentSceneIdx].renderDuration;
        }

        const asset = assets[currentSceneIdx];
        const layout = subtitleLayouts[currentSceneIdx];
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

        const gradient = ctx.createLinearGradient(0, h * 0.4, 0, h);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.3, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.7, 'rgba(0,0,0,0.6)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        if (layout) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
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
                    ctx.font = isCurrent
                        ? `${SUBTITLE_STYLES.fontWeight} 58px ${SUBTITLE_STYLES.fontFamily}`
                        : `${SUBTITLE_STYLES.fontWeight} ${SUBTITLE_STYLES.canvasFontSize}px ${SUBTITLE_STYLES.fontFamily}`;

                    ctx.fillStyle = isCurrent ? SUBTITLE_STYLES.activeColor : SUBTITLE_STYLES.inactiveColor;
                    ctx.fillText(word, x + (ctx.measureText(word).width / 2), y);
                    x += ctx.measureText(word + ' ').width;
                    wordGlobalIndex++;
                });
            });
        }
    };

    const saveFile = (blob: Blob, title: string | undefined, ext: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        const safeTitle = (title || 'video').replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 50);
        a.href = url;
        a.download = `${safeTitle}.${ext}`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 1000);
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
