import React, { useState, useEffect } from 'react';
import { SafeImage } from './SafeImage';
import { SafeVideo } from './SafeVideo';
import Loader from './Loader';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../../services/api';

interface AssetMatch {
    id: string;
    url: string;
    type: 'VIDEO' | 'IMAGE' | 'AUDIO';
    similarity: number;
    description: string;
    tags: string[];
    category: string | null;
    duration: number | null;
    isRecentlyUsed?: boolean;  // Indica se foi usado recentemente neste canal
}

interface AssetLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    sceneDescription: string;
    assetType: 'VIDEO' | 'IMAGE' | 'AUDIO';
    onSelectAsset: (asset: AssetMatch) => void;
}

export const AssetLibraryModal: React.FC<AssetLibraryModalProps> = ({
    isOpen,
    onClose,
    sceneDescription,
    assetType,
    onSelectAsset
}) => {
    const { t } = useTranslation();
    const [assets, setAssets] = useState<AssetMatch[]>([]);
    const [filteredAssets, setFilteredAssets] = useState<AssetMatch[]>([]);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen && sceneDescription) {
            fetchAssets();
        }
    }, [isOpen, sceneDescription, assetType]);

    const [visibleCount, setVisibleCount] = useState(12);

    // Reset visible count when assets reload
    useEffect(() => {
        setVisibleCount(12);
    }, [filteredAssets]);

    // Filter assets based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredAssets(assets);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = assets.filter(asset =>
                asset.description.toLowerCase().includes(query) ||
                asset.tags.some(tag => tag.toLowerCase().includes(query)) ||
                (asset.category && asset.category.toLowerCase().includes(query))
            );
            setFilteredAssets(filtered);
        }
    }, [searchQuery, assets]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 300) {
            setVisibleCount(prev => prev + 12);
        }
    };

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const typesToFetch = assetType === 'AUDIO' ? ['AUDIO'] : ['VIDEO', 'IMAGE'];

            const promises = typesToFetch.map(type =>
                apiFetch(`/assets/search?description=${encodeURIComponent(sceneDescription)}&type=${type}&minSimilarity=0.0`)
            );

            const results = await Promise.all(promises);

            let allMatches: AssetMatch[] = [];
            results.forEach((data, index) => {
                if (data.matches) {
                    // Ensure type is set if backend misses it
                    const type = typesToFetch[index];
                    const matchesWithType = data.matches.map((m: any) => ({ ...m, type: m.type || type }));
                    allMatches = [...allMatches, ...matchesWithType];
                }
            });

            // Sort by similarity descending
            allMatches.sort((a, b) => b.similarity - a.similarity);

            setAssets(allMatches);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = async (asset: AssetMatch) => {
        setApplying(asset.id);
        try {
            await onSelectAsset(asset);
            onClose();
        } catch (error) {
            console.error('Failed to select asset:', error);
            throw error;
        } finally {
            setApplying(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl shadow-indigo-500/10">
                {/* Header */}
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400">
                                🔍
                            </span>
                            {t('asset_library.title', 'Biblioteca de Ativos')}
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">
                            {t('asset_library.subtitle', 'Reutilize conteúdos similares e economize créditos')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                    >
                        ✕
                    </button>
                </div>

                {/* Search Bar */}
                <div className="px-6 pb-4 border-b border-zinc-800">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('asset_library.search_placeholder', 'Pesquisar por descrição, tags ou categoria...')}
                            className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2.5 pl-10 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                            🔍
                        </span>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    {searchQuery && (
                        <p className="text-xs text-zinc-500 mt-2">
                            {filteredAssets.length} {t('asset_library.results', 'resultado(s)')}
                        </p>
                    )}
                </div>

                {/* Content */}
                <div
                    className="flex-1 overflow-y-auto p-6"
                    onScroll={handleScroll}
                >
                    {loading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4 text-zinc-400">
                            <div className="animate-spin text-4xl text-indigo-500">⏳</div>
                            <p>{t('asset_library.matching', 'Buscando melhores combinações...')}</p>
                        </div>
                    ) : filteredAssets.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredAssets.slice(0, visibleCount).map((asset) => (
                                <div
                                    key={asset.id}
                                    className="group relative bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all hover:shadow-lg hover:shadow-indigo-500/5"
                                >
                                    {/* Asset Preview */}
                                    <div className="aspect-video bg-black relative overflow-hidden">
                                        {asset.type === 'VIDEO' ? (
                                            <SafeVideo
                                                src={asset.url}
                                                className="w-full h-full object-cover"
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
                                            />
                                        ) : asset.type === 'IMAGE' ? (
                                            <SafeImage
                                                src={asset.url}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                                <span className="text-4xl">🎵</span>
                                            </div>
                                        )}

                                        {/* Type Badge */}
                                        <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 border border-white/10 text-[10px] uppercase font-bold text-white flex items-center gap-1">
                                            {asset.type === 'VIDEO' ? '🎥 VIDEO' : asset.type === 'IMAGE' ? '🖼️ IMAGE' : '🎵 AUDIO'}
                                        </div>

                                        {/* Score Badge */}
                                        <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${asset.similarity > 80 ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`}></div>
                                            <span className="text-xs font-bold text-white">
                                                {asset.similarity}%
                                            </span>
                                        </div>

                                        {/* Recently Used Badge */}
                                        {asset.isRecentlyUsed && (
                                            <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-blue-500/80 backdrop-blur-md border border-blue-400/30 flex items-center gap-1.5">
                                                <span className="text-xs font-semibold text-white flex items-center gap-1">
                                                    🕐 Usado Recentemente
                                                </span>
                                            </div>
                                        )}

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={() => handleSelect(asset)}
                                                disabled={!!applying}
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-full transform scale-90 group-hover:scale-100 transition-all flex items-center gap-2"
                                            >
                                                {applying === asset.id ? <Loader size="sm" /> : 'Reutilizar'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Description/Tags */}
                                    <div className="p-4">
                                        <p className="text-zinc-300 text-sm line-clamp-2 italic">
                                            "{asset.description}"
                                        </p>
                                        {asset.tags.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                {asset.tags.slice(0, 3).map((tag, i) => (
                                                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-zinc-500">
                            <span className="text-5xl mb-4 opacity-20">🔍</span>
                            <p>{t('asset_library.no_matches', 'Nenhum ativo similar encontrado')}</p>
                            <p className="text-sm opacity-60 mt-2">{t('asset_library.no_matches_tip', 'Tente mudar a descrição da cena')}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
                    >
                        {t('common.cancel', 'Cancelar')}
                    </button>
                </div>
            </div>
        </div>
    );
};
