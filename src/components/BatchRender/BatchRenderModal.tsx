import React, { useState, useMemo } from 'react';
import { VideoProject } from '../../types';
import { BatchRenderConfig, DEFAULT_BATCH_RENDER_CONFIG } from '../../types/batch-render';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ProjectSelector from './ProjectSelector';
import RenderConfigForm from './RenderConfigForm';

interface BatchRenderModalProps {
    folderId: string | null;
    projects: VideoProject[];
    onClose: () => void;
    onSubmit: (selectedProjects: VideoProject[], config: BatchRenderConfig) => void;
}

type ModalStep = 'selection' | 'configuration';

const BatchRenderModal: React.FC<BatchRenderModalProps> = ({
    folderId,
    projects,
    onClose,
    onSubmit
}) => {
    const { t } = useTranslation();
    const [step, setStep] = useState<ModalStep>('selection');
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
    const [config, setConfig] = useState<BatchRenderConfig>(DEFAULT_BATCH_RENDER_CONFIG);

    // Filtrar projetos da pasta atual
    const folderProjects = useMemo(() => {
        if (folderId === null) {
            // Projetos da raiz (sem pasta)
            return projects.filter(p => !p.folderId);
        }
        return projects.filter(p => p.folderId === folderId);
    }, [projects, folderId]);

    const selectedProjects = useMemo(() => {
        return folderProjects.filter(p => selectedProjectIds.includes(p.id));
    }, [folderProjects, selectedProjectIds]);

    const handleToggleProject = (projectId: string) => {
        setSelectedProjectIds(prev =>
            prev.includes(projectId)
                ? prev.filter(id => id !== projectId)
                : [...prev, projectId]
        );
    };

    const handleToggleAll = () => {
        if (selectedProjectIds.length === folderProjects.length) {
            setSelectedProjectIds([]);
        } else {
            setSelectedProjectIds(folderProjects.map(p => p.id));
        }
    };

    const handleNextStep = () => {
        if (step === 'selection' && selectedProjectIds.length > 0) {
            setStep('configuration');
        }
    };

    const handlePreviousStep = () => {
        setStep('selection');
    };

    const handleSubmit = () => {
        if (selectedProjects.length > 0) {
            onSubmit(selectedProjects, config);
            onClose();
        }
    };

    const canProceed = step === 'selection'
        ? selectedProjectIds.length > 0
        : true;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div>
                        <h2 className="text-2xl font-bold text-white">
                            {step === 'selection'
                                ? t('batch_render.select_projects')
                                : t('batch_render.configure_render')}
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            {step === 'selection'
                                ? t('batch_render.select_projects_description')
                                : t('batch_render.configure_render_description')}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-800 transition-colors group"
                    >
                        <X className="w-6 h-6 text-slate-400 group-hover:text-white" />
                    </button>
                </div>

                {/* Progress Indicator */}
                <div className="flex items-center gap-2 px-6 py-3 bg-slate-800/50 border-b border-slate-700">
                    <div className={`flex items-center gap-2 ${step === 'selection' ? 'text-indigo-400' : 'text-green-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 'selection' ? 'bg-indigo-500 text-white' : 'bg-green-500 text-white'
                            }`}>
                            1
                        </div>
                        <span className="text-sm font-medium">{t('batch_render.step_selection')}</span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-600" />

                    <div className={`flex items-center gap-2 ${step === 'configuration' ? 'text-indigo-400' : 'text-slate-600'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 'configuration' ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'
                            }`}>
                            2
                        </div>
                        <span className="text-sm font-medium">{t('batch_render.step_configuration')}</span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    {step === 'selection' ? (
                        <ProjectSelector
                            projects={folderProjects}
                            selectedProjectIds={selectedProjectIds}
                            onToggleProject={handleToggleProject}
                            onToggleAll={handleToggleAll}
                        />
                    ) : (
                        <div className="h-full overflow-y-auto">
                            <RenderConfigForm
                                initialConfig={config}
                                onConfigChange={setConfig}
                                projectCount={selectedProjects.length}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-slate-700 bg-slate-800/50">
                    <div className="text-sm text-slate-400">
                        {step === 'selection' ? (
                            <span>
                                {folderProjects.length} {t('batch_render.projects_in_folder')}
                            </span>
                        ) : (
                            <span>
                                {selectedProjects.length} {t('batch_render.projects_selected')}
                            </span>
                        )}
                    </div>

                    <div className="flex gap-3">
                        {step === 'configuration' && (
                            <button
                                onClick={handlePreviousStep}
                                className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                {t('batch_render.back')}
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                        >
                            {t('batch_render.cancel')}
                        </button>

                        {step === 'selection' ? (
                            <button
                                onClick={handleNextStep}
                                disabled={!canProceed}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${canProceed
                                        ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                    }`}
                            >
                                {t('batch_render.continue')}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-green-500/20"
                            >
                                {t('batch_render.add_to_queue')}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BatchRenderModal;
