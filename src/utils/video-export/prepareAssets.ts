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

        const useVideo = (s.mediaType === 'video' || (!s.mediaType && s.videoUrl)) && s.videoUrl && s.videoStatus === 'completed';

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
        const realDuration = (buffer && Number.isFinite(buffer.duration)) ? buffer.duration : fallbackDuration;

        loadedAssetsCount++;
        const percent = Math.round((loadedAssetsCount / scenes.length) * 20); // 20% of total progress allocated to asset loading
        onProgress(percent);

        return { ...s, img, video, videoDuration, lastFrameImg, buffer, renderDuration: realDuration };
    }));

    return assets;
};
