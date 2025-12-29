import * as Mp4Muxer from 'mp4-muxer';
import { precomputeSubtitleLayouts } from './subtitleUtils';
import { drawFrame } from './drawFrame';

const seekVideoElementsToTime = async (
    time: number,
    assets: any[],
    endingVideoElement: HTMLVideoElement | null,
    totalScenesDuration: number
) => {
    // Ending Phase Seek
    if (time >= totalScenesDuration && endingVideoElement) {
        const endingTime = time - totalScenesDuration;
        if (Math.abs(endingVideoElement.currentTime - endingTime) > 0.01) {
            endingVideoElement.currentTime = endingTime;
            await new Promise<void>((resolve) => {
                const handler = () => {
                    endingVideoElement!.removeEventListener('seeked', handler);
                    resolve();
                };
                endingVideoElement!.addEventListener('seeked', handler);
                setTimeout(resolve, 100);
            });
        }
        return;
    }

    // Scenes Phase Seek
    let accumTime = 0;
    let foundScene = false;

    for (let i = 0; i < assets.length; i++) {
        if (time < accumTime + assets[i].renderDuration) {
            foundScene = true;
            const timeInScene = time - accumTime;
            const asset = assets[i];

            // Only seek if we need the video element
            // If frozen AND we have a lastFrameImg, we don't need the video element (drawFrame uses the image)
            // This prevents stuttering at end of scene
            const isFrozen = asset.videoDuration > 0 && timeInScene >= asset.videoDuration;
            const canOptimizeFreeze = isFrozen && asset.lastFrameImg;

            if (asset.video && asset.videoDuration > 0 && !canOptimizeFreeze) {
                // Determine valid seek time. If past duration, clamp to end.
                // We use duration - 0.05 to ensure we hit a valid frame before EOS
                let targetTime = timeInScene;
                if (timeInScene >= asset.videoDuration) {
                    targetTime = Math.max(0, asset.videoDuration - 0.05);
                }

                if (Math.abs(asset.video.currentTime - targetTime) > 0.1) { // Increased threshold slightly
                    asset.video.currentTime = targetTime;

                    // Only wait for seek if we moved significantly or it's not ready
                    if (asset.video.readyState < 3) {
                        await new Promise<void>((resolve) => {
                            const handler = () => {
                                asset.video.removeEventListener('seeked', handler);
                                resolve();
                            };
                            asset.video.addEventListener('seeked', handler);
                            // Safety timeout
                            setTimeout(resolve, 200);
                        });
                    }
                }
            }
            break;
        }
        accumTime += assets[i].renderDuration;
    }

    // If time is beyond all scenes, pause all scene videos
    if (!foundScene) {
        assets.forEach(asset => {
            if (asset.video && !asset.video.paused) {
                asset.video.pause();
            }
        });
    }
};

export const exportMp4 = async (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
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
    console.log("Starting MP4 export...");

    const muxer = new Mp4Muxer.Muxer({
        target: new Mp4Muxer.ArrayBufferTarget(),
        video: {
            codec: 'avc',
            width: canvas.width,
            height: canvas.height
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
            throw new Error("Video encoding failed: " + e.message);
        }
    });

    const is1080p = canvas.width >= 1080;
    const baseBitrate = is1080p ? 10_000_000 : 5_500_000;
    const bitrate = fps === 60 ? baseBitrate : Math.round(baseBitrate * 0.6);

    videoEncoder.configure({
        codec: 'avc1.4d0028',
        width: canvas.width,
        height: canvas.height,
        bitrate: bitrate,
        framerate: fps,
        hardwareAcceleration: 'prefer-hardware'
    });
    console.log(`VideoEncoder configured with ${fps} FPS, ${canvas.width}x${canvas.height}, ${(bitrate / 1000000).toFixed(1)} Mbps`);

    const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (e) => {
            console.error("AudioEncoder error", e);
            throw new Error("Audio encoding failed: " + e.message);
        }
    });

    audioEncoder.configure({
        codec: 'mp4a.40.2',
        numberOfChannels: 2,
        sampleRate: 48000,
        bitrate: 192000
    });

    onProgress("Encoding audio...");
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;

    const interleaved = new Float32Array(length * numberOfChannels);
    for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            interleaved[i * numberOfChannels + channel] = channelData[i];
        }
    }

    const chunkSize = sampleRate;
    for (let i = 0; i < length; i += chunkSize) {
        const end = Math.min(i + chunkSize, length);
        const frameCount = end - i;
        const chunkData = interleaved.slice(i * numberOfChannels, end * numberOfChannels);

        const audioData = new AudioData({
            format: 'f32',
            sampleRate: sampleRate,
            numberOfFrames: frameCount,
            numberOfChannels: numberOfChannels,
            timestamp: (i / sampleRate) * 1_000_000,
            data: chunkData
        });

        audioEncoder.encode(audioData);
        audioData.close();
    }
    await audioEncoder.flush();
    console.log("Audio encoding finished");

    const frameDuration = 1 / fps;
    const totalFrames = Math.ceil(totalDuration * fps);
    const subtitleLayouts = precomputeSubtitleLayouts(ctx, assets, canvas.width);

    console.log(`Starting Video Encoding: Total Frames=${totalFrames}, Duration=${totalDuration}s, FPS=${fps}`);

    for (let i = 0; i < totalFrames; i++) {
        if (!checkCancelled()) {
            console.log("Export cancelled by user");
            break;
        }

        const time = i * frameDuration;
        if (i % 30 === 0) console.log(`Processing Frame ${i}/${totalFrames} (Time: ${time.toFixed(2)})`);

        onProgress(`Encoding video (${Math.round((i / totalFrames) * 100)}%)...`);

        await seekVideoElementsToTime(time, assets, endingVideoElement, totalScenesDuration);

        try {
            drawFrame(ctx, canvas.width, canvas.height, time, assets, endingVideoElement, totalScenesDuration, subtitleLayouts, showSubtitles);
        } catch (drawErr) {
            console.error(`Error drawing frame ${i}`, drawErr);
        }

        const frame = new VideoFrame(canvas, {
            timestamp: time * 1_000_000
        });

        videoEncoder.encode(frame, { keyFrame: i % 60 === 0 });
        frame.close();

        if (videoEncoder.encodeQueueSize > 5) {
            await new Promise(r => setTimeout(r, 20));
        }
    }

    if (checkCancelled()) {
        await videoEncoder.flush();
        muxer.finalize();
        const { buffer } = muxer.target;
        return new Blob([buffer], { type: 'video/mp4' });
    } else {
        return null;
    }
};
