import React, { useState, useEffect } from 'react';
import { X, Save, Sparkles, AlertCircle, Info, Tag } from 'lucide-react';
import { CreatePersonaData, Persona } from '../../types/personas';
import { useTranslation } from 'react-i18next';
import SmartJsonInput from '../Common/SmartJsonInput';

interface CreatePersonaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreatePersonaData) => Promise<void>;
    persona?: Persona | null; // If provided, we're editing
}

export default function CreatePersonaModal({ isOpen, onClose, onSubmit, persona }: CreatePersonaModalProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<CreatePersonaData>({
        name: '',
        description: '',
        category: 'general',
        systemInstruction: '',
        temperature: 0.7,
        tags: []
    });
    const [tagInput, setTagInput] = useState('');

    // Reset or populate form when modal opens or persona changes
    useEffect(() => {
        if (isOpen) {
            if (persona) {
                // Edit mode - populate with existing data
                setFormData({
                    name: persona.name || '',
                    description: persona.description || '',
                    category: persona.category || 'general',
                    systemInstruction: persona.systemInstruction || '',
                    temperature: persona.temperature ?? 0.7,
                    tags: persona.tags || []
                });
            } else {
                // Create mode - reset form
                setFormData({
                    name: '',
                    description: '',
                    category: 'general',
                    systemInstruction: '',
                    temperature: 0.7,
                    tags: []
                });
            }
            setTagInput('');
        }
    }, [isOpen, persona]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await onSubmit(formData);
            onClose();
        } catch (error) {
            console.error('Error creating persona:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!formData.tags?.includes(tagInput.trim())) {
                setFormData(prev => ({
                    ...prev,
                    tags: [...(prev.tags || []), tagInput.trim()]
                }));
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags?.filter(tag => tag !== tagToRemove)
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#0f172a] border border-slate-700 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-400" />
                            {persona ? 'Edit Persona' : 'Create New Persona'}
                        </h2>
                        <p className="text-sm text-slate-400">
                            {persona ? 'Update your AI personality settings.' : 'Define a custom AI personality for your scripts.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                placeholder="e.g. Tech Reviewer, History Buff"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Category</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                            >
                                <option value="general">General</option>
                                <option value="educational">Educational</option>
                                <option value="entertainment">Entertainment</option>
                                <option value="storytelling">Storytelling</option>
                                <option value="news">News</option>
                                <option value="marketing">Marketing</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600 resize-none h-20"
                            placeholder="Brief description of this persona's purpose..."
                        />
                    </div>

                    <div className="space-y-2">
                        <SmartJsonInput
                            required
                            label={
                                <span className="flex items-center gap-2">
                                    System Instructions
                                    <div className="group relative">
                                        <Info className="w-4 h-4 text-slate-500 cursor-help" />
                                        <div className="absolute left-full ml-2 top-0 w-64 p-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                            The core instructions that define how the AI behaves. Be specific about tone, style, and structure.
                                        </div>
                                    </div>
                                </span>
                            }
                            value={formData.systemInstruction}
                            onChange={val => setFormData({ ...formData, systemInstruction: val })}
                            height="h-96"
                            placeholder="You are an enthusiastic tech reviewer who loves gadgets. Always start with a hook..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="flex items-center justify-between text-sm font-medium text-slate-300">
                                <span>Creativity (Temperature)</span>
                                <span className="text-indigo-400 font-mono">{formData.temperature}</span>
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={formData.temperature}
                                onChange={e => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Precise</span>
                                <span>Creative</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Tags</label>
                            <div className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 flex flex-wrap gap-2 min-h-[46px] items-center">
                                {formData.tags?.map(tag => (
                                    <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                                        {tag}
                                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-white">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={handleAddTag}
                                    className="bg-transparent border-none text-sm text-white focus:ring-0 p-1 flex-1 min-w-[80px]"
                                    placeholder="Add tag..."
                                />
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !formData.name || !formData.systemInstruction}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {persona ? 'Update Persona' : 'Create Persona'}
                    </button>
                </div>
            </div>
        </div>
    );
}
