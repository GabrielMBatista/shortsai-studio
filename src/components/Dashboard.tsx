import React, { useState, useMemo, useEffect } from 'react';
import { User, VideoProject, Folder as FolderType } from '../types';
import { Plus, Clock, Film, Play, Trash2, Zap, Sparkles, ArrowRight, Archive, Download, Filter, MoreVertical, FolderInput, Folder, Menu, X, Loader2, HelpCircle, Settings, PlayCircle, FileText, Video, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FolderList from './FolderList';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useSensor, useSensors, PointerSensor, pointerWithin } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import ProjectCard from './ProjectCard';
import ProjectCardSkeleton from './ProjectCardSkeleton';
import { exportProjectContext, patchProjectMetadata, getFolders, createFolder, updateFolder, deleteFolder } from '../services/storageService';
import Pagination from './Pagination';

interface DashboardProps {
    user: User;
    projects: VideoProject[];
    onNewProject: () => void;
    onOpenProject: (project: VideoProject) => void;
    onDeleteProject: (projectId: string) => void;
    onRefreshProjects: () => void;
    isLoading?: boolean;
    isFetching?: boolean;
    showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
    page?: number;
    setPage?: (page: number) => void;
    totalPages?: number;
    selectedFolderId: string | null;
    setSelectedFolderId: (id: string | null) => void;
    showArchived: boolean;
    setShowArchived: (show: boolean) => void;
    onStartTour: (tour: 'settings' | 'creation' | 'script' | 'preview' | 'export') => void;
}

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    return isMobile;
};

