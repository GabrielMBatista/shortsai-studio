import React, { useMemo } from 'react';
import { getWordTimings } from '../utils/videoUtils';
import { SUBTITLE_STYLES } from '../utils/styleConstants';

interface SubtitleOverlayProps {
  text: string;
  duration: number;
  currentTime: number;
  show: boolean;
  wordTimings?: { word: string; start: number; end: number }[];
}

const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({ text, duration, currentTime, show, wordTimings }) => {
  if (!show || !text) return null;

  const timings = useMemo(() => getWordTimings(text, duration, wordTimings), [text, duration, wordTimings]);

  // Find the currently active word
  let activeWordIndex = timings.findIndex(t => currentTime >= t.start && currentTime < t.end);

  // If no word is active (e.g. silence or before start), find the nearest relevant word
  if (activeWordIndex === -1) {
    if (currentTime < (timings[0]?.start || 0)) {
      activeWordIndex = 0;
    } else if (currentTime > (timings[timings.length - 1]?.end || duration)) {
      activeWordIndex = timings.length - 1;
    } else {
      // In a gap, keep the last active word or wait for next
      const nextIndex = timings.findIndex(t => t.start > currentTime);
      activeWordIndex = nextIndex !== -1 ? nextIndex : timings.length - 1;
    }
  }

  // Window configuration (Paged View)
  // Instead of sliding every word (which causes jumps), we show a static "page" of words
  // and only switch when the active word moves to the next page.
  const WORDS_PER_PAGE = 10;
  const pageIndex = Math.floor(activeWordIndex / WORDS_PER_PAGE);

  let start = pageIndex * WORDS_PER_PAGE;
  let end = start + WORDS_PER_PAGE;

  // Clamp bounds
  if (start < 0) start = 0;
  if (end > timings.length) end = timings.length;

  const visibleTimings = timings.slice(start, end);

  return (
    <div className="absolute bottom-12 left-0 right-0 px-8 text-center z-20 pointer-events-none">
      <div
        className="font-bold text-2xl md:text-3xl leading-relaxed flex flex-wrap justify-center gap-x-3 gap-y-2"
        style={{
          fontFamily: SUBTITLE_STYLES.fontFamily,
          textShadow: `0px 2px 4px ${SUBTITLE_STYLES.shadowColor}`
        }}
      >
        {visibleTimings.map((t, i) => {
          const isActive = currentTime >= t.start && currentTime < t.end;
          // Calculate absolute index for key to prevent re-mounting
          const absoluteIndex = start + i;

          return (
            <span
              key={absoluteIndex}
              className="transition-colors duration-200"
              style={{
                color: isActive ? SUBTITLE_STYLES.activeColor : 'rgba(255, 255, 255, 0.8)',
                opacity: isActive ? 1 : 0.6,
                transform: 'scale(1)', // Explicitly no scale to prevent layout shifts
                textShadow: isActive ? `0 0 10px ${SUBTITLE_STYLES.activeColor}` : 'none' // Glow instead of scale
              }}
            >
              {t.word}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default SubtitleOverlay;
