
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
  const activeWordIndex = timings.findIndex(t => currentTime >= t.start && currentTime < t.end);

  return (
    <div className="absolute bottom-12 left-0 right-0 p-6 text-center z-20 pointer-events-none">
      <div
        className="font-bold text-xl md:text-2xl leading-normal flex flex-wrap justify-center gap-x-2 gap-y-1"
        style={{
          fontFamily: SUBTITLE_STYLES.fontFamily,
          textShadow: `0px ${SUBTITLE_STYLES.shadowOffsetY}px ${SUBTITLE_STYLES.shadowBlur}px ${SUBTITLE_STYLES.shadowColor}`
        }}
      >
        {timings.map((t, i) => {
          const isActive = i === activeWordIndex;
          return (
            <span
              key={i}
              className="transition-all duration-200"
              style={{
                color: isActive ? SUBTITLE_STYLES.activeColor : SUBTITLE_STYLES.inactiveColor,
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                opacity: isActive ? 1 : 0.8,
                filter: isActive ? 'none' : 'blur(0.5px)'
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
