export const seekVideoElementsToTime = async (
    time: number,
    assets: any[],
    endingVideoElement: HTMLVideoElement | null,
    totalScenesDuration: number
) => {
    // Ending Phase Seek
    if (time >= totalScenesDuration && endingVideoElement) {
        const endingTime = time - totalScenesDuration;
        // Reduced threshold for more precision, but relaxed enough for float math
        if (Math.abs(endingVideoElement.currentTime - endingTime) > 0.05) {
            endingVideoElement.currentTime = endingTime;

            if (endingVideoElement.readyState < 3) { // 3 = HAVE_FUTURE_DATA
                await new Promise<void>((resolve) => {
                    const handler = () => {
                        endingVideoElement.removeEventListener('seeked', handler);
                        resolve();
                    };
                    endingVideoElement.addEventListener('seeked', handler);
                    // Increased safety timeout to 500ms for 4K/heavy assets
                    setTimeout(() => {
                        endingVideoElement.removeEventListener('seeked', handler);
                        resolve();
                    }, 500);
                });
            }
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

            // Only seek if check conditions met
            const isFrozen = asset.videoDuration > 0 && timeInScene >= asset.videoDuration;
            // Optimization: If frozen and we have a captured frame, drawFrame will use the image.
            // So we DO NOT need to seek the video, preventing "seeking back" glitches or black frames.
            const canOptimizeFreeze = isFrozen && asset.lastFrameImg;

            if (asset.video && asset.videoDuration > 0 && !canOptimizeFreeze) {
                let targetTime = timeInScene;
                // Clamp to valid range
                if (timeInScene >= asset.videoDuration) {
                    targetTime = Math.max(0, asset.videoDuration - 0.05);
                }

                // If drift > 0.1s, seek
                if (Math.abs(asset.video.currentTime - targetTime) > 0.1) {
                    asset.video.currentTime = targetTime;

                    if (asset.video.readyState < 3) {
                        await new Promise<void>((resolve) => {
                            const handler = () => {
                                asset.video.removeEventListener('seeked', handler);
                                resolve();
                            };
                            asset.video.addEventListener('seeked', handler);
                            // 500ms timeout for safety
                            setTimeout(() => {
                                asset.video.removeEventListener('seeked', handler);
                                resolve();
                            }, 500);
                        });
                    }
                }
            }
            // Pause others? usually handled by drawFrame but good practice if we want to save resources
            // (Skipping for now to avoid side-effects in this helper)
            break;
        }
        accumTime += assets[i].renderDuration;
    }
};
