import React, { useState, useEffect } from 'react';
import { AppStep, VideoProject } from './types';
import Toast, { ToastType } from './components/Toast';
import AuthScreen from './components/AuthScreen';
import { getProject } from './services/storageService';
import { Step } from 'react-joyride';
import { useVideoGeneration } from './hooks/useVideoGeneration';
import { useProjects } from './hooks/useProjects';
import { useTranslation } from 'react-i18next';
import MainLayout from './components/layout/MainLayout';
import ScreenManager from './components/layout/ScreenManager';
import { useAuth } from './hooks/useAuth';
import { useAutosave } from './hooks/useAutosave';
import { getSettingsTourSteps, getCreationTourSteps, getScriptTourSteps } from './constants/tourSteps';
import { MOCK_PROJECT_TOUR } from './constants/mockProject';

const App: React.FC = () => {
    const { t } = useTranslation();
    
    // Auth & Session
    const { currentUser, setCurrentUser, isInitializing: isAuthInitializing, isLoggingOut, login, logout } = useAuth();
    const [step, setStep] = useState<AppStep>(AppStep.AUTH);
    const [isRestoringState, setIsRestoringState] = useState(true);

    // Tour State
    const [runTutorial, setRunTutorial] = useState(false);
    const [activeTour, setActiveTour] = useState<'settings' | 'creation' | 'script' | null>(null);
    const [tutorialSteps, setTutorialSteps] = useState<Step[]>([]);

    // Dashboard State
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false);

    // Data Fetching
    const {
        projects: userProjects,
        isLoading: isLoadingProjects,
        isFetching: isFetchingProjects,
        deleteProject,
        refreshProjects,
        page,
        setPage,
        totalPages
    } = useProjects(currentUser?.id, selectedFolderId, showArchived);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [selectedFolderId, showArchived, setPage]);

    // UI State
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; projectId: string | null }>({ isOpen: false, projectId: null });
    const [isLoadingProject, setIsLoadingProject] = useState(false);

    const showToast = (message: string, type: ToastType = 'info') => {
        setToast({ message, type });
    };

    // Video Generation Hook
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

    // Autosave Hook
    const { resetAutosave, lastSavedProjectJson } = useAutosave(project, setProject, currentUser, step);

    // Helpers
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

    const handleSetStep = (newStep: AppStep) => {
        setStep(newStep);
        localStorage.setItem('shortsai_last_step', newStep);
    };

    const handleStartTour = (tour: 'settings' | 'creation' | 'script') => {
        setActiveTour(tour);
        if (tour === 'settings') {
            handleSetStep(AppStep.SETTINGS);
            setTutorialSteps(getSettingsTourSteps(t));
        } else if (tour === 'creation') {
            handleSetStep(AppStep.INPUT);
            setTutorialSteps(getCreationTourSteps(t));
        } else if (tour === 'script') {
            // Load mock project if none matches
            if (!project) {
                setProject(MOCK_PROJECT_TOUR);
            }
            
            if (step !== AppStep.SCRIPTING) {
                handleSetStep(AppStep.SCRIPTING);
            }
            setTutorialSteps(getScriptTourSteps(t));
        }
        setTimeout(() => setRunTutorial(true), 800);
    };

    // --- Restoration Logic ---
    useEffect(() => {
        const restoreState = async () => {
            if (isAuthInitializing) return;

            if (currentUser) {
                const savedStep = localStorage.getItem('shortsai_last_step') as AppStep;
                const savedProjectId = localStorage.getItem('shortsai_last_project_id');

                if (savedStep && Object.values(AppStep).includes(savedStep)) {
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
                                setStep(AppStep.DASHBOARD);
                            }
                        } catch (e) {
                            console.error("Failed to restore project", e);
                            setStep(AppStep.DASHBOARD);
                        }
                    } else {
                        setStep(savedStep);
                    }
                } else {
                    setStep(AppStep.DASHBOARD);
                }
            } else {
                setStep(AppStep.AUTH);
            }
            setIsRestoringState(false);
        };
        restoreState();
    }, [isAuthInitializing, currentUser]);

    // --- Handlers ---
    const handleLoginWrapper = async (user: any) => {
        try {
            const loggedUser = await login(user);
            showToast(t('app.welcome', { name: loggedUser.name.split(' ')[0] }), 'success');
            handleSetStep(AppStep.DASHBOARD);
        } catch (err) {
            showToast(t('app.login_failed'), 'error');
        }
    };

    const handleLogoutWrapper = async () => {
        await logout();
        handleSetStep(AppStep.AUTH);
        localStorage.removeItem('shortsai_last_step');
        localStorage.removeItem('shortsai_last_project_id');
        showToast(t('app.logout'), 'info');
    };

    const handleGenerateNewProjectWrapper = async (...args: any[]) => {
        if (activeTour === 'creation') {
            setIsLoadingProject(true);
            setTimeout(() => {
                setIsLoadingProject(false);
                handleStartTour('script');
            }, 2000);
            return;
        }
        // @ts-ignore
        return generateNewProject(...args);
    };

    const handleNewProject = () => {
        setProject(null);
        resetAutosave();
        localStorage.removeItem('shortsai_last_project_id');
        handleSetStep(AppStep.INPUT);
    };

    const handleOpenProject = async (p: VideoProject) => {
        setIsLoadingProject(true);
        handleSetStep(AppStep.SCRIPTING);
        
        try {
            const fullProject = await getProject(p.id);
            if (fullProject) {
                const sanitizedProject = {
                    ...fullProject,
                    scenes: Array.isArray(fullProject.scenes) ? fullProject.scenes : []
                };
                lastSavedProjectJson.current = JSON.stringify(sanitizedProject);
                setProject(sanitizedProject);
                localStorage.setItem('shortsai_last_project_id', fullProject.id);
            } else {
                showToast(t('app.project_load_failed'), 'error');
                handleSetStep(AppStep.DASHBOARD);
            }
        } catch (e) {
            console.error(e);
            showToast(t('app.project_error'), 'error');
            handleSetStep(AppStep.DASHBOARD);
        } finally {
            setIsLoadingProject(false);
        }
    };

    const handleRequestDelete = (id: string) => {
        setDeleteModal({ isOpen: true, projectId: id });
    };

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

    // Auto-transition
    useEffect(() => {
        if (step === AppStep.GENERATING_IMAGES && project?.status && ['completed', 'failed', 'paused'].includes(project.status)) {
            handleSetStep(AppStep.SCRIPTING);
        }
    }, [project?.status, step]);

    if (isAuthInitializing || isRestoringState) {
        return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-400">{t('app.loading')}</div>;
    }

    if (step === AppStep.AUTH) {
        return (
            <>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                <AuthScreen onLogin={handleLoginWrapper} />
            </>
        );
    }

    return (
        <MainLayout
            currentUser={currentUser}
            step={step}
            onSetStep={handleSetStep}
            onLogout={handleLogoutWrapper}
            isLoggingOut={isLoggingOut}
            toast={toast}
            onCloseToast={() => setToast(null)}
            runTutorial={runTutorial}
            tutorialSteps={tutorialSteps}
            onFinishTutorial={() => { setRunTutorial(false); setActiveTour(null); }}
            onStartTour={handleStartTour}
            deleteModal={deleteModal}
            onConfirmDelete={handleConfirmDelete}
            onCancelDelete={() => setDeleteModal({ isOpen: false, projectId: null })}
            onRefreshProjects={refreshProjects}
            project={project}
        >
            <ScreenManager
                step={step}
                currentUser={currentUser}
                userProjects={userProjects}
                isLoadingProjects={isLoadingProjects}
                isFetchingProjects={isFetchingProjects}
                refreshProjects={refreshProjects}
                deleteProject={deleteProject}
                page={page}
                setPage={setPage}
                totalPages={totalPages}
                selectedFolderId={selectedFolderId}
                setSelectedFolderId={setSelectedFolderId}
                showArchived={showArchived}
                setShowArchived={setShowArchived}
                project={project}
                isLoadingProject={isLoadingProject}
                isGenerating={isGenerating}
                generationMessage={generationMessage}
                isPaused={isPaused}
                fatalError={fatalError}
                onNewProject={handleNewProject}
                onOpenProject={handleOpenProject}
                onDeleteProject={handleRequestDelete}
                onSetStep={handleSetStep}
                onUpdateUser={(u) => { setCurrentUser(u); showToast(t('settings.updated'), 'success'); }}
                showToast={showToast}
                generateNewProject={handleGenerateNewProjectWrapper}
                generateAssets={generateAssets}
                generateImagesOnly={generateImagesOnly}
                generateAudioOnly={generateAudioOnly}
                regenerateAllAudio={regenerateAllAudio}
                regenerateSceneImage={regenerateSceneImage}
                regenerateSceneAudio={regenerateSceneAudio}
                regenerateSceneVideo={regenerateSceneVideo}
                updateScene={updateScene}
                cancelGeneration={cancelGeneration}
                resumeGeneration={resumeGeneration}
                skipCurrentScene={skipCurrentScene}
                removeScene={removeScene}
                addScene={addScene}
                reorderScenes={reorderScenes}
                updateProjectSettings={updateProjectSettings}
                regenerateMusic={regenerateMusic}
                onExport={handleExport}
                getDisplayTitle={getDisplayTitle}
            />
        </MainLayout>
    );
};

export default App;
