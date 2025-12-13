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

  // Configuration for "Fluid Multi-Line"
  // Increased to 7 words to allow for 2 lines, reducing page flip "jumps".
  const WORDS_PER_PAGE = 7;
  const pageIndex = Math.floor(activeWordIndex / WORDS_PER_PAGE);

  const start = pageIndex * WORDS_PER_PAGE;
  const end = Math.min(start + WORDS_PER_PAGE, timings.length);
  const visibleTimings = timings.slice(start, end);

  return (
    <div className="absolute bottom-[15%] left-0 right-0 z-20 pointer-events-none flex justify-center items-center">
      <div
        className="font-bold text-2xl md:text-3xl leading-snug flex flex-wrap justify-center items-center gap-x-3 gap-y-1 transition-all duration-300 ease-out w-[85%] max-w-4xl"
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
              className="transition-all duration-200 ease-out origin-center inline-block"
              style={{
                color: isActive ? SUBTITLE_STYLES.activeColor : 'rgba(255, 255, 255, 0.9)',
                opacity: isActive ? 1 : 0.6,
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
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
