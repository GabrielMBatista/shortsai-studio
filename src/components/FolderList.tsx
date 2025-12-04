import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Folder, Plus, MoreVertical, Edit2, Trash2, FolderOpen } from 'lucide-react';
import { Folder as FolderType } from '../types';
import { useTranslation } from 'react-i18next';

interface FolderListProps {
    folders: FolderType[];
    selectedFolderId: string | null;
    onSelectFolder: (folderId: string | null) => void;
    onCreateFolder: (name: string) => Promise<void>;
    onUpdateFolder: (id: string, name: string) => Promise<void>;
    onDeleteFolder: (id: string) => Promise<void>;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    className?: string;
}

const FolderList: React.FC<FolderListProps> = ({
    folders,
    selectedFolderId,
    onSelectFolder,
    onCreateFolder,
    onUpdateFolder,
    onDeleteFolder,
    isCollapsed,
    onToggleCollapse,
    className
}) => {
    const { t } = useTranslation();
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

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
        <div className={`bg-slate-900/50 border-r border-slate-800 flex flex-col gap-2 h-full transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} ${className || ''}`}>
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
                        {isCollapsed ? <FolderOpen className="w-4 h-4" /> : <div className="w-4 h-4 flex items-center justify-center">«</div>}
                    </button>
                </div>
            </div>

            <DroppableFolder id="root" className={`mx-2 rounded-lg transition-colors ${isCollapsed ? 'justify-center' : ''}`}>
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
                    {!isCollapsed ? t('folders.home') : <span className="text-[10px] font-bold">ALL</span>}
                </button>
            </DroppableFolder>

            {!isCollapsed && isCreating && (
                <div className="flex items-center gap-2 px-4 py-1">
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

            <div className="flex-1 overflow-y-auto space-y-1 px-2">
                {folders.map(folder => (
                    <DroppableFolder
                        key={folder.id}
                        id={folder.id}
                        className={`rounded-lg transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <div
                            className={`group flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm font-medium cursor-pointer ${selectedFolderId === folder.id
                                ? 'bg-indigo-500/20 text-indigo-400'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                } ${isCollapsed ? 'justify-center flex-col gap-1 py-3' : ''}`}
                            onClick={() => onSelectFolder(folder.id)}
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
                                    <div className={`flex items-center gap-3 truncate ${isCollapsed ? 'justify-center w-full flex-col gap-1' : ''}`}>
                                        {selectedFolderId === folder.id ? (
                                            <FolderOpen className="w-4 h-4 flex-shrink-0" />
                                        ) : (
                                            <Folder className="w-4 h-4 flex-shrink-0" />
                                        )}
                                        {!isCollapsed ? (
                                            <>
                                                <span className="truncate">{folder.name}</span>
                                                {folder._count?.projects ? (
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
                ))}
            </div>
        </div>
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
        <div ref={setNodeRef} className={`${className || ''} ${isOver ? 'bg-indigo-500/30 ring-2 ring-indigo-500 ring-inset' : ''}`}>
            {children}
        </div>
    );
};

export default FolderList;
