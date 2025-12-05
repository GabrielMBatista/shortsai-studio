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

  // Fallback logic
  if (activeWordIndex === -1) {
    if (currentTime < (timings[0]?.start || 0)) {
      activeWordIndex = 0;
    } else if (currentTime > (timings[timings.length - 1]?.end || duration)) {
      activeWordIndex = timings.length - 1;
    } else {
      const nextIndex = timings.findIndex(t => t.start > currentTime);
      activeWordIndex = nextIndex !== -1 ? nextIndex : timings.length - 1;
    }
  }

  // Configuration for "Fluid Single Line"
  // We use a small window (3-4 words) to guarantee 1 line on vertical screens (9:16).
  // Using an odd number helps center the visual weight.
  const WORDS_PER_PAGE = 4;
  const pageIndex = Math.floor(activeWordIndex / WORDS_PER_PAGE);

  const start = pageIndex * WORDS_PER_PAGE;
  const end = Math.min(start + WORDS_PER_PAGE, timings.length);
  const visibleTimings = timings.slice(start, end);

  return (
    <div className="absolute bottom-20 left-0 right-0 px-6 text-center z-20 pointer-events-none flex justify-center items-center h-16">
      <div
        className="font-bold text-2xl md:text-3xl leading-none flex flex-nowrap justify-center items-center gap-x-2 transition-all duration-300 ease-out"
        style={{
          fontFamily: SUBTITLE_STYLES.fontFamily,
          textShadow: `0px 2px 8px ${SUBTITLE_STYLES.shadowColor}`
        }}
      >
        {visibleTimings.map((t, i) => {
          const absoluteIndex = start + i;
          const isActive = absoluteIndex === activeWordIndex;
          
          return (
            <span
              key={absoluteIndex}
              className="transition-all duration-200 ease-out origin-center block"
              style={{
                color: isActive ? SUBTITLE_STYLES.activeColor : 'rgba(255, 255, 255, 0.9)',
                opacity: isActive ? 1 : 0.5,
                transform: isActive ? 'scale(1.2)' : 'scale(1)',
                textShadow: isActive ? `0 0 20px ${SUBTITLE_STYLES.activeColor}, 0 2px 4px rgba(0,0,0,0.8)` : `0 2px 4px rgba(0,0,0,0.8)`,
                whiteSpace: 'nowrap'
              }}
            >
              {t.word}
            </span>
          );
        })}
      </div>
    </div >
  );
};

export default SubtitleOverlay;
