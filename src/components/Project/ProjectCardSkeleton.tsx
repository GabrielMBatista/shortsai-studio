import React from 'react';

const ProjectCardSkeleton: React.FC = () => {
    return (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden flex flex-col h-full animate-pulse">
            {/* Thumbnail Skeleton */}
            <div className="aspect-video bg-slate-800 relative">
                <div className="absolute top-3 right-3 w-16 h-6 bg-slate-700/50 rounded-lg" />
            </div>

            {/* Content Skeleton */}
            <div className="p-5 flex-1 flex flex-col">
                <div className="mb-3">
                    {/* Title */}
                    <div className="h-6 bg-slate-700/50 rounded w-3/4 mb-3" />
                    
                    {/* Meta info (style • date) */}
                    <div className="flex gap-2 items-center">
                        <div className="h-4 bg-slate-700/50 rounded w-20" />
                        <div className="h-4 bg-slate-700/50 rounded w-24" />
                    </div>
                </div>

                {/* Progress bar area */}
                <div className="mt-auto pt-4 border-t border-slate-700/30">
                    <div className="flex justify-between items-end mb-2">
                        <div className="h-3 bg-slate-700/50 rounded w-16" />
                        <div className="h-3 bg-slate-700/50 rounded w-8" />
                    </div>
                    <div className="h-1.5 bg-slate-700/50 rounded-full w-full" />
                </div>
            </div>
        </div>
    );
};

export default ProjectCardSkeleton;
