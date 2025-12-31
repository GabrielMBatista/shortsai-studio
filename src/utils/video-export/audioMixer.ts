export const mixAudio = async (
    assets: any[],
    bgMusicBuffer: AudioBuffer | null,
    endingAudioBuffer: AudioBuffer | null,
    totalScenesDuration: number,
    totalDuration: number,
    bgMusicConfig?: { volume?: number }
): Promise<AudioBuffer> => {
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

            // Add 1 second delay if scene has hookText
            const hookDelay = asset.hookText ? 1.0 : 0;
            const startT = currentAudioTime + hookDelay;
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
        const musicVolume = bgMusicConfig?.volume ?? 0.12;
        musicGain.gain.value = musicVolume;

        musicSource.connect(musicGain);
        musicGain.connect(masterGain);

        musicSource.start(0);
        const musicEnd = totalScenesDuration;
        musicGain.gain.setValueAtTime(musicVolume, musicEnd - 1.0);
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
    return await offlineCtx.startRendering();
};
