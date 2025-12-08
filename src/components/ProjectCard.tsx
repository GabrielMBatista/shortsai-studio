import React from 'react';
import { VideoProject } from '../types';
import { Zap, MoreVertical, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDraggable } from '@dnd-kit/core';

import { getSceneMedia } from '../services/scenes';
import { SafeImage } from './common/SafeImage';

interface ProjectCardProps {
    project: VideoProject;
    onOpenProject: (project: VideoProject) => void;
    onContextMenu: (e: React.MouseEvent, projectId: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onOpenProject, onContextMenu }) => {
    const { t } = useTranslation();
    const [imageLoaded, setImageLoaded] = React.useState(false);
    const [thumbnailUrl, setThumbnailUrl] = React.useState<string | null>(project.scenes[0]?.imageUrl || null);

    React.useEffect(() => {
        const loadThumbnail = async () => {
            // Only fetch if we don't have a URL, but the scene implies it should have one (completed status)
            if (!thumbnailUrl && project.scenes.length > 0 && project.scenes[0].imageStatus === 'completed') {
                const sceneId = project.scenes[0].id;
                if (sceneId) {
                    try {
                        const media = await getSceneMedia(sceneId);
                        if (media && media.image_base64) {
                            setThumbnailUrl(media.image_base64);
                        }
                    } catch (e) {
                        console.error("Failed to load thumbnail", e);
                    }
                }
            }
        };
        loadThumbnail();
    }, [project.scenes, thumbnailUrl]);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: project.id,
    });

    const style = {
        // transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, // Disable transform on original
        opacity: isDragging ? 0.3 : 1,
        position: 'relative' as const,
    };

    const formatDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const completedImages = project.scenes.filter(s => s.imageStatus === 'completed').length;
    const completedAudio = project.scenes.filter(s => s.audioStatus === 'completed').length;
    const totalTasks = (project.scenes.length || 6) * 2;
    const progress = totalTasks > 0 ? Math.round(((completedImages + completedAudio) / totalTasks) * 100) : 0;

    let displayTitle = project.generatedTitle || project.topic;
    if (typeof displayTitle === 'string' && (displayTitle.trim().startsWith('{') || displayTitle.trim().startsWith('['))) {
        try {
            const p = JSON.parse(displayTitle);
            displayTitle = p.projectTitle || p.videoTitle || p.title || p.scriptTitle || t('app.untitled_project');
        } catch (e) { }
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={() => onOpenProject(project)}
            onContextMenu={(e) => onContextMenu(e, project.id)}
            className="group bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all cursor-pointer flex flex-col h-full relative touch-none"
        >
            {/* Thumbnail */}
            <div className="aspect-video bg-slate-900 relative overflow-hidden">
                {thumbnailUrl ? (
                    <>
                        <SafeImage
                            src={thumbnailUrl}
                            className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105`}
                        />
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800/80">
                        {/* Show loading state if we expect an image (completed status) but don't have URL yet */}
                        {project.scenes[0]?.imageStatus === 'completed' ? (
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
                            </div>
                        ) : (
                            <Zap className="w-12 h-12 text-slate-700 group-hover:text-indigo-500/50 transition-colors" />
                        )}
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />

                <div className="absolute top-3 right-3 flex gap-2">
                    <span className="bg-black/60 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-bold text-white uppercase tracking-wider border border-white/10">
                        {project.language}
                    </span>
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); onContextMenu(e, project.id); }}
                    className="absolute top-3 left-3 p-2 bg-slate-900/80 text-white rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-800 transition-all transform hover:scale-110 backdrop-blur-sm shadow-lg"
                >
                    <MoreVertical className="w-4 h-4" />
                </button>

                {/* Play Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30 shadow-2xl transform scale-75 group-hover:scale-100 transition-transform">
                        <Play className="w-6 h-6 text-white fill-current" />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col">
                <div className="mb-3">
                    <h3 className="font-bold text-white text-lg line-clamp-1 group-hover:text-indigo-300 transition-colors" title={displayTitle as string}>
                        {displayTitle}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        <span className="bg-slate-700/50 px-2 py-0.5 rounded border border-slate-700">{project.style}</span>
                        <span>•</span>
                        <span>{formatDate(project.createdAt)}</span>
                    </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-700/50">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-semibold text-slate-400">{t('dashboard.progress')}</span>
                        <span className="text-xs font-bold text-indigo-400">{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-700/50 rounded-full w-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectCard;
