import { useState, useRef } from 'react';
import { Scene } from '../types';
import { getWordTimings, SubtitleLayout } from '../utils/videoUtils';
import { SUBTITLE_STYLES } from '../utils/styleConstants';
import * as Mp4Muxer from 'mp4-muxer';

interface UseVideoExportProps {
    scenes: Scene[];
    bgMusicUrl?: string;
    title?: string;
    endingVideoFile?: File | null;
    showSubtitles?: boolean;
}

export const useVideoExport = ({ scenes, bgMusicUrl, title, endingVideoFile, showSubtitles = true }: UseVideoExportProps) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState("");
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [eta, setEta] = useState<string | null>(null);
    const isDownloadingRef = useRef(false);

    const validScenes = scenes.filter(s => s.imageStatus === 'completed' && s.imageUrl);

    // --- Helpers ---
    const loadAudioBuffer = async (ctx: BaseAudioContext, url: string): Promise<AudioBuffer | null> => {
        try {
            const response = await fetch(getProxyUrl(url));
            const arrayBuffer = await response.arrayBuffer();
            return await ctx.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.warn("Audio load error", e);
            return null;
        }
    };

    const getProxyUrl = (url: string) => {
        // If it's already a data URI or local blob, return as is
        if (!url) return '';
        if (url.startsWith('data:') || url.startsWith('blob:')) return url;

        // Sanity check for bad env vars
        if (url.includes('undefined/')) {
            console.error("❌ Invalid Asset URL detected (env var missing?):", url);
        }



        // Use the API proxy to bypass CORS
        // Assuming VITE_API_URL is set, otherwise default to localhost:3333
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
        return `${apiUrl}/assets?url=${encodeURIComponent(url)}`;
    };

    const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = (err) => {
                console.warn(`❌ Failed to load image via proxy: ${url}`, err);
                console.log(`Attempted Src: ${img.src}`);

                // Fallback to direct load (sometimes CORS is fine)
                if (img.src.includes('/proxy?')) {
                    console.log("Retrying with direct URL...");
                    const directImg = new Image();
                    directImg.crossOrigin = "anonymous";
                    directImg.onload = () => resolve(directImg);
                    directImg.onerror = () => {
                        const fallback = new Image();
                        // 1x1 Transparent pixel
                        fallback.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
                        resolve(fallback);
                    };
                    directImg.src = url;
                    return;
                }

                const fallback = new Image();
                // 1x1 Transparent pixel
                fallback.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
                resolve(fallback);
            };
            img.src = getProxyUrl(url);
        });
    };

    const loadVideo = (url: string): Promise<HTMLVideoElement> => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.crossOrigin = "anonymous";
            video.src = getProxyUrl(url);
            video.muted = true;
            video.playsInline = true;
            video.preload = "auto";
            video.onloadedmetadata = () => resolve(video);
            video.onerror = () => reject(new Error(`Failed to load video: ${url}`));
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
            setEta("~150s");
            console.log(`Starting export with ${validScenes.length} valid scenes out of ${scenes.length} total.`);

            if (validScenes.length < scenes.length) {
                console.warn("Some scenes were skipped because they are not completed or missing images.");
                // Optional: You could alert the user here, but for now we just log.
            }

            const assets = await Promise.all(validScenes.map(async (s, index) => {
                const percent = Math.round((index / validScenes.length) * 20);
                setDownloadProgress(`Loading assets (${percent}%)...`);

                let img: HTMLImageElement | null = null;
                let video: HTMLVideoElement | null = null;
                let videoDuration = 0;
                let lastFrameImg: HTMLImageElement | null = null;

                const useVideo = (s.mediaType === 'video' || (!s.mediaType && s.videoUrl)) && s.videoUrl && s.videoStatus === 'completed';

                if (useVideo) {
                    try {
                        const videoUrl = s.videoUrl!;
                        // Fetch video as blob to ensure stable seeking and avoid network glitches/CORS during render
                        console.log(`Fetching video blob for scene ${s.sceneNumber}: ${videoUrl}`);
                        const response = await fetch(getProxyUrl(videoUrl));
                        if (!response.ok) throw new Error(`Video fetch failed: ${response.status}`);
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);

                        video = await loadVideo(blobUrl);
                        videoDuration = video.duration;
                        console.log(`Video loaded successfully for scene ${s.sceneNumber}, duration: ${videoDuration}s`);

                        // Capture last frame for freeze effect when narration is longer than video
                        video.currentTime = Math.max(0, videoDuration - 0.1);
                        await new Promise(resolve => {
                            video!.onseeked = () => resolve(null);
                        });

                        const canvas = document.createElement('canvas');
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(video, 0, 0);
                            lastFrameImg = await loadImage(canvas.toDataURL());
                        }

                        // Reset video to start
                        video.currentTime = 0;
                    } catch (e) {
                        console.warn(`Failed to load video for scene ${s.sceneNumber}, falling back to image`, e);
                        img = await loadImage(s.imageUrl!);
                    }
                } else {
                    img = await loadImage(s.imageUrl!);
                }

                let buffer: AudioBuffer | null = null;
                if (s.audioUrl) {
                    console.log(`Fetching audio for scene ${s.sceneNumber}: ${s.audioUrl}`);
                    buffer = await loadAudioBuffer(mainAudioCtx!, s.audioUrl);
                    if (!buffer) {
                        console.warn(`Failed to load audio for scene ${s.sceneNumber}: ${s.audioUrl}`);
                    } else {
                        console.log(`Audio loaded for scene ${s.sceneNumber}, duration: ${buffer.duration}s`);
                    }
                }

                // Use actual buffer duration if available, otherwise DB duration
                const dbDuration = Number(s.durationSeconds) || 0;
                const fallbackDuration = dbDuration > 0 ? dbDuration : 5;
                const realDuration = (buffer && Number.isFinite(buffer.duration)) ? buffer.duration : fallbackDuration;

                return { ...s, img, video, videoDuration, lastFrameImg, buffer, renderDuration: realDuration };
            }));

            // --- Asset Loading Summary ---
            const failedVideos = assets.filter(a => a.mediaType === 'video' && !a.video && a.videoUrl).map(a => a.sceneNumber);
            const failedImages = assets.filter(a => !a.img && !a.video).map(a => a.sceneNumber);
            const failedAudios = assets.filter(a => a.audioUrl && !a.buffer).map(a => a.sceneNumber);

            console.log("=== Asset Loading Summary ===");
            console.log(`Total Scenes: ${assets.length}`);
            if (failedVideos.length > 0) console.warn(`❌ Failed Videos (fallback to image): Scenes ${failedVideos.join(', ')}`);
            if (failedImages.length > 0) console.error(`❌ Failed Images (CRITICAL): Scenes ${failedImages.join(', ')}`);
            if (failedAudios.length > 0) console.warn(`❌ Failed Audios (silent): Scenes ${failedAudios.join(', ')}`);
            console.log("============================");

            let bgMusicBuffer: AudioBuffer | null = null;
            if (bgMusicUrl) {
                try { bgMusicBuffer = await loadAudioBuffer(mainAudioCtx, bgMusicUrl); } catch (e) { }
            }

            // Load Ending Video & Audio
            let endingVideoElement: HTMLVideoElement | null = null;
            let endingAudioBuffer: AudioBuffer | null = null;
            let endingVideoDuration = 0;

            if (endingVideoFile) {
                setDownloadProgress("Loading ending video...");

                // Load Video Element (for visuals)
                endingVideoElement = document.createElement('video');
                endingVideoElement.src = URL.createObjectURL(endingVideoFile);
                endingVideoElement.crossOrigin = "anonymous";
                endingVideoElement.muted = true; // We will play audio via WebAudio, not the element

                await new Promise((resolve) => {
                    endingVideoElement!.onloadedmetadata = () => {
                        endingVideoDuration = endingVideoElement!.duration;
                        resolve(null);
                    };
                    endingVideoElement!.onerror = () => {
                        console.warn("Failed to load ending video");
                        endingVideoElement = null;
                        resolve(null);
                    };
                });

                // Decode Ending Audio (for mixing)
                try {
                    const arrayBuffer = await endingVideoFile.arrayBuffer();
                    endingAudioBuffer = await mainAudioCtx.decodeAudioData(arrayBuffer);
                } catch (e) {
                    console.warn("Failed to decode ending audio track", e);
                }
            }

            // 4. PRE-RENDER AUDIO MIX (OfflineAudioContext)
            // This eliminates real-time CPU load glitches (pops/crackles)
            setDownloadProgress("Mixing audio...");

            const totalScenesDuration = assets.reduce((acc, s) => acc + s.renderDuration, 0);
            const totalDuration = totalScenesDuration + endingVideoDuration;

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

            // Schedule Ending Audio
            if (endingAudioBuffer) {
                const endingSource = offlineCtx.createBufferSource();
                endingSource.buffer = endingAudioBuffer;

                const endingGain = offlineCtx.createGain();
                endingGain.gain.value = 1.0;

                endingSource.connect(endingGain);
                endingGain.connect(masterGain);

                endingSource.start(totalScenesDuration);
            }

            // Render the mix
            const renderedAudioBuffer = await offlineCtx.startRendering();

            // 5. EXPORT BRANCHING
            if (format === 'mp4') {
                await exportMp4(canvas, ctx, assets, endingVideoElement, totalScenesDuration, totalDuration, renderedAudioBuffer, title);
            } else {
                await exportWebM(canvas, ctx, mainAudioCtx, assets, endingVideoElement, totalScenesDuration, totalDuration, renderedAudioBuffer, title);
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
        endingVideoElement: HTMLVideoElement | null,
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
            error: (e) => {
                console.error("VideoEncoder error", e);
                setDownloadError("Video encoding failed: " + e.message);
                isDownloadingRef.current = false;
            }
        });

        videoEncoder.configure({
            codec: 'avc1.4d0028', // H.264 Main Profile Level 4.0 (better quality)
            width: 1080,
            height: 1920,
            bitrate: 10_000_000, // 10 Mbps for better quality
            framerate: 30,
            hardwareAcceleration: 'prefer-hardware'
        });
        console.log("VideoEncoder configured");

        const audioEncoder = new AudioEncoder({
            output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
            error: (e) => {
                console.error("AudioEncoder error", e);
                setDownloadError("Audio encoding failed: " + e.message);
                isDownloadingRef.current = false;
            }
        });

        audioEncoder.configure({
            codec: 'mp4a.40.2', // AAC LC
            numberOfChannels: 2,
            sampleRate: 48000,
            bitrate: 192000 // 192 kbps for better audio quality
        });
        console.log("AudioEncoder configured");

        // Encode Audio
        setDownloadProgress("Encoding audio...");
        const numberOfChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length;
        const sampleRate = audioBuffer.sampleRate;
        console.log(`Encoding Audio: Channels=${numberOfChannels}, Length=${length}, Rate=${sampleRate}`);

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
        console.log("Audio encoding finished");

        // Encode Video
        const fps = 30;
        const frameDuration = 1 / fps;
        const totalFrames = Math.ceil(totalDuration * fps);
        const subtitleLayouts = precomputeSubtitleLayouts(ctx, assets, canvas.width);

        console.log(`Starting Video Encoding: Total Frames=${totalFrames}, Duration=${totalDuration}s`);

        for (let i = 0; i < totalFrames; i++) {
            if (!isDownloadingRef.current) {
                console.log("Export cancelled by user");
                break;
            }

            const time = i * frameDuration;
            if (i % 30 === 0) console.log(`Processing Frame ${i}/${totalFrames} (Time: ${time.toFixed(2)})`);

            setDownloadProgress(`Encoding video (${Math.round((i / totalFrames) * 100)}%)...`);

            // Draw Frame - videos will play naturally, no manual seeking needed
            try {
                drawFrame(ctx, canvas.width, canvas.height, time, assets, endingVideoElement, totalScenesDuration, subtitleLayouts);
            } catch (drawErr) {
                console.error(`Error drawing frame ${i}`, drawErr);
            }

            const frame = new VideoFrame(canvas, {
                timestamp: time * 1_000_000 // microseconds
            });

            videoEncoder.encode(frame, { keyFrame: i % 60 === 0 });
            frame.close();

            // Throttle encoding to prevent GPU crash / OOM
            if (videoEncoder.encodeQueueSize > 5) {
                await new Promise(r => setTimeout(r, 20));
            }

            // Small delay to allow video elements to render their next frame naturally
            // This is critical for smooth video playback without seek artifacts
            await new Promise(r => setTimeout(r, 0));
        }

        if (isDownloadingRef.current) {
            await videoEncoder.flush();
            muxer.finalize();
        }

        const { buffer } = muxer.target;
        saveFile(new Blob([buffer], { type: 'video/mp4' }), title, 'mp4');
    };

    // --- WebM Export Strategy (MediaRecorder) ---
    const exportWebM = async (
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        audioCtx: AudioContext,
        assets: any[],
        endingVideoElement: HTMLVideoElement | null,
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
        const subtitleLayouts = precomputeSubtitleLayouts(ctx, assets, canvas.width);

        const drawLoop = () => {
            if (!isDownloadingRef.current || recorder.state === 'inactive') return;

            const elapsedTime = (Date.now() - startTime) / 1000;
            if (elapsedTime >= totalDuration) {
                recorder.stop();
                return;
            }

            drawFrame(ctx, canvas.width, canvas.height, elapsedTime, assets, endingVideoElement, totalScenesDuration, subtitleLayouts);

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
        endingVideoElement: HTMLVideoElement | null,
        totalScenesDuration: number,
        subtitleLayouts: SubtitleLayout[]
    ) => {
        // Ending Phase
        if (time >= totalScenesDuration && endingVideoElement) {
            // For WebCodecs, we need to seek the video element if we want frame-perfect accuracy, 
            // but for simple playback, updating it in real-time or seeking works.
            // Since WebCodecs loop is async but fast, we should ideally seek the video element to `time - totalScenesDuration`.
            // However, seeking HTMLVideoElement is slow. 
            // For this implementation, we'll assume the video element can keep up or we seek it.
            const endingTime = time - totalScenesDuration;
            endingVideoElement.currentTime = endingTime;

            const vw = endingVideoElement.videoWidth;
            const vh = endingVideoElement.videoHeight;
            if (vw > 0 && vh > 0) {
                const scale = Math.max(w / vw, h / vh);
                const sw = vw * scale;
                const sh = vh * scale;
                const ox = (w - sw) / 2;
                const oy = (h - sh) / 2;
                ctx.drawImage(endingVideoElement, ox, oy, sw, sh);
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

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        // Determine if we should use video, frozen frame, or image
        const hasVideo = asset.video && asset.videoDuration > 0;
        const isVideoActive = hasVideo && timeInScene < asset.videoDuration;
        const isVideoFrozen = hasVideo && timeInScene >= asset.videoDuration;

        if (isVideoActive) {
            // Play video naturally (like the preview does) - no pan/zoom during video playback
            const videoTime = timeInScene;

            // Start playing if not already playing  
            if (asset.video.paused) {
                try {
                    asset.video.currentTime = videoTime;
                    asset.video.play().catch(e => console.warn("Video play failed", e));
                } catch (e) {
                    console.warn("Failed to start video", e);
                }
            }

            // Only seek if we're significantly off (>1s) - otherwise let it play naturally
            const currentVideoTime = asset.video.currentTime;
            const timeDiff = Math.abs(currentVideoTime - videoTime);

            if (timeDiff > 1.0) {
                try {
                    asset.video.currentTime = videoTime;
                } catch (e) {
                    console.warn("Failed to seek video", e);
                }
            }

            const vw = asset.video.videoWidth;
            const vh = asset.video.videoHeight;
            if (vw > 0 && vh > 0) {
                const scale = Math.max(w / vw, h / vh);
                const sw = vw * scale;
                const sh = vh * scale;
                const ox = (w - sw) / 2;
                const oy = (h - sh) / 2;
                ctx.drawImage(asset.video, ox, oy, sw, sh);
            }
        } else if (isVideoFrozen && asset.lastFrameImg) {
            // Video ended but narration continues: freeze last frame with pan/zoom
            const frozenTime = timeInScene - asset.videoDuration;
            const frozenDuration = asset.renderDuration - asset.videoDuration;
            const frozenProgress = frozenTime / frozenDuration;
            const scale = 1.0 + (0.15 * frozenProgress);

            const sw = w * scale;
            const sh = h * scale;
            const ox = (w - sw) / 2;
            const oy = (h - sh) / 2;
            ctx.drawImage(asset.lastFrameImg, ox, oy, sw, sh);
        } else if (asset.img) {
            // Static image with pan/zoom
            const scale = 1.0 + (0.15 * (timeInScene / asset.renderDuration));
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

        if (showSubtitles && layout) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = SUBTITLE_STYLES.shadowColor;
            ctx.shadowBlur = SUBTITLE_STYLES.shadowBlur;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = SUBTITLE_STYLES.shadowOffsetY;

            const timings = layout.timings;
            // Find active word time-based
            const activeWordObj = timings.find(t => timeInScene >= t.start && timeInScene < t.end);
            let activeIndex = activeWordObj ? timings.indexOf(activeWordObj) : -1;

            // Fallback logic for gaps
            if (activeIndex === -1) {
                if (timeInScene < (timings[0]?.start || 0)) {
                    activeIndex = 0;
                } else if (timeInScene > (timings[timings.length - 1]?.end || 0)) {
                    activeIndex = timings.length - 1;
                } else {
                    // Find next word
                    const nextIndex = timings.findIndex(t => t.start > timeInScene);
                    activeIndex = nextIndex !== -1 ? nextIndex : timings.length - 1;
                }
            }

            // --- FLUID MULTI-LINE LOGIC (Matches SubtitleOverlay.tsx) ---
            const WORDS_PER_PAGE = 7;
            const pageIndex = Math.floor(activeIndex / WORDS_PER_PAGE);

            const start = pageIndex * WORDS_PER_PAGE;
            const end = Math.min(start + WORDS_PER_PAGE, timings.length);
            const visibleWords = timings.slice(start, end);

            // Styling Constants
            const baseFontSize = SUBTITLE_STYLES.canvasFontSize;
            const activeScale = 1.1; // Reduced from 1.2
            const fontName = SUBTITLE_STYLES.fontFamily;
            const fontWeight = SUBTITLE_STYLES.fontWeight;
            const gap = 20;
            const maxWidth = w * 0.85;

            // 1. Measure words
            const wordMetrics = visibleWords.map((t, i) => {
                const absIndex = start + i;
                const isActive = absIndex === activeIndex;
                const scale = isActive ? activeScale : 1.0;
                // Measure with scale applied to get real bounding box needs
                ctx.font = `${fontWeight} ${baseFontSize * scale}px ${fontName}`;
                return {
                    word: t.word,
                    width: ctx.measureText(t.word).width,
                    isActive,
                    scale
                };
            });

            // 2. Wrap Lines
            const lines: { words: typeof wordMetrics, width: number }[] = [];
            let currentLine: typeof wordMetrics = [];
            let currentLineWidth = 0;

            wordMetrics.forEach(m => {
                const wordWidthWithGap = m.width + (currentLine.length > 0 ? gap : 0);

                if (currentLineWidth + wordWidthWithGap > maxWidth && currentLine.length > 0) {
                    lines.push({ words: currentLine, width: currentLineWidth });
                    currentLine = [m];
                    currentLineWidth = m.width;
                } else {
                    currentLine.push(m);
                    currentLineWidth += wordWidthWithGap;
                }
            });
            if (currentLine.length > 0) lines.push({ words: currentLine, width: currentLineWidth });

            // 3. Draw Lines
            // Center block vertically at bottom
            const lineHeight = baseFontSize * 1.5;
            const blockHeight = lines.length * lineHeight;
            let startY = h - 250 - (blockHeight / 2);

            lines.forEach((line) => {
                let currentX = (w - line.width) / 2;

                line.words.forEach(m => {
                    // Config Font
                    ctx.font = `${fontWeight} ${baseFontSize * m.scale}px ${fontName}`;

                    // Shadow (Standard, no glow)
                    ctx.shadowColor = 'rgba(0,0,0,0.8)';
                    ctx.shadowBlur = 4;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 4;

                    // Color
                    if (m.isActive) {
                        ctx.fillStyle = SUBTITLE_STYLES.activeColor;
                        ctx.globalAlpha = 1.0;
                    } else {
                        ctx.fillStyle = '#FFFFFF';
                        ctx.globalAlpha = 0.9;
                    }

                    const centerX = currentX + (m.width / 2);
                    ctx.fillText(m.word, centerX, startY);

                    currentX += m.width + gap;
                });

                startY += lineHeight;
            });
            ctx.globalAlpha = 1.0;
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
