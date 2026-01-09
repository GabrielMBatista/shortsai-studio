import React, { useState, useMemo } from 'react';
import { VideoProject } from '../../types';
import { CheckSquare, Square, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SafeImage } from '../Common/SafeImage';

interface ProjectSelectorProps {
    projects: VideoProject[];
    selectedProjectIds: string[];
    onToggleProject: (projectId: string) => void;
    onToggleAll: () => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
    projects,
    selectedProjectIds,
    onToggleProject,
    onToggleAll
}) => {
    const { t } = useTranslation();
    const [filterMode, setFilterMode] = useState<'all' | 'complete' | 'incomplete'>('all');

    // Filtrar projetos
    const filteredProjects = useMemo(() => {
        if (filterMode === 'all') return projects;

        return projects.filter(project => {
            const completedImages = project.scenes.filter(s => s.imageStatus === 'completed').length;
            const completedAudio = project.scenes.filter(s => s.audioStatus === 'completed').length;
            const totalTasks = (project.scenes.length || 1) * 2;
            const progress = totalTasks > 0 ? ((completedImages + completedAudio) / totalTasks) * 100 : 0;

            if (filterMode === 'complete') return progress >= 100;
            if (filterMode === 'incomplete') return progress < 100;
            return true;
        });
    }, [projects, filterMode]);

    const allSelected = filteredProjects.length > 0 && filteredProjects.every(p => selectedProjectIds.includes(p.id));

    const getProjectProgress = (project: VideoProject) => {
        const completedImages = project.scenes.filter(s => s.imageStatus === 'completed').length;
        const completedAudio = project.scenes.filter(s => s.audioStatus === 'completed').length;
        const totalTasks = (project.scenes.length || 1) * 2;
        return totalTasks > 0 ? Math.round(((completedImages + completedAudio) / totalTasks) * 100) : 0;
    };

    const getDisplayTitle = (project: VideoProject) => {
        let title = project.generatedTitle || project.topic;
        if (typeof title === 'string' && (title.trim().startsWith('{') || title.trim().startsWith('['))) {
            try {
                const parsed = JSON.parse(title);
                title = parsed.projectTitle || parsed.videoTitle || parsed.title || t('app.untitled_project');
            } catch (e) { }
        }
        return title;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header com contador e filtros */}
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 z-10">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onToggleAll}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            {allSelected ? (
                                <CheckSquare className="w-5 h-5 text-indigo-400" />
                            ) : (
                                <Square className="w-5 h-5 text-slate-400" />
                            )}
                            <span className="text-sm font-medium text-white">
                                {allSelected ? t('batch_render.deselect_all') : t('batch_render.select_all')}
                            </span>
                        </button>

                        <div className="text-sm font-semibold text-slate-300">
                            <span className="text-indigo-400">{selectedProjectIds.length}</span>
                            {' '}/{' '}
                            <span className="text-slate-400">{filteredProjects.length}</span>
                            {' '}{t('batch_render.selected')}
                        </div>
                    </div>

                    {/* Filtros */}
                    <div className="flex gap-2">
                        {['all', 'complete', 'incomplete'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setFilterMode(mode as any)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterMode === mode
                                        ? 'bg-indigo-500 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                            >
                                {t(`batch_render.filter_${mode}`)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Grid de Projetos */}
            <div className="flex-1 overflow-y-auto p-4">
                {filteredProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Filter className="w-12 h-12 text-slate-600 mb-3" />
                        <p className="text-slate-400">{t('batch_render.no_projects_filtered')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProjects.map(project => {
                            const isSelected = selectedProjectIds.includes(project.id);
                            const progress = getProjectProgress(project);
                            const title = getDisplayTitle(project);

                            return (
                                <button
                                    key={project.id}
                                    onClick={() => onToggleProject(project.id)}
                                    className={`relative group rounded-xl overflow-hidden transition-all transform hover:scale-[1.02] ${isSelected
                                            ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/20'
                                            : 'ring-1 ring-slate-700 hover:ring-slate-600'
                                        }`}
                                >
                                    {/* Thumbnail */}
                                    <div className="aspect-video bg-slate-900 relative overflow-hidden">
                                        {project.scenes[0]?.imageUrl ? (
                                            <SafeImage
                                                src={project.scenes[0].imageUrl}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                                <div className="w-12 h-12 rounded-full border-2 border-slate-700" />
                                            </div>
                                        )}

                                        {/* Overlay Selecionado */}
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-indigo-500/20 backdrop-blur-[1px]" />
                                        )}

                                        {/* Checkbox */}
                                        <div className={`absolute top-3 left-3 p-1.5 rounded-lg transition-all ${isSelected
                                                ? 'bg-indigo-500 shadow-lg'
                                                : 'bg-slate-900/80 group-hover:bg-slate-800/80'
                                            }`}>
                                            {isSelected ? (
                                                <CheckSquare className="w-5 h-5 text-white" />
                                            ) : (
                                                <Square className="w-5 h-5 text-slate-400" />
                                            )}
                                        </div>

                                        {/* Badge de Status */}
                                        <div className="absolute top-3 right-3">
                                            <div className={`px-2 py-1 rounded-lg text-xs font-bold ${progress >= 100
                                                    ? 'bg-green-500/90 text-white'
                                                    : 'bg-amber-500/90 text-white'
                                                }`}>
                                                {progress}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Informações */}
                                    <div className="p-3 bg-slate-800 border-t border-slate-700">
                                        <h3 className="text-sm font-semibold text-white line-clamp-1 mb-1">
                                            {title}
                                        </h3>
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>{project.scenes.length} {t('batch_render.scenes')}</span>
                                            <span>{project.language}</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectSelector;
