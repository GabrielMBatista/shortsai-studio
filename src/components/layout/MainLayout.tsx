import React, { useState } from 'react';
import { AppStep, VideoProject, User } from '../../types';
import Loader from '../Loader';
import Toast, { ToastType } from '../Toast';
import ConfirmModal from '../ConfirmModal';
import Tutorial from '../Tutorial';
import QuotaHud from '../QuotaHud';
import { Film, LogOut, ChevronLeft, Shield, HelpCircle, Globe, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Step } from 'react-joyride';

interface MainLayoutProps {
    children: React.ReactNode;
    currentUser: User | null;
    step: AppStep;
    onSetStep: (step: AppStep) => void;
    onLogout: () => void;
    isLoggingOut: boolean;
    toast: { message: string; type: ToastType } | null;
    onCloseToast: () => void;
    runTutorial: boolean;
    tutorialSteps: Step[];
    onFinishTutorial: () => void;
    onStartTour: (tour: 'settings' | 'creation' | 'script') => void;
    deleteModal: { isOpen: boolean; projectId: string | null };
    onConfirmDelete: () => void;
    onCancelDelete: () => void;
    onRefreshProjects: () => void;
    project: VideoProject | null;
}

const MainLayout: React.FC<MainLayoutProps> = ({
    children,
    currentUser,
    step,
    onSetStep,
    onLogout,
    isLoggingOut,
    toast,
    onCloseToast,
    runTutorial,
    tutorialSteps,
    onFinishTutorial,
    onStartTour,
    deleteModal,
    onConfirmDelete,
    onCancelDelete,
    onRefreshProjects,
    project
}) => {
    const { t, i18n } = useTranslation();


    return (
        <div className="min-h-screen overflow-x-hidden bg-[#0f172a] text-slate-50 flex flex-col font-sans">
            {/* Notifications */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={onCloseToast} />}

            {/* Global Loader */}
            {isLoggingOut && <Loader fullScreen text={t('app.signing_out')} />}

            {/* Global Tutorial */}
            <Tutorial run={runTutorial} steps={tutorialSteps} onFinish={onFinishTutorial} />

            {/* Modals */}
            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title={t('dashboard.delete_confirm')}
                message={t('dashboard.delete_message')}
                onConfirm={onConfirmDelete}
                onCancel={onCancelDelete}
                isDestructive={true}
                confirmText={t('dashboard.delete_button')}
            />

            {/* Navbar */}
            <nav className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur sticky top-0 z-40 flex-shrink-0">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {step !== AppStep.DASHBOARD ? (
                            <button onClick={() => { onRefreshProjects(); onSetStep(AppStep.DASHBOARD); }} className="text-slate-400 hover:text-white transition-colors">
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                        ) : <Film className="h-8 w-8 text-indigo-500" />}
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 hidden sm:inline">{t('app.name')}</span>
                    </div>

                    {currentUser && (
                        <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
                            {/* Desktop Menu */}
                            <div className="hidden md:flex items-center gap-3">


                                {/* Language Selector */}
                                <div className="relative mr-2 group">
                                    <select
                                        value={i18n.language}
                                        onChange={(e) => {
                                            const lng = e.target.value;
                                            i18n.changeLanguage(lng);
                                            localStorage.setItem('i18nextLng', lng);
                                        }}
                                        className="appearance-none bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold py-2 pl-8 pr-8 rounded-lg focus:outline-none focus:border-indigo-500 hover:bg-slate-700 transition-colors cursor-pointer"
                                    >
                                        <option value="en">English</option>
                                        <option value="pt-BR">Português</option>
                                    </select>
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-500 group-hover:text-indigo-400 transition-colors">
                                        <Globe className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-500">
                                        <ChevronDown className="w-3 h-3" />
                                    </div>
                                </div>

                                {currentUser.role === 'ADMIN' && (
                                    <button
                                        onClick={() => onSetStep(AppStep.ADMIN)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${step === AppStep.ADMIN ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                    >
                                        <Shield className="w-4 h-4" />
                                        <span className="text-sm font-bold">{t('nav.admin')}</span>
                                    </button>
                                )}

                                {/* Shows Navigation */}
                                {currentUser.role === 'ADMIN' && (
                                    <button
                                        onClick={() => onSetStep(AppStep.SHOWS)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${step === AppStep.SHOWS ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                    >
                                        <Film className="w-4 h-4" />
                                        <span className="text-sm font-bold">Shows</span>
                                    </button>
                                )}

                                <button
                                    onClick={() => onSetStep(AppStep.GUIDES)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${step === AppStep.GUIDES ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                >
                                    <HelpCircle className="w-4 h-4" />
                                    <span className="text-sm font-bold">{t('nav.guides', 'Guides')}</span>
                                </button>

                                <button id="nav-settings" onClick={() => onSetStep(AppStep.SETTINGS)} className="flex items-center gap-2 group">
                                    <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-slate-600 transition-transform group-hover:scale-105 group-hover:border-indigo-500" />
                                </button>
                                <button onClick={onLogout} className="text-slate-400 hover:text-red-400 transition-colors"><LogOut className="w-5 h-5" /></button>
                            </div>

                            {/* Mobile Menu Trigger */}
                            <div className="md:hidden flex items-center gap-2">
                                <button onClick={() => onSetStep(AppStep.SETTINGS)} className="flex items-center gap-2 group">
                                    <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-slate-600" />
                                </button>
                                <button onClick={onLogout} className="text-slate-400 hover:text-red-400 transition-colors p-2"><LogOut className="w-5 h-5" /></button>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            <main className="flex-grow flex flex-col relative">
                {children}
            </main>

            <QuotaHud project={project} />
        </div>
    );
};

export default MainLayout;
