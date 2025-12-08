import { precomputeSubtitleLayouts } from './subtitleUtils';
import { drawFrame } from './drawFrame';

export const exportWebM = async (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    audioCtx: AudioContext,
    assets: any[],
    endingVideoElement: HTMLVideoElement | null,
    totalScenesDuration: number,
    totalDuration: number,
    audioBuffer: AudioBuffer,
    fps: number = 60,
    checkCancelled: () => boolean,
    onProgress: (msg: string) => void,
    showSubtitles: boolean
): Promise<Blob | null> => {
    console.log(`Starting WebM export with ${fps} FPS...`);

    if (typeof MediaRecorder === 'undefined') {
        throw new Error("WebM export requires MediaRecorder API support. Please use a modern browser.");
    }

    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.warn("VP9 not supported, trying VP8...");
        mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            throw new Error("WebM export is not supported in this browser. No VP9 or VP8 codec available.");
        }
    }
    console.log(`Using codec: ${mimeType}`);

    const dest = audioCtx.createMediaStreamDestination();
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(dest);

    const stream = canvas.captureStream(fps);
    const audioTrack = dest.stream.getAudioTracks()[0];
    if (audioTrack) stream.addTrack(audioTrack);

    const is1080p = canvas.width >= 1080;
    const baseBitrate = is1080p ? 8_000_000 : 4_500_000;
    const videoBitrate = fps === 60 ? baseBitrate : Math.round(baseBitrate * 0.7);

    const recorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: videoBitrate,
        audioBitsPerSecond: 128000
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    const finished = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
    });

    recorder.start(1000);
    source.start(0);

    assets.forEach(asset => {
        if (asset.video) {
            asset.video.currentTime = 0;
            asset.video.play().catch(e => console.warn("Failed to start video for WebM", e));
        }
    });

    if (endingVideoElement) {
        endingVideoElement.currentTime = 0;
        endingVideoElement.play().catch(e => console.warn("Failed to start ending video for WebM", e));
    }

    const startTime = Date.now();
    const subtitleLayouts = precomputeSubtitleLayouts(ctx, assets, canvas.width);

    const drawLoop = async () => {
        if (!checkCancelled() || recorder.state === 'inactive') return;

        const elapsedTime = (Date.now() - startTime) / 1000;
        if (elapsedTime >= totalDuration) {
            recorder.stop();
            return;
        }

        drawFrame(
            ctx, canvas.width, canvas.height, elapsedTime,
            assets, endingVideoElement, totalScenesDuration,
            subtitleLayouts, showSubtitles
        );

        onProgress(`Rendering (${Math.round((elapsedTime / totalDuration) * 100)}%)...`);
        requestAnimationFrame(drawLoop);
    };

    drawLoop();
    await finished;

    if (checkCancelled()) {
        return new Blob(chunks, { type: 'video/webm' });
    } else {
        return null;
    }
};
