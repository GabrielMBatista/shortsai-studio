import { getWordTimings, SubtitleLayout } from '../videoUtils';
import { SUBTITLE_STYLES } from '../styleConstants';

export const precomputeSubtitleLayouts = (ctx: CanvasRenderingContext2D, scenes: any[], canvasWidth: number): SubtitleLayout[] => {
    // Use shared font style
    ctx.font = `${SUBTITLE_STYLES.fontWeight} ${SUBTITLE_STYLES.canvasFontSize}px ${SUBTITLE_STYLES.fontFamily}`;

    return scenes.map(scene => {
        const duration = scene.durationSeconds || 5;
        const timings = getWordTimings(scene.narration, duration, scene.wordTimings);
        const words = timings.map(t => t.word);
        const lines: string[][] = [];
        let currentLine: string[] = [];
        let currentWidth = 0;
        const maxWidth = canvasWidth - 160;
        words.forEach(word => {
            const width = ctx.measureText(word + ' ').width;
            if (currentWidth + width > maxWidth && currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = [word];
                currentWidth = width;
            } else {
                currentLine.push(word);
                currentWidth += width;
            }
        });
        if (currentLine.length > 0) lines.push(currentLine);
        return { lines, timings };
    });
};
