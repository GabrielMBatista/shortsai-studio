import { SUBTITLE_STYLES } from '../../utils/styleConstants';
import { SubtitleLayout } from '../../utils/videoUtils';

export const drawFrame = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
    assets: any[],
    endingVideoElement: HTMLVideoElement | null,
    totalScenesDuration: number,
    subtitleLayouts: SubtitleLayout[],
    showSubtitles: boolean
) => {
    // Ending Phase
    if (time >= totalScenesDuration && endingVideoElement) {
        // Pause all scene videos
        assets.forEach(asset => {
            if (asset.video && !asset.video.paused) {
                asset.video.pause();
            }
        });

        // Ensure ending video is playing and at correct time (for WebM)
        const endingTime = time - totalScenesDuration;
        if (endingVideoElement.paused) {
            endingVideoElement.currentTime = endingTime;
            endingVideoElement.play().catch(e => console.warn("Failed to play ending video", e));
        }

        const vw = endingVideoElement.videoWidth;
        const vh = endingVideoElement.videoHeight;
        if (vw > 0 && vh > 0) {
            // object-cover: scale to fill, crop the excess
            const scale = Math.max(w / vw, h / vh);
            const cropW = w / scale;
            const cropH = h / scale;
            const cropX = (vw - cropW) / 2;
            const cropY = (vh - cropH) / 2;

            ctx.drawImage(
                endingVideoElement,
                cropX, cropY, cropW, cropH,
                0, 0, w, h
            );
        } else {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, w, h);
        }
        return;
    }

    // Pause ending video if we're in scenes phase
    if (endingVideoElement && !endingVideoElement.paused) {
        endingVideoElement.pause();
    }

    // Scenes Phase
    let currentSceneIdx = -1; // Start with invalid index
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

    // Fallback: if time is beyond all scenes, use the LAST scene (not first!)
    if (currentSceneIdx === -1 || currentSceneIdx >= assets.length) {
        currentSceneIdx = assets.length - 1;
        timeInScene = assets[currentSceneIdx].renderDuration; // End of last scene
    }

    const asset = assets[currentSceneIdx];
    const layout = subtitleLayouts[currentSceneIdx];

    // Pause all videos except the current one (for WebM real-time playback)
    assets.forEach((a, i) => {
        if (a.video && i !== currentSceneIdx && !a.video.paused) {
            a.video.pause();
        }
    });

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // Determine if we should use video, frozen frame, or image
    const hasVideo = asset.video && asset.videoDuration > 0;
    const isVideoActive = hasVideo && timeInScene < asset.videoDuration;
    const isVideoFrozen = hasVideo && timeInScene >= asset.videoDuration;

    // For WebM: ensure current video is playing
    if (isVideoActive && asset.video.paused) {
        asset.video.play().catch(e => console.warn("Failed to resume video", e));
    } else if (!isVideoActive && asset.video && !asset.video.paused) {
        asset.video.pause();
    }

    if (isVideoActive) {
        // Video is already seeked to correct time by seekVideoElementsToTime (for MP4)
        // or playing naturally (for WebM). Just draw the current frame.
        const vw = asset.video.videoWidth;
        const vh = asset.video.videoHeight;
        if (vw > 0 && vh > 0) {
            // object-cover: scale to fill, crop the excess
            const scale = Math.max(w / vw, h / vh);
            const sw = vw * scale;
            const sh = vh * scale;

            // Calculate crop: how much to cut from source
            const cropW = w / scale;  // Portion of source width to use
            const cropH = h / scale;  // Portion of source height to use

            // X-Framing (User Controlled)
            const xPercent = (asset.videoCropConfig?.x ?? 50) / 100;
            const cropX = (vw - cropW) * xPercent;

            const cropY = (vh - cropH) / 2;  // Center Y

            // Draw cropped portion scaled to fill canvas
            ctx.drawImage(
                asset.video,
                cropX, cropY, cropW, cropH,  // Source rectangle (crop from center)
                0, 0, w, h                    // Destination (fill canvas)
            );
        }
    } else if (isVideoFrozen && asset.lastFrameImg) {
        // Video ended but narration continues: freeze last frame with pan/zoom
        const frozenTime = timeInScene - asset.videoDuration;
        const frozenDuration = asset.renderDuration - asset.videoDuration;
        const frozenProgress = frozenTime / frozenDuration;
        const zoomScale = 1.0 + (0.15 * frozenProgress);

        const iw = asset.lastFrameImg.width;
        const ih = asset.lastFrameImg.height;

        // object-cover with zoom
        const scale = Math.max(w / iw, h / ih) * zoomScale;
        const cropW = w / scale;
        const cropH = h / scale;

        // X-Framing (User Controlled)
        const xPercent = (asset.videoCropConfig?.x ?? 50) / 100;
        const cropX = (iw - cropW) * xPercent;

        const cropY = (ih - cropH) / 2;

        ctx.drawImage(
            asset.lastFrameImg,
            cropX, cropY, cropW, cropH,
            0, 0, w, h
        );
    } else if (asset.img) {
        // Static image with pan/zoom
        const zoomProgress = timeInScene / asset.renderDuration;
        const zoomScale = 1.0 + (0.15 * zoomProgress);

        const iw = asset.img.width;
        const ih = asset.img.height;

        // object-cover with zoom
        const scale = Math.max(w / iw, h / ih) * zoomScale;
        const cropW = w / scale;
        const cropH = h / scale;
        const cropX = (iw - cropW) / 2;
        const cropY = (ih - cropH) / 2;

        ctx.drawImage(
            asset.img,
            cropX, cropY, cropW, cropH,
            0, 0, w, h
        );
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
