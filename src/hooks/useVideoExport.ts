import { useState, useRef } from 'react';
import { Scene } from '../types';
import { loadAudioBuffer } from '../utils/video-export/assetLoader';
import { prepareAssets } from '../utils/video-export/prepareAssets';
import { mixAudio } from '../utils/video-export/audioMixer';
import { exportMp4 } from '../utils/video-export/exportMp4';
import { exportWebM } from '../utils/video-export/exportWebM';

interface UseVideoExportProps {
    scenes: Scene[];
    bgMusicUrl?: string;
    title?: string;
    endingVideoFile?: File | null;
    showSubtitles?: boolean;
    fps?: 30 | 60;
    resolution?: '1080p' | '720p';
}

export const useVideoExport = ({ scenes, bgMusicUrl, title, endingVideoFile, showSubtitles = true, fps = 60, resolution = '1080p' }: UseVideoExportProps) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState("");
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [eta, setEta] = useState<string | null>(null);
    const isDownloadingRef = useRef(false);

    const validScenes = scenes.filter(s => s.imageStatus === 'completed' && s.imageUrl);

    const checkCancelled = () => isDownloadingRef.current;

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
            // 1. Setup Canvas
            const canvas = document.createElement('canvas');
            const width = resolution === '1080p' ? 1080 : 720;
            const height = resolution === '1080p' ? 1920 : 1280;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) throw new Error("Could not create canvas context");

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);

            // 2. Audio Context
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            mainAudioCtx = new AudioContextClass({ sampleRate: 48000 });

            // 3. Load Assets
            setEta("~150s");
            console.log(`Starting export with ${validScenes.length} valid scenes.`);

            if (validScenes.length < scenes.length) {
                console.warn("Some scenes were skipped because they are not completed or missing images.");
            }

            const assets = await prepareAssets(validScenes, mainAudioCtx, (percent) => {
                setDownloadProgress(`Loading assets (${percent}%)...`);
            });

            // Load extra audio
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

                endingVideoElement = document.createElement('video');
                endingVideoElement.src = URL.createObjectURL(endingVideoFile);
                endingVideoElement.crossOrigin = "anonymous";
                endingVideoElement.muted = true;

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

                try {
                    const arrayBuffer = await endingVideoFile.arrayBuffer();
                    endingAudioBuffer = await mainAudioCtx.decodeAudioData(arrayBuffer);
                } catch (e) {
                    console.warn("Failed to decode ending audio track", e);
                }
            }

            // 4. Mix Audio
            setDownloadProgress("Mixing audio...");
            const totalScenesDuration = assets.reduce((acc, s) => acc + s.renderDuration, 0);

            // Add 1s silence at end if no ending video is provided (User Request)
            const EXTRA_SILENCE = endingVideoDuration === 0 ? 1.0 : 0;
            const totalDuration = totalScenesDuration + endingVideoDuration + EXTRA_SILENCE;

            const renderedAudioBuffer = await mixAudio(assets, bgMusicBuffer, endingAudioBuffer, totalScenesDuration, totalDuration);

            // 5. Export Branching
            let blob: Blob | null = null;

            if (format === 'mp4') {
                // Detailed WebCodecs detection
                const hasVideoEncoder = typeof VideoEncoder !== 'undefined';
                const hasAudioEncoder = typeof AudioEncoder !== 'undefined';
                const isSecureContext = window.isSecureContext;
                const protocol = window.location.protocol;

                if (!hasVideoEncoder || !hasAudioEncoder) {
                    let errorMsg = "MP4 export requires WebCodecs API which is not available.\n\n";

                    if (!isSecureContext && protocol !== 'https:') {
                        errorMsg += "🔒 CAUSE: You're accessing via HTTP (insecure).\n";
                        errorMsg += `Current: ${protocol}//${window.location.host}\n\n`;
                        errorMsg += "SOLUTION: Access via HTTPS or use WebM export instead.";
                    } else if (!isSecureContext) {
                        errorMsg += "🔒 CAUSE: Non-secure context (browser restrictions).\n\n";
                        errorMsg += "SOLUTION: Try WebM export instead or use a supported browser.";
                    } else {
                        errorMsg += "🌐 CAUSE: Your browser doesn't support WebCodecs API.\n\n";
                        errorMsg += "SOLUTION: Update to Chrome 94+, Edge 94+ or use WebM export.";
                    }

                    throw new Error(errorMsg);
                }

                blob = await exportMp4(
                    canvas, ctx, assets, endingVideoElement,
                    totalScenesDuration, totalDuration, renderedAudioBuffer,
                    fps, checkCancelled, setDownloadProgress, showSubtitles
                );
            } else {
                blob = await exportWebM(
                    canvas, ctx, mainAudioCtx, assets, endingVideoElement,
                    totalScenesDuration, totalDuration, renderedAudioBuffer,
                    fps, checkCancelled, setDownloadProgress, showSubtitles
                );
            }

            if (blob) {
                saveFile(blob, title, format);
            } else {
                console.log("Export cancelled or failed to produce blob");
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
