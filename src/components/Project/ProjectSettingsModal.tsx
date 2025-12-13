import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, User as UserIcon, Search, CheckCircle2, Loader2, Edit2 } from 'lucide-react';
import { SavedCharacter, User } from '../types';
import { useCharacterLibrary } from '../hooks/useCharacterLibrary';

interface ProjectSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentTitle?: string;
    currentDescription?: string;
    currentUser: User | null;
    initialCharacterIds: string[];
    onSave: (data: { generatedTitle?: string; generatedDescription?: string; characterIds?: string[] }) => Promise<void>;
}

const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
    isOpen,
    onClose,
    currentTitle,
    currentDescription,
    currentUser,
    initialCharacterIds,
    onSave
}) => {
    const { t } = useTranslation();
    const [title, setTitle] = useState(currentTitle || '');
    const [description, setDescription] = useState(currentDescription || '');
    const [selectedCharIds, setSelectedCharIds] = useState<string[]>(initialCharacterIds || []);
    const [isSaving, setIsSaving] = useState(false);
    const [search, setSearch] = useState('');

    const { characters: libraryCharacters, isLoading: isLoadingChars } = useCharacterLibrary(currentUser);

    // Sync when opening
    useEffect(() => {
        if (isOpen) {
            setTitle(currentTitle || '');
            setDescription(currentDescription || '');
            setSelectedCharIds(initialCharacterIds || []);
        }
    }, [isOpen, currentTitle, currentDescription, initialCharacterIds]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave({
                generatedTitle: title,
                generatedDescription: description,
                characterIds: selectedCharIds
            });
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleCharacter = (id: string) => {
        if (selectedCharIds.includes(id)) {
            setSelectedCharIds(prev => prev.filter(c => c !== id));
        } else {
            setSelectedCharIds(prev => [...prev, id]);
        }
    };

    const filteredChars = (libraryCharacters || []).filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-left">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <Edit2 className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-white">{t('script.project_settings', 'Project Settings')}</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent space-y-6">

                    {/* Title & Description */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">{t('script.project_title', 'Project Title')}</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                                placeholder={t('script.enter_title', 'Enter project title...')}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">{t('script.project_description', 'Description')}</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none min-h-[100px] resize-none"
                                placeholder={t('script.enter_description', 'Enter project description...')}
                            />
                        </div>
                    </div>

                    {/* Character Roster */}
                    <div className="space-y-3 pt-4 border-t border-slate-800">
                        <div className="flex justify-between items-end">
                            <label className="block text-xs font-semibold text-slate-500 uppercase">{t('script.project_characters', 'Project Characters (Roster)')}</label>
                            <div className="relative w-48">
                                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-300 focus:border-indigo-500 outline-none placeholder:text-slate-600"
                                    placeholder={t('common.search', 'Search...')}
                                />
                            </div>
                        </div>

                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 min-h-[200px] max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                            {isLoadingChars ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                    {filteredChars.map(c => {
                                        const isSelected = selectedCharIds.includes(c.id);
                                        return (
                                            <button
                                                key={c.id}
                                                onClick={() => toggleCharacter(c.id)}
                                                className={`group relative flex flex-col items-center gap-2 p-2 rounded-xl border transition-all ${isSelected
                                                        ? 'bg-indigo-500/10 border-indigo-500/50'
                                                        : 'bg-slate-800/50 border-transparent hover:bg-slate-800'
                                                    }`}
                                            >
                                                <div className={`w-14 h-14 rounded-full border-2 overflow-hidden relative ${isSelected ? 'border-indigo-400' : 'border-slate-700'}`}>
                                                    <img src={c.imageUrl || c.images[0]} className="w-full h-full object-cover" loading="lazy" />
                                                    {isSelected && (
                                                        <div className="absolute inset-0 bg-indigo-500/40 flex items-center justify-center">
                                                            <CheckCircle2 className="w-6 h-6 text-white drop-shadow-md" />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`text-[10px] font-medium truncate w-full text-center ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                    {c.name}
                                                </span>
                                            </button>
                                        );
                                    })}
                                    {filteredChars.length === 0 && (
                                        <div className="col-span-full text-center text-slate-500 text-sm py-8">
                                            {t('script.no_characters_found', 'No characters found')}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-500">
                            {t('script.project_characters_hint', 'Selected characters will be prioritized in scene selection.')}
                        </p>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
                    >
                        {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg flex items-center gap-2 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {t('common.save_changes', 'Save Changes')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectSettingsModal;
