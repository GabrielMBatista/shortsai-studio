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
    thumbnailUrl?: string | null;
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
    const [isCataloging, setIsCataloging] = useState(false);
    const [catalogResult, setCatalogResult] = useState<any>(null);
    const [totalStats, setTotalStats] = useState({ images: 0, videos: 0 });
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [filterTypes, setFilterTypes] = useState<('VIDEO' | 'IMAGE')[]>(
        assetType === 'AUDIO' ? ['VIDEO', 'IMAGE'] : [assetType]
    );

    // Catalog existing assets
    const handleCatalog = async () => {
        if (isCataloging) return;
        setIsCataloging(true);
        setCatalogResult(null);

        try {
            const response = await apiFetch('/assets/catalog', {
                method: 'POST'
            });

            if (response?.success) {
                setCatalogResult(response.data);
                // Refresh assets after cataloging
                fetchAssets();
            } else {
                alert('Erro ao catalogar assets: ' + (response?.error || 'Desconhecido'));
            }
        } catch (error: any) {
            console.error('Failed to catalog assets:', error);
            alert('Erro ao catalogar assets: ' + error.message);
        } finally {
            setIsCataloging(false);
        }
    };

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch assets when open, description changes, or *debounced* search query changes
    useEffect(() => {
        if (isOpen) {
            fetchAssets();
        }
    }, [isOpen, sceneDescription, assetType, debouncedSearchQuery, filterTypes]);

    const [visibleCount, setVisibleCount] = useState(12);

    // Reset visible count when assets reload
    useEffect(() => {
        setVisibleCount(12);
    }, [assets]);

    // (Old client-side filtering removed)

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 300) {
            setVisibleCount(prev => prev + 12);
        }
    };

    const fetchAssets = async () => {
        setLoading(true);
        try {
            // Buscar estatísticas totais (apenas informativo)
            const statsResponse = await apiFetch('/assets/catalog/stats');
            if (statsResponse?.data) {
                setTotalStats({
                    images: statsResponse.data.totalImages || 0,
                    videos: statsResponse.data.totalVideos || 0
                });
            }

            let allAssets: AssetMatch[] = [];

            // Execute fetch for each selected type
            await Promise.all(filterTypes.map(async (type) => {
                let typeAssets: AssetMatch[] = [];

                // 1. Se houver termo de busca ou descrição de cena, usar busca OTIMIZADA do servidor
                // A busca manual tem precedência sobre a descrição da cena
                const term = debouncedSearchQuery.trim() || sceneDescription;
                const useServerSearch = !!term;

                if (useServerSearch) {
                    // console.log('[AssetLibrary] Using Server-Side Search for:', term.substring(0, 30), type);
                    // Se for busca manual, search query prevalece
                    const searchResponse = await apiFetch(`/assets/search?description=${encodeURIComponent(term)}&type=${type}&minSimilarity=0.0`);

                    if (searchResponse?.matches) {
                        typeAssets = searchResponse.matches.map((m: any) => ({
                            id: m.id,
                            url: m.url,
                            type: m.type,
                            similarity: debouncedSearchQuery ? 0 : m.similarity,
                            description: m.description,
                            tags: m.tags || [],
                            category: m.category,
                            duration: m.duration,
                            isRecentlyUsed: false,
                            thumbnailUrl: m.thumbnail_url
                        }));
                    }
                } else {
                    // 2. Fallback: Se não tiver nada, busca os mais recentes
                    // console.log('[AssetLibrary] Fetching recent catalog (Browse Mode) for', type);
                    const catalogResponse = await apiFetch('/assets/catalog?limit=50&take=50');

                    if (catalogResponse?.data?.assets) {
                        const rawAssets = catalogResponse.data.assets.filter((asset: any) =>
                            asset.asset_type === type
                        );

                        typeAssets = rawAssets.map((asset: any) => ({
                            id: asset.id,
                            url: asset.url,
                            type: asset.asset_type,
                            similarity: 0,
                            description: asset.description || '',
                            tags: asset.tags || [],
                            category: asset.category,
                            duration: asset.duration_seconds,
                            isRecentlyUsed: asset.last_used_in_channel ? true : false,
                            thumbnailUrl: asset.thumbnail_url
                        }));
                    }
                }
                allAssets = [...allAssets, ...typeAssets];
            }));

            // Remove duplicates (just in case)
            const uniqueAssets = Array.from(new Map(allAssets.map(item => [item.id, item])).values());

            // Sort by similarity desc, then recency? Or strictly similarity?
            // If manual search, similarity is 0, so result order from API matters. 
            // Since we merged, let's sort by type to group them, or just let them mix?
            // Mixing is better for "all results".

            // If similarity exists, sort by it.
            uniqueAssets.sort((a, b) => b.similarity - a.similarity);

            // console.log(`[AssetLibrary] Loaded ${uniqueAssets.length} total assets`);

            setAssets(uniqueAssets);

        } catch (error) {
            console.error('Failed to fetch assets:', error);
            setAssets([]);
        } finally {
            setLoading(false);
        }
    };

    // Função simples de similaridade baseada em palavras-chave
    const calculateSimilarity = (text1: string, text2: string): number => {
        if (!text1 || !text2) return 0;

        const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 2);

        const matches = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
        const similarity = words1.length > 0 ? (matches.length / words1.length) * 100 : 0;

        return Math.round(similarity);
    };

    const handleSelect = async (asset: AssetMatch) => {
        if (applying) return; // Prevent double clicks
        setApplying(asset.id);
        try {
            await onSelectAsset(asset);
            onClose();
        } catch (error) {
            console.error('Failed to select asset:', error);
            // Don't close on error so user can try again?
        } finally {
            setApplying(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl shadow-indigo-500/10">
                {/* Header */}
                <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400">
                                    🔍
                                </span>
                                {t('asset_library.title', 'Biblioteca de Ativos')}
                                <span className="ml-2 text-sm font-normal text-zinc-400">
                                    ({totalStats.images} imagens • {totalStats.videos} vídeos)
                                </span>
                            </h2>
                            <p className="text-zinc-400 text-sm mt-1">
                                {t('asset_library.subtitle', 'Reutilize conteúdos similares e economize créditos')}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Catalog Button */}
                            <button
                                onClick={handleCatalog}
                                disabled={isCataloging}
                                className="px-3 py-1.5 text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                                {isCataloging ? (
                                    <>
                                        <span className="animate-spin">⏳</span>
                                        Catalogando...
                                    </>
                                ) : (
                                    <>
                                        📦 Catalogar Assets Antigos
                                    </>
                                )}
                            </button>

                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Catalog Result Notification */}
                    {catalogResult && (
                        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <p className="text-green-400 text-sm font-medium">
                                ✅ Catalogação concluída com sucesso!
                            </p>
                            <p className="text-green-300/70 text-xs mt-1">
                                {catalogResult.catalogedImages} imagens • {catalogResult.catalogedVideos} vídeos • {catalogResult.catalogedAudios} áudios
                                {' '}({catalogResult.total} total)
                            </p>
                        </div>
                    )}
                </div>

                {/* Search Bar & Filters */}
                <div className="px-6 pb-4 border-b border-zinc-800">
                    <div className="flex flex-col gap-3">
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

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filterTypes.includes('IMAGE') ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-600 group-hover:border-zinc-500'}`}>
                                        {filterTypes.includes('IMAGE') && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={filterTypes.includes('IMAGE')}
                                        onChange={() => {
                                            setFilterTypes(prev =>
                                                prev.includes('IMAGE')
                                                    ? prev.filter(t => t !== 'IMAGE')
                                                    : [...prev, 'IMAGE']
                                            );
                                        }}
                                    />
                                    <span className={`text-sm ${filterTypes.includes('IMAGE') ? 'text-white' : 'text-zinc-400'}`}>Imagens</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${filterTypes.includes('VIDEO') ? 'bg-purple-500 border-purple-500' : 'border-zinc-600 group-hover:border-zinc-500'}`}>
                                        {filterTypes.includes('VIDEO') && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={filterTypes.includes('VIDEO')}
                                        onChange={() => {
                                            setFilterTypes(prev =>
                                                prev.includes('VIDEO')
                                                    ? prev.filter(t => t !== 'VIDEO')
                                                    : [...prev, 'VIDEO']
                                            );
                                        }}
                                    />
                                    <span className={`text-sm ${filterTypes.includes('VIDEO') ? 'text-white' : 'text-zinc-400'}`}>Vídeos</span>
                                </label>
                            </div>

                            {searchQuery && (
                                <p className="text-xs text-zinc-500">
                                    {assets.length} {t('asset_library.results', 'resultado(s)')}
                                </p>
                            )}
                        </div>
                    </div>
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
                    ) : assets.length > 0 ? (
                        <>
                            {console.log('[AssetLibrary] Rendering:', assets.length, 'assets, showing', Math.min(visibleCount, assets.length))}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {assets.slice(0, visibleCount).map((asset) => (
                                    <div
                                        key={asset.id}
                                        className="group relative bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all hover:shadow-lg hover:shadow-indigo-500/5"
                                    >
                                        {/* Asset Preview */}
                                        <div className="aspect-video bg-black relative overflow-hidden">
                                            {asset.type === 'VIDEO' ? (
                                                asset.thumbnailUrl ? (
                                                    <div className="relative w-full h-full group/video">
                                                        <SafeImage
                                                            src={asset.thumbnailUrl}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/video:bg-black/40 transition-all">
                                                            <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm border border-white/20 group-hover/video:scale-110 transition-transform">
                                                                <span className="text-xl ml-1">▶️</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <SafeVideo
                                                        src={asset.url}
                                                        className="w-full h-full object-cover"
                                                        autoPlay
                                                        loop
                                                        muted
                                                        playsInline
                                                    />
                                                )
                                            ) : asset.type === 'IMAGE' ? (
                                                <SafeImage
                                                    src={asset.url}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                                    <span className="text-4xl">🎵</span>
                                                </div>
                                            )
                                            }

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
                        </>
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
