import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus } from 'lucide-react';
import PersonaGallery from './PersonaGallery';
import CreatePersonaModal from './CreatePersonaModal';
import { usePersonas } from '../hooks/usePersonas';

interface PersonaLibraryProps {
    onBack: () => void;
}

const PersonaLibrary: React.FC<PersonaLibraryProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { createPersona } = usePersonas();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    return (
        <div className="flex-1 overflow-y-auto bg-slate-900 min-h-screen p-8 animate-fade-in">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header with Back Button */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">
                                {t('personas.library_title', 'Persona Library')}
                            </h1>
                            <p className="text-slate-400">
                                {t('personas.library_subtitle', 'Explore and manage AI scriptwriting personas.')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-indigo-600/20"
                    >
                        <Plus className="w-5 h-5" />
                        {t('personas.create_new', 'Create Persona')}
                    </button>
                </div>

                {/* Gallery Content */}
                <PersonaGallery />

                {/* Create Modal */}
                <CreatePersonaModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={async (data) => { await createPersona(data); }}
                />
            </div>
        </div>
    );
};

export default PersonaLibrary;
