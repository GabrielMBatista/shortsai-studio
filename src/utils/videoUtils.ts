export interface SubtitleLayout {
    lines: string[][];
    timings: { word: string; start: number; end: number }[];
}

export const getWordTimings = (text: string, totalDuration: number, existingTimings?: { word: string; start: number; end: number }[]) => {
    if (existingTimings && existingTimings.length > 0) {
        return existingTimings;
    }

    const words = text.trim().split(/\s+/);
    if (words.length === 0) return [];

    // Heuristic: Punctuation adds weight/pause to the word
    const weights = words.map(word => {
        let weight = word.length;
        if (word.match(/[.,;!?]$/)) weight += 5;
        if (word.match(/[.!?]$/)) weight += 5;
        return weight;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const timePerWeight = totalWeight > 0 ? totalDuration / totalWeight : 0;

    let currentTime = 0;
    return words.map((word, i) => {
        const duration = weights[i] * timePerWeight;
        const start = currentTime;
        currentTime += duration;
        return { word, start, end: currentTime };
    });
};