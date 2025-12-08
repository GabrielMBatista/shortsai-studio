import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    User as UserIcon, Plus, X, Upload, Wand2, Loader2, CheckCircle2, Trash2
} from 'lucide-react';
import { SavedCharacter } from '../../types';
import { analyzeCharacterFeatures } from '../../services/geminiService';
import Loader from '../Loader';
import ConfirmModal from '../ConfirmModal';
import { ToastType } from '../Toast';

interface CharacterManagerProps {
    characters: SavedCharacter[];
    selectedCharIds: string[];
    setSelectedCharIds: React.Dispatch<React.SetStateAction<string[]>>;
    onAddCharacter: (name: string, desc: string, images: string[], optimize: boolean) => Promise<SavedCharacter | null>;
    onRemoveCharacter: (id: string) => Promise<any>;
    isBusy: boolean;
    isCharLoading: boolean;
    showToast: (message: string, type: ToastType) => void;
}

export const CharacterManager: React.FC<CharacterManagerProps> = ({
    characters,
    selectedCharIds,
    setSelectedCharIds,
    onAddCharacter,
    onRemoveCharacter,
    isBusy,
    isCharLoading,
    showToast
}) => {
    const { t } = useTranslation();

    // Internal State
    const [isAddingChar, setIsAddingChar] = useState(false);
    const [newCharName, setNewCharName] = useState('');
    const [newCharDesc, setNewCharDesc] = useState('');
    const [newCharImages, setNewCharImages] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [optimizeRef, setOptimizeRef] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [deleteCharModal, setDeleteCharModal] = useState<{ isOpen: boolean; charId: string | null }>({ isOpen: false, charId: null });

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach((file: File) => {
                const reader = new FileReader();
                reader.onload = () => setNewCharImages(prev => [...prev, reader.result as string]);
                reader.readAsDataURL(file);
            });
        }
    };

    const handleAutoDescription = async () => {
        if (newCharImages.length === 0) return;
        setIsAnalyzing(true);
        try {
            const desc = await analyzeCharacterFeatures(newCharImages[0]);
            setNewCharDesc(prev => (prev ? prev + ", " + desc : desc));
            showToast(t('input.char_described'), 'success');
        } catch (e) {
            console.error("Analysis failed", e);
            showToast(t('input.analysis_failed'), 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveChar = async () => {
        try {
            const char = await onAddCharacter(newCharName, newCharDesc, newCharImages, optimizeRef);
            if (char) {
                setSelectedCharIds(prev => [...prev, char.id]);
                setIsAddingChar(false);
                setNewCharName(''); setNewCharDesc(''); setNewCharImages([]);
                showToast(t('input.char_saved'), 'success');
            }
        } catch (e) {
            showToast(t('input.char_save_failed'), 'error');
        }
    };

    const confirmDeleteCharacter = async () => {
        if (deleteCharModal.charId) {
            await onRemoveCharacter(deleteCharModal.charId);
            if (selectedCharIds.includes(deleteCharModal.charId)) {
                setSelectedCharIds(prev => prev.filter(id => id !== deleteCharModal.charId));
            }
            setDeleteCharModal({ isOpen: false, charId: null });
            showToast(t('input.char_deleted'), 'success');
        }
    };

    return (
        <div className="mt-8 border-t border-slate-700/50 pt-6">
            <ConfirmModal
                isOpen={deleteCharModal.isOpen}
                title={t('input.delete_char_title')}
                message={t('input.delete_char_message')}
                onConfirm={confirmDeleteCharacter}
                onCancel={() => setDeleteCharModal({ isOpen: false, charId: null })}
                isDestructive={true}
                confirmText={t('input.delete_char_confirm')}
            />

            <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-indigo-400" /> {t('input.character_consistency')}
                </label>
                <button
                    type="button"
                    onClick={() => setIsAddingChar(true)}
                    disabled={isBusy}
                    className="text-xs font-bold bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors flex items-center gap-1"
                >
                    <Plus className="w-3 h-3" /> {t('input.new_character')}
                </button>
            </div>

            {isAddingChar && (
                <div className="bg-slate-800 rounded-xl p-4 mb-4 border border-indigo-500/50 shadow-2xl animate-fade-in-up">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="text-xs font-bold text-white uppercase">{t('input.add_char_title')}</h4>
                        <button type="button" onClick={() => setIsAddingChar(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    <input
                        id="charName"
                        name="charName"
                        type="text" placeholder={t('input.char_name_placeholder')} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mb-2 focus:border-indigo-500 outline-none"
                        value={newCharName} onChange={e => setNewCharName(e.target.value)}
                    />

                    <div className="relative">
                        <textarea
                            id="charDesc"
                            name="charDesc"
                            placeholder={t('input.char_desc_placeholder')} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mb-2 h-20 focus:border-indigo-500 outline-none resize-none pr-10"
                            value={newCharDesc} onChange={e => setNewCharDesc(e.target.value)}
                        />
                        {newCharImages.length > 0 && (
                            <button
                                type="button"
                                onClick={handleAutoDescription}
                                disabled={isAnalyzing}
                                className="absolute bottom-4 right-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-lg"
                                title={t('input.auto_describe_title')}
                            >
                                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2 mb-3 overflow-x-auto p-1">
                        <div onClick={() => fileInputRef.current?.click()} className="w-14 h-14 flex-shrink-0 bg-slate-900 border-dashed border-2 border-slate-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:text-indigo-400 transition-colors text-slate-500">
                            <Upload className="w-5 h-5" />
                        </div>
                        <input id="charImages" name="charImages" ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
                        {newCharImages.map((img, i) => (
                            <img key={i} src={img} className="w-14 h-14 rounded-lg object-cover border border-slate-700 shadow-md" />
                        ))}
                    </div>
                    <button type="button" onClick={handleSaveChar} disabled={isCharLoading || !newCharName} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 rounded-lg transition-colors">{t('input.save_character')}</button>
                </div>
            )}

            {/* Character List */}
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide min-h-[90px]">
                <div
                    onClick={() => setSelectedCharIds([])}
                    className={`flex-shrink-0 w-20 flex flex-col items-center gap-2 cursor-pointer p-2 rounded-xl border transition-all ${selectedCharIds.length === 0 ? 'bg-indigo-500/10 border-indigo-500/50' : 'border-transparent hover:bg-slate-800'}`}
                >
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-slate-900 ${selectedCharIds.length === 0 ? 'border-indigo-500 text-indigo-400' : 'border-slate-700 text-slate-600'}`}>
                        <X className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold uppercase ${selectedCharIds.length === 0 ? 'text-indigo-300' : 'text-slate-500'}`}>{t('input.no_char')}</span>
                </div>

                {isCharLoading ? (
                    <div className="flex items-center px-4 h-20 justify-center">
                        <Loader size="sm" />
                    </div>
                ) : (
                    characters.map(c => {
                        const isSelected = selectedCharIds.includes(c.id);
                        return (
                            <div key={c.id} onClick={() => {
                                setSelectedCharIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]);
                            }} className={`flex-shrink-0 w-20 flex flex-col items-center gap-2 cursor-pointer group relative p-2 rounded-xl border transition-all ${isSelected ? 'bg-indigo-500/10 border-indigo-500/50' : 'border-transparent hover:bg-slate-800'}`}>
                                <div className={`w-12 h-12 rounded-full border-2 overflow-hidden relative shadow-md ${isSelected ? 'border-indigo-500' : 'border-slate-700'}`}>
                                    <img src={c.images[0] || c.imageUrl} className="w-full h-full object-cover" />
                                    {isSelected && <div className="absolute inset-0 bg-indigo-500/40 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-white" /></div>}
                                </div>
                                <span className={`text-[10px] font-medium truncate w-full text-center ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>{c.name}</span>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setDeleteCharModal({ isOpen: true, charId: c.id }); }}
                                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                                    title={t('input.delete_char_tooltip')}
                                >
                                    <Trash2 className="w-2.5 h-2.5" />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
