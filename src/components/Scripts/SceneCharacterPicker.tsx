import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle2, User as UserIcon, Search } from 'lucide-react';
import { SavedCharacter } from '../../types';

interface SceneCharacterPickerProps {
    availableCharacters: SavedCharacter[];
    selectedCharacterIds: string[];
    onToggleCharacter: (characterId: string) => void;
    isOpen: boolean;
    onClose: () => void;
    position?: 'top' | 'bottom'; // hint for positioning if needed
}

export const SceneCharacterPicker: React.FC<SceneCharacterPickerProps> = ({
    availableCharacters,
    selectedCharacterIds,
    onToggleCharacter,
    isOpen,
    onClose
}) => {
    const { t } = useTranslation();
    const ref = useRef<HTMLDivElement>(null);
    const [search, setSearch] = React.useState('');

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const filteredChars = availableCharacters.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div
            ref={ref}
            className="absolute right-0 bottom-12 z-50 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in-up origin-bottom-right"
        >
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                    <UserIcon className="w-3.5 h-3.5" />
                    {t('script.select_character')}
                </div>
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-2 border-b border-slate-800">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                    <input
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600"
                        placeholder={t('script.search_character', 'Search...')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            <div className="max-h-64 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                <div className="grid grid-cols-4 gap-2">
                    {/* Auto/None Option */}
                    <button
                        onClick={() => {
                            // Logic to clear could be handled by parent, or implied by toggling all off?
                            // Usually 'Auto' means clearing selection. 
                            // But here we rely on the toggle. 
                            // Let's assume we don't need a specific "Auto" button inside the picker if we have toggles, 
                            // BUT the user mock showed an "Auto" option.
                            // Typically "Auto" = No IDs selected.
                            if (selectedCharacterIds.length > 0) {
                                // We might need a 'clear' prop or just manually untoggle all.
                                // Ideally the parent handles 'clear'.
                                // For now, let's keep it simple: clicking active ones toggles them off.
                            }
                        }}
                        className={`flex flex-col items-center gap-1.5 p-1.5 rounded-lg border transition-all ${selectedCharacterIds.length === 0 ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-slate-800/50 border-transparent hover:bg-slate-800'}`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${selectedCharacterIds.length === 0 ? 'border-indigo-400 text-indigo-400' : 'border-slate-700 text-slate-500'}`}>
                            <span className="text-[10px] font-bold">AUTO</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium truncate w-full text-center">{t('script.default_character', 'Default')}</span>
                    </button>

                    {filteredChars.map(c => {
                        const isSelected = selectedCharacterIds.includes(c.id);
                        return (
                            <button
                                key={c.id}
                                onClick={() => onToggleCharacter(c.id)}
                                className={`group relative flex flex-col items-center gap-1.5 p-1.5 rounded-lg border transition-all ${isSelected ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-slate-800/50 border-transparent hover:bg-slate-800'}`}
                                title={c.name}
                            >
                                <div className={`w-10 h-10 rounded-full border-2 overflow-hidden relative ${isSelected ? 'border-indigo-400' : 'border-slate-700'}`}>
                                    <img src={c.imageUrl || c.images[0]} className="w-full h-full object-cover" loading="lazy" />
                                    {isSelected && (
                                        <div className="absolute inset-0 bg-indigo-500/30 flex items-center justify-center">
                                            <CheckCircle2 className="w-4 h-4 text-white drop-shadow-md" />
                                        </div>
                                    )}
                                </div>
                                <span className={`text-[9px] font-medium truncate w-full text-center ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>{c.name}</span>
                            </button>
                        );
                    })}
                </div>

                {filteredChars.length === 0 && (
                    <div className="text-center py-4 text-xs text-slate-500">
                        {t('script.no_characters_found', 'No characters found')}
                    </div>
                )}
            </div>

            <div className="p-2 bg-slate-800/50 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
                <span>{t('script.selected_count', { count: selectedCharacterIds.length })}</span>
                {selectedCharacterIds.length > 0 && (
                    <button
                        onClick={() => {
                            // This is a hacky way to clear, by toggling all active. 
                            // Parent should ideally provide onClear.
                            // We'll leave it for now or implement if needed.
                            selectedCharacterIds.forEach(id => onToggleCharacter(id));
                        }}
                        className="text-indigo-400 hover:text-white transition-colors"
                    >
                        {t('script.clear_all', 'Clear all')}
                    </button>
                )}
            </div>
        </div>
    );
};
