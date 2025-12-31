import { Scene } from '../../types';
import { loadAudioBuffer, loadImage, loadVideo } from './assetLoader';
import { getProxyUrl } from '../../utils/urlUtils';

export const prepareAssets = async (
    scenes: Scene[],
    mainAudioCtx: AudioContext,
    onProgress: (percent: number) => void
) => {
    let loadedAssetsCount = 0;

    const assets = await Promise.all(scenes.map(async (s, index) => {
        let img: HTMLImageElement | null = null;
        let video: HTMLVideoElement | null = null;
        let videoDuration = 0;
        let lastFrameImg: HTMLImageElement | null = null;

        // Prefer video if: 1) mediaType is explicitly 'video', OR 2) no mediaType but video available and completed
        const useVideo = (s.mediaType === 'video' || (!s.mediaType && s.videoUrl && s.videoStatus === 'completed')) && s.videoUrl && s.videoStatus === 'completed';

        if (useVideo) {
            try {
                const videoUrl = s.videoUrl!;
                console.log(`Fetching video blob for scene ${s.sceneNumber}: ${videoUrl}`);
                const response = await fetch(getProxyUrl(videoUrl));
                if (!response.ok) throw new Error(`Video fetch failed: ${response.status}`);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);

                video = await loadVideo(blobUrl);
                videoDuration = video.duration;
                console.log(`Video loaded successfully for scene ${s.sceneNumber}, duration: ${videoDuration}s`);

                // Capture last frame
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
            buffer = await loadAudioBuffer(mainAudioCtx, s.audioUrl);
            if (!buffer) {
                console.warn(`Failed to load audio for scene ${s.sceneNumber}: ${s.audioUrl}`);
            } else {
                console.log(`Audio loaded for scene ${s.sceneNumber}, duration: ${buffer.duration}s`);
            }
        }

        const dbDuration = Number(s.durationSeconds) || 0;
        const fallbackDuration = dbDuration > 0 ? dbDuration : 5;

        // CRITICAL: If audio is present, the scene duration MUST be the audio duration.
        // This ensures video cuts when narration ends, or freezes if narration is longer.
        let realDuration = fallbackDuration;

        if (buffer && Number.isFinite(buffer.duration) && buffer.duration > 0) {
            realDuration = buffer.duration;
            // Pad slightly to avoid abrupt audio cutoff? 
            // User requested strict "according to narration time", so we stick to exact duration or very slight padding (0.1s).
            // Actually, keep it exact to avoid sync drift.
        } else if (useVideo && videoDuration > 0) {
            // Fallback: If no audio, but we have video, use video duration?
            // User says "calculated according to narration". If no narration...
            // We default to DB duration (which might be estimated).
            // If DB duration is 0/invalid, use video duration as last resort.
            if (realDuration <= 0.1) realDuration = videoDuration;
        }

        // Just in case
        if (realDuration < 0.5) realDuration = 5;

        // Load particle overlay video if specified
        let particleVideo: HTMLVideoElement | null = null;
        if (s.particleOverlay) {
            try {
                const particleUrl = `/cinematic-assets/overlays/${s.particleOverlay}.mp4`;
                particleVideo = await loadVideo(particleUrl);
                console.log(`Particle overlay loaded for scene ${s.sceneNumber}: ${s.particleOverlay}`);
            } catch (e) {
                console.warn(`Failed to load particle overlay for scene ${s.sceneNumber}:`, e);
            }
        }

        loadedAssetsCount++;
        const percent = Math.round((loadedAssetsCount / scenes.length) * 20); // 20% of total progress allocated to asset loading
        onProgress(percent);

        return { ...s, img, video, videoDuration, lastFrameImg, buffer, renderDuration: realDuration, particleVideo };
    }));

    return assets;
};
