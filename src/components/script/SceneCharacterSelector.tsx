import React from 'react';
import { SavedCharacter } from '../../types';
import { User, CheckCircle2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SceneCharacterSelectorProps {
    projectCharacters: SavedCharacter[];
    selectedCharacterIds: string[];
    onToggleCharacter: (characterId: string) => void;
    onClearSelection: () => void;
}

export const SceneCharacterSelector: React.FC<SceneCharacterSelectorProps> = ({
    projectCharacters,
    selectedCharacterIds,
    onToggleCharacter,
    onClearSelection
}) => {
    const { t } = useTranslation();

    if (!projectCharacters || projectCharacters.length === 0) return null;

    return (
        <div className="flex flex-col gap-2 mt-2 border-t border-slate-700/50 pt-2">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                <User className="w-3 h-3" /> {t('input.character_consistency')}
            </label>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                <div
                    onClick={onClearSelection}
                    className={`flex-shrink-0 w-14 flex flex-col items-center gap-1.5 cursor-pointer p-1.5 rounded-lg border transition-all ${selectedCharacterIds.length === 0 ? 'bg-indigo-500/10 border-indigo-500/50' : 'border-transparent hover:bg-slate-800'}`}
                    title={t('input.no_char')}
                >
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center bg-slate-900 ${selectedCharacterIds.length === 0 ? 'border-indigo-500 text-indigo-400' : 'border-slate-700 text-slate-600'}`}>
                        <X className="w-3 h-3" />
                    </div>
                    <span className={`text-[9px] font-bold uppercase truncate max-w-full ${selectedCharacterIds.length === 0 ? 'text-indigo-300' : 'text-slate-500'}`}>Auto</span>
                </div>

                {projectCharacters.map(c => {
                    const isSelected = selectedCharacterIds.includes(c.id);
                    return (
                        <div
                            key={c.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleCharacter(c.id);
                            }}
                            className={`flex-shrink-0 w-14 flex flex-col items-center gap-1.5 cursor-pointer group relative p-1.5 rounded-lg border transition-all ${isSelected ? 'bg-indigo-500/10 border-indigo-500/50' : 'border-transparent hover:bg-slate-800'}`}
                        >
                            <div className={`w-8 h-8 rounded-full border overflow-hidden relative shadow-sm ${isSelected ? 'border-indigo-500' : 'border-slate-700'}`}>
                                <img src={c.imageUrl || c.images[0]} className="w-full h-full object-cover" alt={c.name} />
                                {isSelected && <div className="absolute inset-0 bg-indigo-500/40 flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-white" /></div>}
                            </div>
                            <span className={`text-[9px] font-medium truncate w-full text-center ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>{c.name}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
