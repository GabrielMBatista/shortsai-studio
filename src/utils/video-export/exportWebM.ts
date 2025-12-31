import { Muxer, ArrayBufferTarget } from 'webm-muxer';
import { precomputeSubtitleLayouts } from './subtitleUtils';
import { drawFrame } from './drawFrame';
import { seekVideoElementsToTime } from './seekHelper';

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
    console.log("Starting WebM export (Offline Rendering)...");

    const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: {
            codec: 'V_VP9',
            width: canvas.width,
            height: canvas.height,
            frameRate: fps
        },
        audio: {
            codec: 'A_OPUS',
            numberOfChannels: 2,
            sampleRate: 48000
        }
    });

    const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => {
            console.error("VideoEncoder error", e);
            throw new Error("WebM Video encoding failed: " + e.message);
        }
    });

    // High bitrate for premium quality
    const is1080p = canvas.width >= 1080;
    const baseBitrate = is1080p ? 12_000_000 : 6_000_000;
    const bitrate = fps === 60 ? baseBitrate : Math.round(baseBitrate * 0.7);

    videoEncoder.configure({
        codec: 'vp09.00.10.08', // VP9 Profile 0, Level 1, BitDepth 8
        width: canvas.width,
        height: canvas.height,
        bitrate: bitrate,
        framerate: fps
    });
    console.log(`VideoEncoder (WebM) configured with ${fps} FPS, ${bitrate / 1_000_000} Mbps`);

    const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (e) => {
            console.error("AudioEncoder error", e);
            throw new Error("WebM Audio encoding failed: " + e.message);
        }
    });

    audioEncoder.configure({
        codec: 'opus',
        numberOfChannels: 2,
        sampleRate: 48000,
        bitrate: 128000 // 128 kbps Opus is very high quality
    });

    // --- Audio Encoding ---
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

    const chunkSize = sampleRate; // 1 second chunks
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

    // --- Video Encoding ---
    const frameDuration = 1 / fps;
    const totalFrames = Math.ceil(totalDuration * fps);
    const subtitleLayouts = precomputeSubtitleLayouts(ctx, assets, canvas.width);

    console.log(`Starting Video Render: Total Frames=${totalFrames}, Duration=${totalDuration}s`);

    for (let i = 0; i < totalFrames; i++) {
        if (!checkCancelled()) {
            console.log("WebM Export cancelled");
            break;
        }

        const time = i * frameDuration;
        if (i % 30 === 0) onProgress(`Rendering video (${Math.round((i / totalFrames) * 100)}%)...`);

        await seekVideoElementsToTime(time, assets, endingVideoElement, totalScenesDuration);

        try {
            drawFrame(ctx, canvas.width, canvas.height, time, assets, endingVideoElement, totalScenesDuration, subtitleLayouts, showSubtitles);
        } catch (drawErr) {
            console.error(`Error drawing frame ${i}`, drawErr);
        }

        const frame = new VideoFrame(canvas, {
            timestamp: time * 1_000_000 // microseconds
        });

        // Keyframe every 2 seconds (assuming 60fps)
        const keyFrame = i % (fps * 2) === 0;
        videoEncoder.encode(frame, { keyFrame });
        frame.close();

        // Prevent memory overload by checking queue
        if (videoEncoder.encodeQueueSize > 5) {
            await new Promise(r => setTimeout(r, 10)); // Tiny yield
        }
    }

    if (checkCancelled()) {
        await videoEncoder.flush();
        muxer.finalize();
        const { buffer } = muxer.target;
        return new Blob([buffer], { type: 'video/webm' });
    } else {
        return null;
    }
};
