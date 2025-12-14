import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LoaderProps {
  text?: string;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Loader: React.FC<LoaderProps> = ({
  text,
  fullScreen = false,
  size = 'md',
  className = ''
}) => {
  const { t } = useTranslation();
  const displayText = text || t('common.loading');
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0f172a] text-slate-50"
    : `flex flex-col items-center justify-center ${className}`;

  return (
    <div className={containerClasses}>
      <div className="relative mb-4">
        {/* Outer Glow */}
        <div className={`absolute inset-0 bg-indigo-500/30 blur-xl rounded-full animate-pulse ${sizeClasses[size]}`} />

        {/* Main Spinner */}
        <Loader2 className={`${sizeClasses[size]} text-indigo-400 animate-spin relative z-10`} />

        {/* Decorative Sparkle */}
        <Sparkles className="absolute -top-2 -right-2 w-4 h-4 text-purple-400 animate-bounce z-20" style={{ animationDuration: '2s' }} />
      </div>

      {displayText && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-slate-300 tracking-wide animate-pulse">
            {displayText}
          </span>
          {fullScreen && (
            <div className="h-1 w-32 bg-slate-800 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 w-full animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Loader;