import React, { useState, useEffect, useRef } from 'react';
import { AppStep, VideoProject, User } from './types';
import InputSection from './components/InputSection';
import ScriptView from './components/ScriptView';
import VideoPlayer from './components/VideoPlayer';
import AuthScreen from './components/AuthScreen';
import Loader from './components/Loader';
import Dashboard from './components/Dashboard';
import SettingsScreen from './components/SettingsScreen';
import QuotaHud from './components/QuotaHud';
import Toast, { ToastType } from './components/Toast';
import ConfirmModal from './components/ConfirmModal';
import { loginUser, logoutUser, restoreSession, saveProject, getProject } from './services/storageService';
import AdminDashboard from './components/AdminDashboard';
import Tutorial from './components/Tutorial';
import { Step } from 'react-joyride';
import { Film, LogOut, ChevronLeft, Shield, HelpCircle, Globe, ChevronDown } from 'lucide-react';
import { useVideoGeneration } from './hooks/useVideoGeneration';
import { useProjects } from './hooks/useProjects';
import { useTranslation } from 'react-i18next';

const App: React.FC = () => {
    const { t, i18n } = useTranslation();
    // Global State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [step, setStep] = useState<AppStep>(AppStep.AUTH);
    const [isInitializing, setIsInitializing] = useState(true);

    // Tour State
    const [runTutorial, setRunTutorial] = useState(false);
    const [tutorialSteps, setTutorialSteps] = useState<Step[]>([]);
    const [isTourMenuOpen, setIsTourMenuOpen] = useState(false);

    // Dashboard State (Lifted)
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false);

    const settingsTourSteps: Step[] = [
        {
            target: 'body',
            content: t('tour.settings.welcome'),
            placement: 'center',
        },
        {
            target: '#geminiKey',
            content: (
                <div>
                    {t('tour.settings.gemini')}
                    <br />
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline mt-2 block">{t('tour.settings.gemini_link')}</a>
                </div>
            ),
        },
        {
            target: '#elevenLabsKey',
            content: (
                <div>
                    {t('tour.settings.elevenlabs')}
                    <br />
                    <a href="https://elevenlabs.io/app/speech-synthesis" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline mt-2 block">{t('tour.settings.elevenlabs_link')}</a>
                </div>
            ),
        },
        {
            target: 'button[type="submit"]',
            content: t('tour.settings.save'),
        }
    ];

    // Data Fetching (TanStack Query)
    const {
        projects: userProjects,
        isLoading: isLoadingProjects,
        deleteProject,
        refreshProjects,
        page,
        setPage,
        totalPages
    } = useProjects(currentUser?.id, selectedFolderId, showArchived);

    // UI State for Toasts & Modals
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; projectId: string | null }>({ isOpen: false, projectId: null });

    // Use the Generation Logic Hook
    const {
        project,
        setProject,
        updateScene,
        isGenerating,
        generationMessage,
        isPaused,
        fatalError,
        generateNewProject,
        generateAssets,
        generateImagesOnly,
        generateAudioOnly,
        cancelGeneration,
        resumeGeneration,
        skipCurrentScene,
        regenerateSceneImage,
        regenerateSceneAudio,
        regenerateSceneVideo,
        regenerateAllAudio,
        regenerateMusic,
        removeScene,
        updateProjectSettings,
        addScene,
        reorderScenes
    } = useVideoGeneration({
        user: currentUser,
        onError: (msg) => showToast(msg, 'error'),
        onStepChange: (newStep) => setStep(newStep)
    });

    // Autosave Ref to prevent loop
    const lastSavedProjectJson = useRef<string>("");

    // --- Helpers ---
    const showToast = (message: string, type: ToastType = 'info') => {
        setToast({ message, type });
    };

    const getDisplayTitle = (p: VideoProject) => {
        let title = p.generatedTitle || p.topic;
        if (typeof title === 'string' && (title.trim().startsWith('{') || title.trim().startsWith('['))) {
            try {
                const json = JSON.parse(title);
                title = json.projectTitle || json.videoTitle || json.title || json.scriptTitle || t('app.untitled_project');
            } catch (e) {
                title = t('app.untitled_project');
            }
        }
        return title;
    };

    // Wrapper to set step and persist it
    const handleSetStep = (newStep: AppStep) => {
        setStep(newStep);
        localStorage.setItem('shortsai_last_step', newStep);
    };

    const handleStartTour = (tour: 'settings') => {
        setIsTourMenuOpen(false);
        if (tour === 'settings') {
            handleSetStep(AppStep.SETTINGS);
            setTutorialSteps(settingsTourSteps);
            // Small delay to ensure DOM is ready
            setTimeout(() => setRunTutorial(true), 100);
        }
    };

    // --- Auth & Data Loading ---
    useEffect(() => {
        const initApp = async () => {
            setIsInitializing(true);
            const user = await restoreSession();
            if (user) {
                setCurrentUser(user);

                // Restore last step if available
                const savedStep = localStorage.getItem('shortsai_last_step') as AppStep;
                const savedProjectId = localStorage.getItem('shortsai_last_project_id');

                if (savedStep && Object.values(AppStep).includes(savedStep)) {
                    // If step requires a project, try to load it
                    if ([AppStep.SCRIPTING, AppStep.GENERATING_IMAGES, AppStep.PREVIEW].includes(savedStep) && savedProjectId) {
                        try {
                            const fullProject = await getProject(savedProjectId);
                            if (fullProject) {
                                const sanitizedProject = {
                                    ...fullProject,
                                    scenes: Array.isArray(fullProject.scenes) ? fullProject.scenes : []
                                };
                                lastSavedProjectJson.current = JSON.stringify(sanitizedProject);
                                setProject(sanitizedProject);
                                setStep(savedStep);
                            } else {
                                // Project not found, fallback to dashboard
                                setStep(AppStep.DASHBOARD);
                            }
                        } catch (e) {
                            console.error("Failed to restore project", e);
                            setStep(AppStep.DASHBOARD);
                        }
                    } else {
                        // Step doesn't require project or no project ID saved
                        setStep(savedStep);
                    }
                } else {
                    setStep(AppStep.DASHBOARD);
                }
            } else {
                setStep(AppStep.AUTH);
            }
            setIsInitializing(false);
        };
        initApp();
    }, []);

    const handleLogin = async (user: User) => {
        try {
            const loggedUser = await loginUser(user.email, user.name, user.avatar, user.id);
            setCurrentUser(loggedUser);
            handleSetStep(AppStep.DASHBOARD);
            showToast(t('app.welcome', { name: loggedUser.name.split(' ')[0] }), 'success');
        } catch (err) {
            showToast(t('app.login_failed'), 'error');
        }
    };

    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await logoutUser();
        setCurrentUser(null);
        handleSetStep(AppStep.AUTH);
        localStorage.removeItem('shortsai_last_step'); // Clear saved step on logout
        localStorage.removeItem('shortsai_last_project_id'); // Clear saved project
        setIsLoggingOut(false);
        showToast(t('app.logout'), 'info');
    };

    // --- Project Flow Handlers ---
    const handleNewProject = () => {
        setProject(null);
        lastSavedProjectJson.current = "";
        localStorage.removeItem('shortsai_last_project_id');
        handleSetStep(AppStep.INPUT);
    };

    const handleOpenProject = async (p: VideoProject) => {
        showToast(t('common.loading'), 'info');
        try {
            const fullProject = await getProject(p.id);
            if (fullProject) {
                const sanitizedProject = {
                    ...fullProject,
                    scenes: Array.isArray(fullProject.scenes) ? fullProject.scenes : []
                };
                lastSavedProjectJson.current = JSON.stringify(sanitizedProject);
                setProject(sanitizedProject);
                localStorage.setItem('shortsai_last_project_id', fullProject.id); // Persist ID
                handleSetStep(AppStep.SCRIPTING);
            } else {
                showToast(t('app.project_load_failed'), 'error');
            }
        } catch (e) {
            console.error(e);
            showToast(t('app.project_error'), 'error');
        }
    };

    // Trigger the delete modal
    const handleRequestDelete = (id: string) => {
        setDeleteModal({ isOpen: true, projectId: id });
    };

    // Execute the deletion
    const handleConfirmDelete = async () => {
        const id = deleteModal.projectId;
        if (!id) return;
        setDeleteModal({ isOpen: false, projectId: null });

        try {
            await deleteProject(id);
            showToast(t('dashboard.delete_success'), 'success');
        } catch (e) {
            showToast(t('app.delete_failed'), 'error');
        }
    };

    const handleExport = () => {
        if (!project) return;
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
        window.open(`${apiUrl}/projects/${project.id}/export`, '_blank');
    };

    // Autosave
    useEffect(() => {
        if (project && currentUser && step !== AppStep.DASHBOARD) {
            const currentJson = JSON.stringify(project);
            if (currentJson === lastSavedProjectJson.current) {
                return;
            }

            const timeout = setTimeout(async () => {
                try {
                    const savedProject = await saveProject(project);
                    lastSavedProjectJson.current = JSON.stringify(savedProject);

                    const needsUpdate = savedProject.id !== project.id ||
                        (Array.isArray(savedProject.scenes) &&
                            Array.isArray(project.scenes) &&
                            savedProject.scenes.some((s, i) => s.id !== project.scenes[i]?.id));

                    if (needsUpdate) {
                        setProject(prev => {
                            if (prev && prev.createdAt === savedProject.createdAt) {
                                return savedProject;
                            }
                            return prev;
                        });
                    }
                } catch (e) {
                    console.error("Autosave failed", e);
                }
            }, 2000);
            return () => clearTimeout(timeout);
        }
    }, [project, currentUser, step]);

    // Auto-transition from GENERATING_IMAGES to SCRIPTING when done
    useEffect(() => {
        if (step === AppStep.GENERATING_IMAGES && project?.status && ['completed', 'failed', 'paused'].includes(project.status)) {
            handleSetStep(AppStep.SCRIPTING);
        }
    }, [project?.status, step]);

    if (isInitializing) {
        return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-400">{t('app.loading')}</div>;
    }

    // --- Render ---
    if (step === AppStep.AUTH) {
        return (
            <>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                <AuthScreen onLogin={handleLogin} />
            </>
        );
    }

    return (
        <div className="min-h-screen overflow-x-hidden bg-[#0f172a] text-slate-50 flex flex-col font-sans">
            {/* Notifications */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Global Loader */}
            {isLoggingOut && <Loader fullScreen text={t('app.signing_out')} />}

            {/* Global Tutorial */}
            <Tutorial run={runTutorial} steps={tutorialSteps} onFinish={() => setRunTutorial(false)} />

            {/* Modals */}
            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title={t('dashboard.delete_confirm')}
                message={t('dashboard.delete_message')}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteModal({ isOpen: false, projectId: null })}
                isDestructive={true}
                confirmText={t('dashboard.delete_button')}
            />

            {/* Navbar */}
            <nav className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur sticky top-0 z-40 flex-shrink-0">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {step !== AppStep.DASHBOARD ? (
                            <button onClick={() => { refreshProjects(); handleSetStep(AppStep.DASHBOARD); }} className="text-slate-400 hover:text-white transition-colors">
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                        ) : <Film className="h-8 w-8 text-indigo-500" />}
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 hidden sm:inline">{t('app.name')}</span>
                    </div>

                    {currentUser && (
                        <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
                            {/* Desktop Menu */}
                            <div className="hidden md:flex items-center gap-3">
                                {/* Tour Menu */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsTourMenuOpen(!isTourMenuOpen)}
                                        className={`p-2 rounded-lg transition-colors ${isTourMenuOpen ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                        title="Tours & Help"
                                    >
                                        <HelpCircle className="w-5 h-5" />
                                    </button>

                                    {isTourMenuOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
                                            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                {t('nav.tours')}
                                            </div>
                                            <button
                                                onClick={() => handleStartTour('settings')}
                                                className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                                            >
                                                {t('nav.settings_tour')}
                                            </button>
                                        </div>
                                    )}
                                </div>

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
                                        onClick={() => handleSetStep(AppStep.ADMIN)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${step === AppStep.ADMIN ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                    >
                                        <Shield className="w-4 h-4" />
                                        <span className="text-sm font-bold">{t('nav.admin')}</span>
                                    </button>
                                )}
                                <button onClick={() => handleSetStep(AppStep.SETTINGS)} className="flex items-center gap-2 group">
                                    <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-slate-600 transition-transform group-hover:scale-105 group-hover:border-indigo-500" />
                                </button>
                                <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors"><LogOut className="w-5 h-5" /></button>
                            </div>

                            {/* Mobile Menu Trigger */}
                            <div className="md:hidden flex items-center gap-2">
                                <button onClick={() => handleSetStep(AppStep.SETTINGS)} className="flex items-center gap-2 group">
                                    <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-slate-600" />
                                </button>
                                {/* We could add a dropdown here for other mobile actions if needed, but for now Avatar -> Settings is good. 
                                    Logout is usually in Settings or we can add a small logout button here. */}
                                <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors p-2"><LogOut className="w-5 h-5" /></button>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            <main className="flex-grow flex flex-col relative">
                {step === AppStep.ADMIN && currentUser && currentUser.role === 'ADMIN' && (
                    <AdminDashboard currentUser={currentUser} />
                )}

                {step === AppStep.DASHBOARD && currentUser && (
                    <Dashboard
                        user={currentUser}
                        projects={userProjects}
                        onNewProject={handleNewProject}
                        onOpenProject={handleOpenProject}
                        onDeleteProject={handleRequestDelete}
                        onRefreshProjects={refreshProjects}
                        isLoading={isLoadingProjects}
                        showToast={showToast}
                        page={page}
                        setPage={setPage}
                        totalPages={totalPages}
                        selectedFolderId={selectedFolderId}
                        setSelectedFolderId={setSelectedFolderId}
                        showArchived={showArchived}
                        setShowArchived={setShowArchived}
                    />
                )}

                {step === AppStep.SETTINGS && currentUser && (
                    <SettingsScreen user={currentUser} onUpdateUser={(u) => { setCurrentUser(u); showToast(t('settings.updated'), 'success'); }} />
                )}

                {step === AppStep.INPUT && (
                    <InputSection
                        user={currentUser}
                        onGenerate={generateNewProject}
                        isLoading={isGenerating}
                        loadingMessage={generationMessage}
                        showToast={showToast}
                    />
                )}

                {(step === AppStep.SCRIPTING || step === AppStep.GENERATING_IMAGES) && project && (
                    <ScriptView
                        projectTopic={project.topic}
                        projectStyle={project.style}
                        projectVoice={project.voiceName}
                        projectProvider={project.ttsProvider}
                        projectLanguage={project.language}
                        projectAudioModel={project.audioModel}
                        scenes={Array.isArray(project.scenes) ? project.scenes : []}
                        generatedTitle={project.generatedTitle}
                        generatedDescription={project.generatedDescription}
                        onStartImageGeneration={generateAssets}
                        onGenerateImagesOnly={generateImagesOnly}
                        onGenerateAudioOnly={generateAudioOnly}
                        onRegenerateAudio={(v, p, l, m) => { regenerateAllAudio(v, p, l, m); showToast(t('script.regenerating_audio'), 'info'); }}
                        onRegenerateSceneImage={regenerateSceneImage}
                        onRegenerateSceneAudio={regenerateSceneAudio}
                        onRegenerateSceneVideo={regenerateSceneVideo}
                        onUpdateScene={updateScene}
                        isGeneratingImages={isGenerating || step === AppStep.GENERATING_IMAGES}
                        onCancelGeneration={() => { cancelGeneration(); showToast(t('script.generation_cancelled'), 'info'); }}
                        canPreview={Array.isArray(project.scenes) && project.scenes.some(s => s.imageStatus === 'completed')}
                        onPreview={() => handleSetStep(AppStep.PREVIEW)}
                        includeMusic={project.includeMusic}
                        musicStatus={project.bgMusicStatus}
                        musicUrl={project.bgMusicUrl}
                        musicPrompt={project.bgMusicPrompt}
                        onRegenerateMusic={regenerateMusic}
                        // Orchestration Props
                        isPaused={isPaused}
                        fatalError={fatalError}
                        onResume={resumeGeneration}
                        onSkip={skipCurrentScene}
                        generationMessage={generationMessage}
                        onRemoveScene={removeScene}
                        onAddScene={addScene}
                        onReorderScenes={reorderScenes}
                        onExport={handleExport}
                        onUpdateProjectSettings={updateProjectSettings}
                        projectId={project.id}
                        userId={currentUser?.id || ''}
                        apiKeys={currentUser?.apiKeys || {}}
                    />
                )}

                {step === AppStep.PREVIEW && project && (
                    <VideoPlayer
                        scenes={Array.isArray(project.scenes) ? project.scenes : []}
                        onClose={() => handleSetStep(AppStep.SCRIPTING)}
                        bgMusicUrl={project.bgMusicUrl}
                        title={getDisplayTitle(project)}
                    />
                )}
            </main>

            <QuotaHud project={project} />
        </div>
    );
};

export default App;
