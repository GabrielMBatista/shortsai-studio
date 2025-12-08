import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Folder, Plus, MoreVertical, Edit2, Trash2, FolderOpen, Loader2, HelpCircle, PlayCircle, Settings, FileText, Video, Download, PanelLeft, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Folder as FolderType } from '../types';
import { useTranslation } from 'react-i18next';

interface FolderListProps {
    folders: FolderType[];
    rootCount?: number;
    selectedFolderId: string | null;
    onSelectFolder: (folderId: string | null) => void;
    onCreateFolder: (name: string) => Promise<void>;
    onUpdateFolder: (id: string, name: string) => Promise<void>;
    onDeleteFolder: (id: string) => Promise<void>;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    className?: string;
    isLoading?: boolean;
    updatingFolderId?: string | null;
    onStartTour: (tour: 'settings' | 'creation' | 'script' | 'preview' | 'export') => void;
}

const FolderList: React.FC<FolderListProps> = ({
    folders,
    rootCount = 0,
    selectedFolderId,
    onSelectFolder,
    onCreateFolder,
    onUpdateFolder,
    onDeleteFolder,
    isCollapsed,
    onToggleCollapse,
    className,
    isLoading,
    updatingFolderId,
    onStartTour
}) => {
    const { t } = useTranslation();
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    const toggleFolder = (folderId: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            const folder = folders.find(f => f.id === folderId);

            if (next.has(folderId)) {
                // Collapse
                next.delete(folderId);
            } else {
                // Expand (and implement Accordion: Collapse siblings)
                if (folder) {
                    const siblings = folders.filter(f => f.parent_id === folder.parent_id && f.id !== folderId);
                    siblings.forEach(s => next.delete(s.id));
                }
                next.add(folderId);
            }
            return next;
        });
    };

    // Auto-expand parent of selected folder on mount/change, but avoid infinite loops or fighting user interaction
    React.useEffect(() => {
        if (selectedFolderId) {
            const selected = folders.find(f => f.id === selectedFolderId);
            if (selected && selected.parent_id) {
                // Ensure parent is open
                setExpandedFolders(prev => {
                    const next = new Set(prev);
                    next.add(selected.parent_id!);
                    return next;
                });
            }
        }
    }, [selectedFolderId, folders]);

    const handleCreate = async () => {
        if (!newFolderName.trim()) return;
        try {
            await onCreateFolder(newFolderName);
            setNewFolderName('');
            setIsCreating(false);
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return;
        try {
            await onUpdateFolder(id, editName);
            setEditingFolderId(null);
            setMenuOpenId(null);
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('folders.delete_confirm'))) return;
        try {
            await onDeleteFolder(id);
            if (selectedFolderId === id) onSelectFolder(null);
            setMenuOpenId(null);
        } catch (e) {
            console.error(e);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    return (
        <div className={`bg-slate-900 md:bg-slate-900/50 border-r border-slate-800 flex flex-col gap-2 h-screen transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} ${className || ''}`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-4 mb-2`}>
                {!isCollapsed && <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t('folders.title')}</h3>}
                <div className="flex gap-1">
                    {!isCollapsed && (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={onToggleCollapse}
                        className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                    >
                        {isCollapsed ? (
                            <div className="flex items-center gap-0.5"><PanelLeft className="w-4 h-4" /><ChevronRight className="w-3 h-3" /></div>
                        ) : (
                            <div className="flex items-center gap-0.5"><ChevronLeft className="w-3 h-3" /><PanelLeft className="w-4 h-4 rotate-180" /></div>
                        )}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                <DroppableFolder id="root" className={`rounded-lg transition-colors ${isCollapsed ? 'justify-center' : ''}`}>
                    <button
                        onClick={() => onSelectFolder(null)}
                        className={`flex items-center gap-3 px-3 py-2 w-full rounded-lg transition-colors text-sm font-medium ${selectedFolderId === null
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            } ${isCollapsed ? 'justify-center flex-col gap-1 py-3' : ''}`}
                        title={isCollapsed ? t('folders.home') : undefined}
                    >
                        {selectedFolderId === null ? (
                            <FolderOpen className="w-4 h-4 flex-shrink-0" />
                        ) : (
                            <Folder className="w-4 h-4 flex-shrink-0" />
                        )}
                        {!isCollapsed ? (
                            <>
                                <span className="truncate flex-1 text-left">{t('folders.home')}</span>
                                {rootCount > 0 && <span className="text-xs text-slate-500">({rootCount})</span>}
                            </>
                        ) : <span className="text-[10px] font-bold">{t('folders.all')}</span>}
                    </button>
                </DroppableFolder>

                {!isCollapsed && isCreating && (
                    <div className="flex items-center gap-2 px-2 py-1">
                        <input
                            autoFocus
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            onBlur={() => setIsCreating(false)}
                            placeholder={t('folders.new_folder_placeholder')}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                )}

                <div className="space-y-1 pt-1">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={`h-9 rounded-lg bg-slate-800/50 animate-pulse ${isCollapsed ? 'mx-1' : ''}`} />
                        ))
                    ) : (
                        // Recursive Function to Render Folders
                        (function renderFolders(folderList: FolderType[], parentId: string | null = null, depth: number = 0): React.ReactNode {
                            const currentLevelFolders = folderList.filter(f => f.parent_id === parentId || (parentId === null && !f.parent_id));

                            if (currentLevelFolders.length === 0) return null;


                            return currentLevelFolders.map(folder => {
                                const isExpanded = expandedFolders.has(folder.id);
                                const hasChildren = folderList.some(f => f.parent_id === folder.id);

                                return (
                                    <React.Fragment key={folder.id}>
                                        <DroppableFolder
                                            id={folder.id}
                                            className={`rounded-lg transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                                        >
                                            <div
                                                className={`group flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer ${selectedFolderId === folder.id
                                                    ? 'bg-indigo-500/20 text-indigo-400'
                                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                                    } ${isCollapsed ? 'justify-center flex-col gap-1 py-3' : ''}`}
                                                style={{ marginLeft: !isCollapsed ? `${depth * 12}px` : 0 }}
                                                onClick={(e) => {
                                                    onSelectFolder(folder.id);
                                                    // Auto expand if selecting
                                                    if (!expandedFolders.has(folder.id)) toggleFolder(folder.id);
                                                }}
                                                title={isCollapsed ? folder.name : undefined}
                                            >
                                                {!isCollapsed && editingFolderId === folder.id ? (
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate(folder.id)}
                                                        onBlur={() => setEditingFolderId(null)}
                                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <>
                                                        <div className={`flex items-center gap-2 truncate ${isCollapsed ? 'justify-center w-full flex-col gap-1' : ''}`}>
                                                            {/* Expand/Collapse Chevron */}
                                                            {!isCollapsed && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleFolder(folder.id);
                                                                    }}
                                                                    className={`p-0.5 rounded-sm hover:bg-slate-700 transition-colors ${hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                                                                >
                                                                    {isExpanded ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
                                                                </button>
                                                            )}

                                                            {selectedFolderId === folder.id ? (
                                                                <FolderOpen className="w-4 h-4 flex-shrink-0" />
                                                            ) : (
                                                                <Folder className="w-4 h-4 flex-shrink-0" />
                                                            )}
                                                            {!isCollapsed ? (
                                                                <>
                                                                    <span className="truncate">{folder.name}</span>
                                                                    {updatingFolderId === folder.id ? (
                                                                        <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                                                                    ) : folder._count?.projects ? (
                                                                        <span className="text-xs text-slate-500">({folder._count.projects})</span>
                                                                    ) : null}
                                                                </>
                                                            ) : (
                                                                <span className="text-[10px] font-bold">{getInitials(folder.name)}</span>
                                                            )}
                                                        </div>

                                                        {!isCollapsed && (
                                                            <div className="relative">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setMenuOpenId(menuOpenId === folder.id ? null : folder.id);
                                                                    }}
                                                                    className={`p-1 rounded hover:bg-slate-700 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ${menuOpenId === folder.id ? 'opacity-100 bg-slate-700' : ''}`}
                                                                >
                                                                    <MoreVertical className="w-3 h-3" />
                                                                </button>

                                                                {menuOpenId === folder.id && (
                                                                    <div className="absolute right-0 top-6 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setEditingFolderId(folder.id);
                                                                                setEditName(folder.name);
                                                                                setMenuOpenId(null);
                                                                            }}
                                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                                                                        >
                                                                            <Edit2 className="w-3 h-3" /> {t('folders.rename')}
                                                                        </button>

                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDelete(folder.id);
                                                                            }}
                                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-slate-700 hover:text-red-300"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" /> {t('folders.delete')}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </DroppableFolder>
                                        {/* Render Children Only if Expanded */}
                                        {isExpanded && renderFolders(folderList, folder.id, depth + 1)}
                                    </React.Fragment>
                                );
                            });
                        })(folders)
                    )}
                </div>

                {/* Tours Section - Desktop Only (Mobile has icon in header) */}
                <div className={`mt-4 border-t border-slate-800 pt-2 flex-col gap-1 pb-4 hidden md:flex`}>
                    {!isCollapsed && <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-2 mb-1">{t('nav.tours_title')}</h3>}

                    <button
                        onClick={() => onStartTour('settings')}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors relative ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? t('nav.settings_tour') : undefined}
                    >
                        <Settings className="w-4 h-4 flex-shrink-0 animate-[pulse_3s_ease-in-out_infinite] text-blue-400/70" />
                        {!isCollapsed && <span className="text-sm truncate">{t('nav.settings_tour')}</span>}
                        <div className="absolute inset-0 bg-blue-500/5 rounded-lg animate-[pulse_3s_ease-in-out_infinite] pointer-events-none"></div>
                    </button>

                    <button
                        onClick={() => onStartTour('creation')}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors relative ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? t('nav.creation_tour') : undefined}
                    >
                        <PlayCircle className="w-4 h-4 flex-shrink-0 animate-[pulse_3s_ease-in-out_infinite_0.6s] text-green-400/70" />
                        {!isCollapsed && <span className="text-sm truncate">{t('nav.creation_tour')}</span>}
                        <div className="absolute inset-0 bg-green-500/5 rounded-lg animate-[pulse_3s_ease-in-out_infinite_0.6s] pointer-events-none"></div>
                    </button>

                    <button
                        onClick={() => onStartTour('script')}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors relative ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? t('nav.script_tour') : undefined}
                    >
                        <FileText className="w-4 h-4 flex-shrink-0 animate-[pulse_3s_ease-in-out_infinite_1.2s] text-purple-400/70" />
                        {!isCollapsed && <span className="text-sm truncate">{t('nav.script_tour')}</span>}
                        <div className="absolute inset-0 bg-purple-500/5 rounded-lg animate-[pulse_3s_ease-in-out_infinite_1.2s] pointer-events-none"></div>
                    </button>
                    <button
                        onClick={() => onStartTour('preview')}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors relative ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? t('nav.preview_tour') : undefined}
                    >
                        <Video className="w-4 h-4 flex-shrink-0 animate-[pulse_3s_ease-in-out_infinite_1.8s] text-orange-400/70" />
                        {!isCollapsed && <span className="text-sm truncate">{t('nav.preview_tour')}</span>}
                        <div className="absolute inset-0 bg-orange-500/5 rounded-lg animate-[pulse_3s_ease-in-out_infinite_1.8s] pointer-events-none"></div>
                    </button>
                    <button
                        onClick={() => onStartTour('export')}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors relative ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? t('nav.export_tour') : undefined}
                    >
                        <Download className="w-4 h-4 flex-shrink-0 animate-[pulse_3s_ease-in-out_infinite_2.4s] text-pink-400/70" />
                        {!isCollapsed && <span className="text-sm truncate">{t('nav.export_tour')}</span>}
                        <div className="absolute inset-0 bg-pink-500/5 rounded-lg animate-[pulse_3s_ease-in-out_infinite_2.4s] pointer-events-none"></div>
                    </button>
                </div>
            </div>
        </div >
    );
};

interface DroppableFolderProps {
    id: string;
    children: React.ReactNode;
    className?: string;
}

const DroppableFolder: React.FC<DroppableFolderProps> = ({ id, children, className }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div
            ref={setNodeRef}
            className={`${className || ''} transition-all duration-200 ${isOver ? 'bg-indigo-500/40 ring-2 ring-indigo-400 ring-inset scale-[1.02] shadow-lg shadow-indigo-500/20 z-10' : ''}`}
        >
            {children}
        </div>
    );
};

export default FolderList;
