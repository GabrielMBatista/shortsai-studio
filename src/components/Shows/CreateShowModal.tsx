import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createShow } from '../../services/shows';

interface CreateShowModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    showToast: (msg: string, type: 'success' | 'error') => void;
}

const CreateShowModal: React.FC<CreateShowModalProps> = ({ isOpen, onClose, onSuccess, showToast }) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [stylePreset, setStylePreset] = useState('Cinematic');
    const [visualPrompt, setVisualPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await createShow({
                name,
                description,
                style_preset: stylePreset,
                visual_prompt: visualPrompt
            });
            showToast('Série criada com sucesso!', 'success');
            onSuccess();
            onClose();
            // Reset form
            setName('');
            setDescription('');
        } catch (error) {
            console.error(error);
            showToast('Erro ao criar série', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
                    <h2 className="text-lg font-bold text-white">Nova Série (Show)</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Nome da Série</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            placeholder="Ex: As Aventuras Espaciais"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Contexto / Sinopse</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none min-h-[100px]"
                            placeholder="Descreva o universo, tom e tema da série..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Estilo Visual</label>
                            <select
                                value={stylePreset}
                                onChange={(e) => setStylePreset(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            >
                                <option value="Cinematic">Realistic Cinematic</option>
                                <option value="Anime">Anime</option>
                                <option value="3D Animation">3D Pixar Style</option>
                                <option value="Comic Book">Comic Book</option>
                                <option value="Realism">Photorealism</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Prompt Visual Base (Opcional)</label>
                        <textarea
                            value={visualPrompt}
                            onChange={(e) => setVisualPrompt(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            placeholder="Prompt fixo adicionado a todas as cenas (Ex: 'dark atmosphere, neon lights')"
                            rows={2}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading && <Loader2 size={16} className="animate-spin" />}
                            Criar Série
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateShowModal;
