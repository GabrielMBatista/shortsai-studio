import { getProxyUrl } from '../urlUtils';

export const loadAudioBuffer = async (ctx: BaseAudioContext, url: string): Promise<AudioBuffer | null> => {
    try {
        const response = await fetch(getProxyUrl(url));
        const arrayBuffer = await response.arrayBuffer();
        return await ctx.decodeAudioData(arrayBuffer);
    } catch (e) {
        console.warn("Audio load error", e);
        return null;
    }
};

export const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = (err) => {
            console.warn(`❌ Failed to load image via proxy: ${url}`, err);

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

export const loadVideo = (url: string): Promise<HTMLVideoElement> => {
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
