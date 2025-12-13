import React, { useState } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { Folder, Plus, MoreVertical, Edit2, Trash2, FolderOpen, Loader2, HelpCircle, PlayCircle, Settings, FileText, Video, Download, PanelLeft, ChevronLeft, ChevronRight, ChevronDown, FolderInput, GripVertical, Youtube } from 'lucide-react';
import { Folder as FolderType } from '../types';
import { useTranslation } from 'react-i18next';
import { CSS } from '@dnd-kit/utilities';

interface FolderListProps {
    folders: FolderType[];
    rootCount?: number;
    selectedFolderId: string | null;
    onSelectFolder: (folderId: string | null) => void;
    onCreateFolder: (name: string, parentId?: string) => Promise<void>;
    onUpdateFolder: (id: string, name?: string, parentId?: string | null, channelId?: string | null) => Promise<void>;
    onDeleteFolder: (id: string) => Promise<void>;
    onLinkToChannel?: (folder: FolderType) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    className?: string;
    isLoading?: boolean;
    updatingFolderId?: string | null;
    onStartTour: (tour: 'settings' | 'creation' | 'script' | 'preview' | 'export' | 'folders') => void;
}

const FolderList: React.FC<FolderListProps> = ({
    folders,
    rootCount = 0,
    selectedFolderId,
    onSelectFolder,
    onCreateFolder,
    onUpdateFolder,
    onDeleteFolder,
    onLinkToChannel,
    isCollapsed,
    onToggleCollapse,
    className,
    isLoading,
    updatingFolderId,
    onStartTour
}) => {
    const { t } = useTranslation();
    const [isCreatingRoot, setIsCreatingRoot] = useState(false);
    const [creatingSubfolderId, setCreatingSubfolderId] = useState<string | null>(null);
    const [newFolderName, setNewFolderName] = useState('');
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    const toggleFolder = (folderId: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    };

    // Auto-expand parent of selected folder on mount/change
    React.useEffect(() => {
        if (selectedFolderId) {
            const selected = folders.find(f => f.id === selectedFolderId);
            if (selected && selected.parent_id) {
                setExpandedFolders(prev => {
                    const next = new Set(prev);
                    // Add all ancestors
                    let current = selected;
                    while (current && current.parent_id) {
                        next.add(current.parent_id);
                        const parent = folders.find(f => f.id === current!.parent_id);
                        current = parent!; // ! assertion safe enough here
                        if (!parent) break;
                    }
                    return next;
                });
            }
        }
    }, [selectedFolderId, folders]);

    const handleCreate = async (parentId?: string) => {
        if (!newFolderName.trim()) return;
        try {
            await onCreateFolder(newFolderName, parentId);
            setNewFolderName('');
            setIsCreatingRoot(false);
            setCreatingSubfolderId(null);
            if (parentId) {
                // Auto expand parent
                setExpandedFolders(prev => new Set(prev).add(parentId));
            }
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

    // Recursive Renderer
    const renderFolders = (folderList: FolderType[], parentId: string | null = null, depth: number = 0): React.ReactNode => {
        const currentLevelFolders = folderList.filter(f => f.parent_id === parentId || (parentId === null && !f.parent_id));

        return (
            <React.Fragment>
                {currentLevelFolders.map(folder => {
                    const isExpanded = expandedFolders.has(folder.id);
                    const hasChildren = folderList.some(f => f.parent_id === folder.id);
                    const isCreatingChild = creatingSubfolderId === folder.id;

                    return (
                        <div key={folder.id}>
                            <DraggableDroppableFolder
                                folder={folder}
                                isSelected={selectedFolderId === folder.id}
                                isCollapsed={isCollapsed}
                                depth={depth}
                                isExpanded={isExpanded}
                                hasChildren={hasChildren}
                                onToggle={() => toggleFolder(folder.id)}
                                onSelect={() => onSelectFolder(folder.id)}
                                isEditing={editingFolderId === folder.id}
                                editName={editName}
                                onEditNameChange={setEditName}
                                onEditSubmit={() => handleUpdate(folder.id)}
                                onEditBlur={() => setEditingFolderId(null)}
                                menuOpenId={menuOpenId}
                                onMenuToggle={(e) => {
                                    e.stopPropagation();
                                    setMenuOpenId(menuOpenId === folder.id ? null : folder.id);
                                }}
                                onRename={() => {
                                    setEditingFolderId(folder.id);
                                    setEditName(folder.name);
                                    setMenuOpenId(null);
                                }}
                                onDelete={() => handleDelete(folder.id)}
                                onAddSubfolder={() => {
                                    setCreatingSubfolderId(folder.id);
                                    setNewFolderName('');
                                    setMenuOpenId(null);
                                    if (!isExpanded) toggleFolder(folder.id);
                                }}
                                onLinkToChannel={onLinkToChannel}
                                setMenuOpenId={setMenuOpenId}
                                updatingFolderId={updatingFolderId}
                                getInitials={getInitials}
                                t={t}
                            />

                            {/* Children */}
                            {(isExpanded || isCreatingChild) && (
                                <>
                                    {isCreatingChild && (
                                        <div className="flex items-center gap-2 px-2 py-1" style={{ marginLeft: !isCollapsed ? `${(depth + 1) * 12}px` : 0 }}>
                                            <input
                                                autoFocus
                                                type="text"
                                                value={newFolderName}
                                                onChange={(e) => setNewFolderName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleCreate(folder.id);
                                                    if (e.key === 'Escape') setCreatingSubfolderId(null);
                                                }}
                                                onBlur={() => setCreatingSubfolderId(null)}
                                                placeholder={t('folders.new_subfolder_placeholder') || "Subfolder name..."}
                                                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    )}
                                    {renderFolders(folderList, folder.id, depth + 1)}
                                </>
                            )}
                        </div>
                    );
                })}
            </React.Fragment>
        );
    };

    return (
        <div className={`bg-slate-900 md:bg-slate-900/50 border-r border-slate-800 flex flex-col gap-2 h-screen transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} ${className || ''}`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-4 mb-2`}>
                {!isCollapsed && <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t('folders.title')}</h3>}
                <div className="flex gap-1">
                    {!isCollapsed && (
                        <button
                            id="btn-create-root-folder"
                            onClick={() => setIsCreatingRoot(true)}
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
                        id="folder-list-root-item"
                        onClick={() => {
                            onSelectFolder(null);
                            setExpandedFolders(new Set());
                        }}
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

                {!isCollapsed && isCreatingRoot && (
                    <div className="flex items-center gap-2 px-2 py-1">
                        <input
                            autoFocus
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreate();
                                if (e.key === 'Escape') setIsCreatingRoot(false);
                            }}
                            onBlur={() => setIsCreatingRoot(false)}
                            placeholder={t('folders.new_folder_placeholder')}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                )}

                <div className="space-y-1 pt-1" id="folder-tree-container">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={`h-9 rounded-lg bg-slate-800/50 animate-pulse ${isCollapsed ? 'mx-1' : ''}`} />
                        ))
                    ) : (
                        renderFolders(folders)
                    )}
                </div>

                {/* Tours Section */}
                <div className={`mt-4 border-t border-slate-800 pt-2 flex-col gap-1 pb-4 flex`}>
                    {!isCollapsed && <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-2 mb-1">{t('nav.tours_title')}</h3>}
                    {/* ...Tours buttons kept same as original, just re-rendering to ensure structure ... */}
                    {['settings', 'creation', 'script', 'preview', 'export', 'folders'].map(tour => (
                        <button
                            key={tour}
                            onClick={() => onStartTour(tour as any)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors relative ${isCollapsed ? 'justify-center' : ''}`}
                            title={isCollapsed ? t(`nav.${tour}_tour`) : undefined}
                        >
                            {tour === 'settings' && <Settings className="w-4 h-4 flex-shrink-0 animate-[pulse_3s_ease-in-out_infinite] text-blue-400/70" />}
                            {tour === 'creation' && <PlayCircle className="w-4 h-4 flex-shrink-0 animate-[pulse_3s_ease-in-out_infinite_0.6s] text-green-400/70" />}
                            {tour === 'script' && <FileText className="w-4 h-4 flex-shrink-0 animate-[pulse_3s_ease-in-out_infinite_1.2s] text-purple-400/70" />}
                            {tour === 'preview' && <Video className="w-4 h-4 flex-shrink-0 animate-[pulse_3s_ease-in-out_infinite_1.8s] text-orange-400/70" />}
                            {tour === 'export' && <Download className="w-4 h-4 flex-shrink-0 animate-[pulse_3s_ease-in-out_infinite_2.4s] text-pink-400/70" />}
                            {tour === 'folders' && <Folder className="w-4 h-4 flex-shrink-0 animate-[pulse_3s_ease-in-out_infinite_3.0s] text-yellow-400/70" />}
                            {!isCollapsed && <span className="text-sm truncate">{t(`nav.${tour}_tour`)}</span>}
                        </button>
                    ))}
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
            id={id === 'root' ? 'root-folder-droppable' : undefined}
        >
            {children}
        </div>
    );
};