const Dashboard: React.FC<DashboardProps> = ({
    user,
    projects,
    onNewProject,
    onOpenProject,
    onDeleteProject,
    onRefreshProjects,
    isLoading = false,
    isFetching = false,
    showToast,
    page,
    setPage,
    totalPages,
    selectedFolderId,
    setSelectedFolderId,
    showArchived,
    setShowArchived,
    onStartTour
}) => {
    const { t } = useTranslation();
    const isMobile = useIsMobile();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileTourMenuOpen, setIsMobileTourMenuOpen] = useState(false);

    const handleCreateFolder = async (name: string) => {
        await createFolder(name);
        handleRefreshFolders();
        onRefreshProjects();
    };

    const handleUpdateFolder = async (id: string, name: string) => {
        await updateFolder(id, name);
        handleRefreshFolders();
        onRefreshProjects();
    };

    const handleDeleteFolder = async (id: string) => {
        await deleteFolder(id);
        handleRefreshFolders();
        onRefreshProjects();
    };
    const [folders, setFolders] = useState<FolderType[]>([]);
    const [rootCount, setRootCount] = useState(0);
    const [isLoadingFolders, setIsLoadingFolders] = useState(true);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, projectId: string } | null>(null);
    const [permanentDeleteModal, setPermanentDeleteModal] = useState<{ isOpen: boolean; projectId: string | null; projectTitle: string | null }>({ isOpen: false, projectId: null, projectTitle: null });

    useEffect(() => {
        setIsLoadingFolders(true);
        getFolders().then(({ folders, rootCount }) => {
            setFolders(folders);
            setRootCount(rootCount);
            setIsLoadingFolders(false);
        });

        // Reset page to 1 on mount to ensure we start from the beginning
        // and don't get stuck on a later page with partial data upon return
        if (setPage) setPage(1);
    }, []);

    const handleRefreshFolders = () => {
        // Don't set loading here to avoid flickering on every small update, or maybe do?
        // Let's keep it silent for background updates, but we can set it if we want.
        // For now, let's just fetch.
        getFolders().then(({ folders, rootCount }) => {
            setFolders(folders);
            setRootCount(rootCount);
        });
    };

    // Calculate how many skeletons to show
    const skeletonCount = useMemo(() => {
        if (selectedFolderId) {
            const folder = folders.find(f => f.id === selectedFolderId);
            return folder?._count?.projects || 8;
        }
        return rootCount || 8;
    }, [selectedFolderId, folders, rootCount]);

    // Refresh folders when projects change (to update counts)
    useEffect(() => {
        handleRefreshFolders();
    }, [projects]);

    const formatDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, Partial<VideoProject>>>({});

    // Clear optimistic updates when projects are refreshed from backend
    useEffect(() => {
        setOptimisticUpdates({});
    }, [projects]);

    useEffect(() => {
        setOptimisticUpdates({});
    }, [projects]);

    // Infinite Scroll Logic
    const [allProjects, setAllProjects] = useState<VideoProject[]>([]);
    const observerTarget = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (page === 1) {
            setAllProjects(projects);
        } else {
            setAllProjects(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const newProjects = projects.filter(p => !existingIds.has(p.id));
                return [...prev, ...newProjects];
            });
        }
    }, [projects, page]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !isLoading && page && totalPages && page < totalPages) {
                    setPage && setPage(page + 1);
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [isLoading, page, totalPages, setPage]);

    const projectsSource = page === 1 ? projects : allProjects;

    const filteredProjects = useMemo(() => {
        return projectsSource.map(p => ({ ...p, ...optimisticUpdates[p.id] })).filter(p => {
            // Optimistic filtering
            if (showArchived) {
                return p.isArchived;
            }

            // Default view (isArchived=false)
            if (p.isArchived) return false;

            if (selectedFolderId) {
                // Showing a specific folder
                return p.folderId === selectedFolderId;
            } else {
                // Home/Root view: Show projects with NO folderId (null or undefined)
                return !p.folderId;
            }

            return true;
        });
    }, [projectsSource, selectedFolderId, showArchived, optimisticUpdates]);

    const handleExportContext = async () => {
        try {
            const data = await exportProjectContext(selectedFolderId, undefined);
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
            handleRefreshFolders();
            if (showToast) showToast(newStatus ? t('folders.archived_success') : t('folders.unarchived_success'), 'success');
        } catch (e) {
            console.error(e);
            // Revert
            setOptimisticUpdates(prev => {
                const next = { ...prev };
                delete next[projectId];
                return next;
            });
            if (showToast) showToast(t('common.error'), 'error');
        }
    };

    const [updatingFolderId, setUpdatingFolderId] = useState<string | null>(null);

    const handleMoveToFolder = async (projectId: string, folderId: string | null) => {
        setOptimisticUpdates(prev => ({ ...prev, [projectId]: { ...prev[projectId], folderId } }));
        setContextMenu(null);
        if (folderId) setUpdatingFolderId(folderId);

        try {
            await patchProjectMetadata(projectId, { folder_id: folderId });
            onRefreshProjects();
            handleRefreshFolders();
            if (showToast) showToast(t('folders.move_success'), 'success');
        } catch (e) {
            console.error(e);
            // Revert
            setOptimisticUpdates(prev => {
                const next = { ...prev };
                delete next[projectId];
                return next;
            });
            if (showToast) showToast(t('common.error'), 'error');
        } finally {
            setUpdatingFolderId(null);
        }
    };

    const handlePermanentDelete = async () => {
        const id = permanentDeleteModal.projectId;
        if (!id) return;
        setPermanentDeleteModal({ isOpen: false, projectId: null, projectTitle: null });

        try {
            await onDeleteProject(id);
            onRefreshProjects();
            handleRefreshFolders();
            if (showToast) showToast(t('dashboard.delete_success'), 'success');
        } catch (e) {
            console.error(e);
            if (showToast) showToast(t('common.error'), 'error');
        }
    };

    const handleRequestPermanentDelete = (projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const title = project.generatedTitle || project.topic || t('app.untitled_project');
        setPermanentDeleteModal({ isOpen: true, projectId, projectTitle: title });
        setContextMenu(null);
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
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex min-h-[calc(100vh-64px)]" onClick={() => setContextMenu(null)}>
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
                        fixed md:sticky md:top-16 z-50 h-[calc(100vh-64px)]
                        transition-transform duration-300 ease-in-out
                        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    `}
                    folders={folders}
                    rootCount={rootCount}
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
                    isLoading={isLoadingFolders}
                    updatingFolderId={updatingFolderId}
                    onStartTour={onStartTour}
                />

                {/* Main Content */}
                <div className="flex-1 bg-[#0f172a] relative flex flex-col">
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
                        <div className="ml-auto relative md:hidden">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMobileTourMenuOpen(!isMobileTourMenuOpen);
                                }}
                                className="p-2 text-indigo-400 hover:text-white bg-indigo-500/10 rounded-full animate-pulse transition-all relative z-50"
                            >
                                <HelpCircle className="w-6 h-6" />
                            </button>

                            {isMobileTourMenuOpen && (
                                <div className="absolute right-0 top-12 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in-up">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 border-b border-slate-700">{t('nav.tours_title')}</h3>
                                    <div className="flex flex-col p-1">
                                        <button onClick={() => { onStartTour('settings'); setIsMobileTourMenuOpen(false); }} className="flex items-center gap-3 px-3 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors text-left">
                                            <Settings className="w-4 h-4 animate-[pulse_3s_ease-in-out_infinite] text-blue-400/70" />
                                            {t('nav.settings_tour')}
                                        </button>
                                        <button onClick={() => { onStartTour('creation'); setIsMobileTourMenuOpen(false); }} className="flex items-center gap-3 px-3 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors text-left">
                                            <PlayCircle className="w-4 h-4 animate-[pulse_3s_ease-in-out_infinite_0.6s] text-green-400/70" />
                                            {t('nav.creation_tour')}
                                        </button>
                                        <button onClick={() => { onStartTour('script'); setIsMobileTourMenuOpen(false); }} className="flex items-center gap-3 px-3 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors text-left">
                                            <FileText className="w-4 h-4 animate-[pulse_3s_ease-in-out_infinite_1.2s] text-purple-400/70" />
                                            {t('nav.script_tour')}
                                        </button>
                                        <button onClick={() => { onStartTour('preview'); setIsMobileTourMenuOpen(false); }} className="flex items-center gap-3 px-3 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors text-left">
                                            <Video className="w-4 h-4 animate-[pulse_3s_ease-in-out_infinite_1.8s] text-orange-400/70" />
                                            {t('nav.preview_tour')}
                                        </button>
                                        <button onClick={() => { onStartTour('export'); setIsMobileTourMenuOpen(false); }} className="flex items-center gap-3 px-3 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors text-left">
                                            <Download className="w-4 h-4 animate-[pulse_3s_ease-in-out_infinite_2.4s] text-pink-400/70" />
                                            {t('nav.export_tour')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Close overlay if open */}
                            {isMobileTourMenuOpen && (
                                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsMobileTourMenuOpen(false)} />
                            )}
                        </div>
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

                            {/* Permanent Delete Button (only for archived projects) */}
                            {projects.find(p => p.id === contextMenu.projectId)?.isArchived && (
                                <>
                                    <div className="border-t border-slate-700 my-1" />
                                    <button
                                        onClick={() => handleRequestPermanentDelete(contextMenu.projectId)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        {t('dashboard.delete_permanently')}
                                    </button>
                                </>
                            )}

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

                    <div className="w-full px-6 py-8">
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
                                    title={t('dashboard.export_context')}
                                >
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">{t('dashboard.export_context')}</span>
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
                            <button
                                onClick={() => setShowArchived(!showArchived)}
                                className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${showArchived ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
                            >
                                <Archive className="w-4 h-4" />
                                {showArchived ? t('dashboard.showing_archived') : t('dashboard.show_archived')}
                            </button>

                            <div className="ml-auto text-sm text-slate-500">
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> : t('dashboard.projects_count_plural', { count: filteredProjects.length })}
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex flex-col gap-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                                    {Array.from({ length: Math.min(Math.max(skeletonCount, 4), 12) }).map((_, i) => (
                                        <ProjectCardSkeleton key={i} />
                                    ))}
                                </div>
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
                            <div className="flex flex-col gap-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
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

                                {totalPages && page && page < totalPages && (
                                    <div ref={observerTarget} className="h-20 flex items-center justify-center w-full">
                                        {isFetching && <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <DragOverlay modifiers={[snapCenterToCursor]} dropAnimation={null}>
                {activeProject ? (
                    <div className="w-32 bg-slate-800 border border-indigo-500/50 rounded-lg shadow-2xl overflow-hidden opacity-50 pointer-events-none cursor-grabbing">
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

            {/* Permanent Delete Confirmation Modal */}
            {permanentDeleteModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border-2 border-red-500/30 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden ring-1 ring-red-500/20">
                        <div className="bg-gradient-to-r from-red-600/20 to-red-500/20 border-b border-red-500/30 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/20 rounded-full">
                                    <Trash2 className="w-6 h-6 text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{t('dashboard.delete_permanently_title')}</h3>
                                    <p className="text-sm text-red-400">{t('dashboard.irreversible_action')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    {t('dashboard.delete_permanently_warning')}
                                    <span className="block mt-2 font-semibold text-white line-clamp-3 max-h-32 overflow-hidden text-ellipsis w-full">"{permanentDeleteModal.projectTitle}"</span>
                                </p>
                            </div>

                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-yellow-200/90 leading-relaxed">
                                    <p className="font-semibold mb-1">{t('dashboard.assets_will_be_deleted')}</p>
                                    <p className="opacity-80">{t('dashboard.assets_deleted_description')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 px-6 py-4 flex gap-3">
                            <button
                                onClick={() => setPermanentDeleteModal({ isOpen: false, projectId: null, projectTitle: null })}
                                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handlePermanentDelete}
                                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                {t('dashboard.delete_confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DndContext>
    );
};

export default Dashboard;
