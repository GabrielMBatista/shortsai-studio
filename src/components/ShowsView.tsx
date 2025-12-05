import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Film, Users, Trash2, Edit, Clapperboard, Calendar } from 'lucide-react';
import { Show, getShows, deleteShow } from '../services/shows';
import CreateShowModal from './CreateShowModal';
import Loader from './Loader';

interface ShowsViewProps {
    onOpenShow: (showId: string) => void;
    showToast: (msg: string, type: 'success' | 'error') => void;
}

const ShowsView: React.FC<ShowsViewProps> = ({ onOpenShow, showToast }) => {
    const { t } = useTranslation();
    const [shows, setShows] = useState<Show[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchShows = async () => {
        setIsLoading(true);
        try {
            const data = await getShows();
            setShows(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            showToast('Erro ao carregar séries', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchShows();
    }, []);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Tem certeza? Isso apagará a série e desconectará os episódios.')) return;
        
        try {
            await deleteShow(id);
            setShows(prev => prev.filter(s => s.id !== id));
            showToast('Série removida', 'success');
        } catch (e) {
            showToast('Erro ao remover', 'error');
        }
    };

    if (isLoading) return <Loader fullScreen text="Carregando suas séries..." />;

    return (
        <div className="w-full h-full p-6 lg:p-10 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Minhas Séries (Shows)</h1>
                        <p className="text-slate-400 mt-1">Gerencie universos, elenco e continuidade.</p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg hover:shadow-purple-500/20"
                    >
                        <Plus size={20} />
                        Nova Série
                    </button>
                </div>

                {/* Grid */}
                {shows.length === 0 ? (
                    <div className="text-center py-20 border border-slate-800 rounded-2xl bg-slate-900/50 border-dashed">
                        <Clapperboard size={48} className="mx-auto text-slate-600 mb-4" />
                        <h3 className="text-xl font-medium text-slate-300">Nenhuma série criada ainda</h3>
                        <p className="text-slate-500 mt-2 max-w-md mx-auto">
                            Crie um Show para manter a consistência de personagens e estilo visual através de vários episódios.
                        </p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="mt-6 text-purple-400 hover:text-purple-300 font-medium"
                        >
                            Começar agora &rarr;
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {shows.map(show => (
                            <div
                                key={show.id}
                                onClick={() => onOpenShow(show.id)}
                                className="group bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-xl p-5 cursor-pointer transition-all hover:shadow-xl hover:shadow-purple-500/5 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleDelete(show.id, e)}
                                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                        title="Excluir"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-purple-400">
                                        <Film size={24} />
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-xs font-medium text-slate-400 border border-slate-700">
                                        {show.style_preset}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{show.name}</h3>
                                <p className="text-slate-400 text-sm line-clamp-2 h-10 mb-6">
                                    {show.description || "Sem descrição..."}
                                </p>

                                <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-800 pt-4">
                                    <div className="flex items-center gap-1.5">
                                        <Clapperboard size={14} />
                                        <span>{show._count?.episodes || 0} Episódios</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Users size={14} />
                                        <span>{show._count?.characters || 0} Personagens</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 ml-auto">
                                        <Calendar size={14} />
                                        <span>{new Date(show.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <CreateShowModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchShows}
                showToast={showToast}
            />
        </div>
    );
};

export default ShowsView;