// Combined Draggable and Droppable Logic for each folder item
const DraggableDroppableFolder: React.FC<{
    folder: FolderType,
    isSelected: boolean,
    isCollapsed: boolean,
    depth: number,
    isExpanded: boolean,
    hasChildren: boolean,
    onToggle: () => void,
    onSelect: () => void,
    isEditing: boolean,
    editName: string,
    onEditNameChange: (val: string) => void,
    onEditSubmit: () => void,
    onEditBlur: () => void,
    menuOpenId: string | null,
    onMenuToggle: (e: React.MouseEvent) => void,
    onRename: () => void,
    onDelete: () => void,
    onAddSubfolder: () => void,
    onLinkToChannel?: (folder: FolderType) => void,
    setMenuOpenId: (id: string | null) => void,
    updatingFolderId: string | null,
    getInitials: (n: string) => string,
    t: any
}> = ({
    folder, isSelected, isCollapsed, depth, isExpanded, hasChildren, onToggle, onSelect,
    isEditing, editName, onEditNameChange, onEditSubmit, onEditBlur,
    menuOpenId, onMenuToggle, onRename, onDelete, onAddSubfolder, onLinkToChannel, setMenuOpenId,
    updatingFolderId, getInitials, t
}) => {
        // Make it droppable (to receive files OR other folders)
        const { setNodeRef: setDropRef, isOver } = useDroppable({ id: folder.id, data: { type: 'folder', folder } });

        // Make it draggable (to move THIS folder)
        const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
            id: `folder-${folder.id}`, // Unique ID for drag to avoid conflict with drop
            data: { type: 'folder_drag', folder }
        });

        const style = transform ? {
            transform: CSS.Translate.toString(transform),
            zIndex: 50,
            opacity: 0.8
        } : undefined;

        return (
            <div
                id={`folder-item-${folder.id}`}
                ref={(node) => {
                    setDropRef(node);
                    // We don't necessarily want the WHOLE drop area to be the drag handle, but consistent with request.
                    // We'll use a specific grip handle or just allow dragging the item.
                    setDragRef(node);
                }}
                style={style}
                {...attributes}
                {...listeners}
                className={`rounded-lg transition-colors ${isCollapsed ? 'justify-center' : ''} ${isOver ? 'bg-indigo-500/40 ring-2 ring-indigo-400 ring-inset' : ''} ${isDragging ? 'bg-slate-800 shadow-xl border border-slate-600' : ''}`}
            >
                <div
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer ${isSelected
                        ? 'bg-indigo-500/20 text-indigo-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        } ${isCollapsed ? 'justify-center flex-col gap-1 py-3' : ''}`}
                    style={{ marginLeft: !isCollapsed ? `${depth * 12}px` : 0 }}
                    onClick={(e) => {
                        onSelect();
                        if (!isExpanded && hasChildren) {
                            onToggle();
                        }
                    }}
                    title={isCollapsed ? folder.name : undefined}
                >
                    {!isCollapsed && isEditing ? (
                        <input
                            autoFocus
                            type="text"
                            value={editName}
                            onChange={(e) => onEditNameChange(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onEditSubmit()}
                            onBlur={onEditBlur}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <>
                            <div className={`flex items-center gap-2 truncate ${isCollapsed ? 'justify-center w-full flex-col gap-1' : ''}`}>
                                {/* Drag Handle - visual indication */}
                                {!isCollapsed && <GripVertical className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 cursor-grab" />}

                                {/* Expand/Collapse Chevron */}
                                {!isCollapsed && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggle();
                                        }}
                                        className={`p-0.5 rounded-sm hover:bg-slate-700 transition-colors ${hasChildren ? 'opacity-100' : 'opacity-0'}`}
                                    >
                                        {isExpanded ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
                                    </button>
                                )}

                                {isSelected ? (
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
                                        id={`folder-menu-btn-${folder.id}`}
                                        onPointerDown={(e) => e.stopPropagation()} // Prevent drag start when clicking menu
                                        onClick={(e) => onMenuToggle(e)}
                                        className={`p-1 rounded hover:bg-slate-700 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ${menuOpenId === folder.id ? 'opacity-100 bg-slate-700' : ''}`}
                                    >
                                        <MoreVertical className="w-3 h-3" />
                                    </button>

                                    {menuOpenId === folder.id && (
                                        <div className="absolute right-0 top-6 w-44 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onAddSubfolder(); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                                            >
                                                <FolderInput className="w-3 h-3" /> {t('folders.new_subfolder') || "New Subfolder"}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onRename(); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                                            >
                                                <Edit2 className="w-3 h-3" /> {t('folders.rename')}
                                            </button>

                                            {onLinkToChannel && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMenuOpenId(null);
                                                        onLinkToChannel(folder);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white border-t border-slate-700/50"
                                                >
                                                    <Youtube className="w-3 h-3" /> Link to Channel
                                                </button>
                                            )}

                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
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
            </div>
        );
    }

export default FolderList;
