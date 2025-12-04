import React, { useState, useMemo, useEffect } from 'react';
import { User, VideoProject, Folder as FolderType } from '../types';
import { Plus, Clock, Film, Play, Trash2, Zap, Sparkles, ArrowRight, Archive, Download, Filter, MoreVertical, FolderInput, Folder, Menu, X } from 'lucide-react';
import Loader from './Loader';
import { useTranslation } from 'react-i18next';
import FolderList from './FolderList';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import ProjectCard from './ProjectCard';
import { exportProjectContext, patchProjectMetadata, getFolders, createFolder, updateFolder, deleteFolder } from '../services/storageService';

interface DashboardProps {
    user: User;
    projects: VideoProject[];
    onNewProject: () => void;
    onOpenProject: (project: VideoProject) => void;
    onDeleteProject: (projectId: string) => void;
    onRefreshProjects: () => void;
    isLoading?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ user, projects, onNewProject, onOpenProject, onDeleteProject, onRefreshProjects, isLoading = false }) => {
    const { t } = useTranslation();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleCreateFolder = async (name: string) => {
        await createFolder(name);
        onRefreshProjects();
    };

    const handleUpdateFolder = async (id: string, name: string) => {
        await updateFolder(id, name);
        onRefreshProjects();
    };

    const handleDeleteFolder = async (id: string) => {
        await deleteFolder(id);
        onRefreshProjects();
    };
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const [filterTag, setFilterTag] = useState('');
    const [folders, setFolders] = useState<FolderType[]>([]);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, projectId: string } | null>(null);

    useEffect(() => {
        getFolders().then(setFolders);
    }, []);

    const handleRefreshFolders = () => {
        getFolders().then(setFolders);
    };

    const formatDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, Partial<VideoProject>>>({});

    // Clear optimistic updates when projects are refreshed from backend
    useEffect(() => {
        setOptimisticUpdates({});
    }, [projects]);

    const filteredProjects = useMemo(() => {
        return projects.map(p => ({ ...p, ...optimisticUpdates[p.id] })).filter(p => {
            if (showArchived) {
                return p.isArchived;
            }
            if (p.isArchived) return false; // Hide archived by default

            if (selectedFolderId) {
                if (p.folderId !== selectedFolderId) return false;
            } else {
                // Home/Root view: Only show projects NOT in any folder
                if (p.folderId) return false;
            }

            if (filterTag && !p.tags?.some(t => t.toLowerCase().includes(filterTag.toLowerCase()))) return false;

            return true;
        });
    }, [projects, selectedFolderId, showArchived, filterTag, optimisticUpdates]);

    const handleExportContext = async () => {
        try {
            const data = await exportProjectContext(selectedFolderId || undefined, filterTag || undefined);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `context-export-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Export failed", e);
            alert("Failed to export context");
        }
    };

    const handleArchive = async (projectId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        setOptimisticUpdates(prev => ({ ...prev, [projectId]: { ...prev[projectId], isArchived: newStatus } }));
        setContextMenu(null);

        try {
            await patchProjectMetadata(projectId, { is_archived: newStatus });
            onRefreshProjects();
        } catch (e) {
            console.error(e);
            // Revert
            setOptimisticUpdates(prev => {
                const next = { ...prev };
                delete next[projectId];
                return next;
            });
        }
    };

    const handleMoveToFolder = async (projectId: string, folderId: string | null) => {
        setOptimisticUpdates(prev => ({ ...prev, [projectId]: { ...prev[projectId], folderId } }));
        setContextMenu(null);

        try {
            await patchProjectMetadata(projectId, { folder_id: folderId });
            onRefreshProjects();
        } catch (e) {
            console.error(e);
            // Revert
            setOptimisticUpdates(prev => {
                const next = { ...prev };
                delete next[projectId];
                return next;
            });
        }
    };

    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over) {
            const projectId = active.id as string;
            const folderId = over.id === 'root' ? null : (over.id as string);
            handleMoveToFolder(projectId, folderId);
        }
        setActiveId(null);
    };

    const activeProject = useMemo(() => projects.find(p => p.id === activeId), [projects, activeId]);

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex h-[calc(100vh-64px)]" onClick={() => setContextMenu(null)}>
                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                {/* Sidebar - Mobile Drawer & Desktop Static */}
                <FolderList
                    className={`
                        fixed md:relative z-50 h-full
                        transition-transform duration-300 ease-in-out
                        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    `}
                    folders={folders}
                    selectedFolderId={selectedFolderId}
                    onSelectFolder={(id) => {
                        setSelectedFolderId(id);
                        setIsMobileMenuOpen(false);
                    }}
                    onCreateFolder={handleCreateFolder}
                    onUpdateFolder={handleUpdateFolder}
                    onDeleteFolder={handleDeleteFolder}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                />

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto bg-[#0f172a] relative flex flex-col">
                    {/* Mobile Header */}
                    <div className="md:hidden flex items-center p-4 border-b border-slate-800 bg-slate-900/50 flex-shrink-0">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMobileMenuOpen(true);
                            }}
                            className="p-2 -ml-2 text-slate-400 hover:text-white"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <span className="ml-2 font-bold text-white">ShortsAI</span>
                    </div>
                    {/* Context Menu */}
                    {contextMenu && (
                        <div
                            className="fixed bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1 w-48"
                            style={{ top: contextMenu.y, left: contextMenu.x }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => {
                                    const p = projects.find(p => p.id === contextMenu.projectId);
                                    if (p) handleArchive(p.id, !!p.isArchived);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                            >
                                <Archive className="w-4 h-4" />
                                {projects.find(p => p.id === contextMenu.projectId)?.isArchived ? t('folders.unarchive') : t('folders.archive')}
                            </button>

                            <div className="border-t border-slate-700 my-1" />
                            <div className="px-3 py-1 text-xs text-slate-500 font-semibold uppercase">{t('folders.move_to_folder')}</div>

                            <button
                                onClick={() => handleMoveToFolder(contextMenu.projectId, null)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                            >
                                <FolderInput className="w-4 h-4" />
                                {t('folders.root_folder')}
                            </button>

                            {[...folders].sort((a, b) => a.name.localeCompare(b.name)).map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => handleMoveToFolder(contextMenu.projectId, f.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white truncate"
                                >
                                    <Folder className="w-4 h-4" />
                                    {f.name}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="max-w-7xl mx-auto px-4 py-8">
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 animate-fade-in-up">
                            <div>
                                <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                                    {t('dashboard.hello', { name: user.name.split(' ')[0] })} <span className="animate-pulse">👋</span>
                                </h1>
                                <p className="text-slate-400 text-lg">{t('dashboard.subtitle')}</p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleExportContext}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                                    title="Export context for AI reference"
                                >
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">Export Context</span>
                                </button>

                                <button
                                    onClick={onNewProject}
                                    className="group relative inline-flex items-center justify-center px-6 py-2 font-bold text-white transition-all duration-200 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
                                >
                                    <Sparkles className="w-5 h-5 mr-2 text-indigo-200 group-hover:text-white transition-colors" />
                                    <span>{t('dashboard.create_magic')}</span>
                                </button>
                            </div>
                        </div>

                        {/* Filters Bar */}
                        <div className="flex items-center gap-4 mb-6 bg-slate-800/30 p-2 rounded-lg border border-slate-700/50">
                            <div className="flex items-center gap-2 text-slate-400 px-2">
                                <Filter className="w-4 h-4" />
                                <span className="text-sm font-medium">Filters:</span>
                            </div>

                            <input
                                type="text"
                                placeholder="Filter by tag..."
                                value={filterTag}
                                onChange={(e) => setFilterTag(e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded px-3 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                            />

                            <button
                                onClick={() => setShowArchived(!showArchived)}
                                className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${showArchived ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
                            >
                                <Archive className="w-4 h-4" />
                                {showArchived ? 'Showing Archived' : 'Show Archived'}
                            </button>

                            <div className="ml-auto text-sm text-slate-500">
                                {isLoading ? t('dashboard.syncing') : t('dashboard.projects_count_plural', { count: filteredProjects.length })}
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="w-full h-64 flex items-center justify-center bg-slate-800/30 rounded-3xl border border-slate-700/50">
                                <Loader text={t('dashboard.loading_projects')} />
                            </div>
                        ) : filteredProjects.length === 0 ? (
                            <div className="relative overflow-hidden bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-700/50 p-12 text-center group hover:border-indigo-500/30 transition-colors">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative z-10">
                                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl ring-4 ring-slate-800 group-hover:scale-110 transition-transform duration-300">
                                        <Film className="w-10 h-10 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-3">{t('dashboard.no_projects_title')}</h3>
                                    <p className="text-slate-400 mb-8 max-w-md mx-auto">
                                        {t('dashboard.no_projects_desc')}
                                    </p>
                                    <button onClick={onNewProject} className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline flex items-center justify-center gap-2 mx-auto">
                                        <Plus className="w-4 h-4" /> {t('dashboard.start_project')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredProjects.map((project) => (
                                    <ProjectCard
                                        key={project.id}
                                        project={project}
                                        onOpenProject={onOpenProject}
                                        onContextMenu={(e, id) => {
                                            e.preventDefault();
                                            setContextMenu({ x: e.clientX, y: e.clientY, projectId: id });
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <DragOverlay modifiers={[snapCenterToCursor]} dropAnimation={null}>
                {activeProject ? (
                    <div className="w-32 bg-slate-800 border border-indigo-500/50 rounded-lg shadow-2xl overflow-hidden opacity-90 pointer-events-none cursor-grabbing">
                        <div className="aspect-video bg-slate-900 relative">
                            {activeProject.scenes[0]?.imageUrl && (
                                <img src={activeProject.scenes[0].imageUrl} className="w-full h-full object-cover" />
                            )}
                        </div>
                        <div className="p-2">
                            <h3 className="font-bold text-white text-[10px] line-clamp-1 leading-tight">
                                {activeProject.generatedTitle || activeProject.topic}
                            </h3>
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default Dashboard;
