import React from 'react';
import { AppStep, VideoProject, User, TTSProvider, Scene, ReferenceCharacter } from '../../types';
import Dashboard from '../Dashboard/Dashboard';
import SettingsScreen from '../Screens/SettingsScreen';
import InputSection from '../CreateProject/InputSection';
import ScriptView from '../Screens/ScriptView';
import VideoPlayer from '../Video/VideoPlayer';
import AdminDashboard from '../Dashboard/AdminDashboard';
import Loader from '../Common/Loader';
import ShowsView from '../Screens/ShowsView';
import GuideView from '../Screens/GuideView';
import ChannelsPage from '../Channels/ChannelsPage';
import PersonaLibrary from '../Personas/PersonaLibrary';
import { useTranslation } from 'react-i18next';

interface ScreenManagerProps {
    step: AppStep;
    currentUser: User | null;
    userProjects: VideoProject[];
    isLoadingProjects: boolean;
    isFetchingProjects: boolean;
    refreshProjects: () => void;
    deleteProject: (id: string) => void;
    page: number;
    setPage: (page: number) => void;
    totalPages: number;
    selectedFolderId: string | null;
    setSelectedFolderId: (id: string | null) => void;
    showArchived: boolean;
    setShowArchived: (show: boolean) => void;
    project: VideoProject | null;
    isLoadingProject: boolean;
    isGenerating: boolean;
    generationMessage: string;
    isPaused: boolean;
    fatalError: string | null;

    // Handlers
    onNewProject: () => void;
    onOpenProject: (p: VideoProject) => void;
    onEditProject: (p: VideoProject) => void;
    onDeleteProject: (id: string) => void;
    onSetStep: (step: AppStep) => void;
    onUpdateUser: (user: User) => void;
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void;

    // Generation Handlers (Matching useVideoGeneration hook)
    generateNewProject: (
        topic: string,
        style: string,
        voice: string,
        provider: TTSProvider,
        language: string,
        references: ReferenceCharacter[],
        includeMusic: boolean,
        durationConfig?: { min: number; max: number; targetScenes?: number },
        audioModel?: string,
        skipNavigation?: boolean,
        folderId?: string,
        channelId?: string | null,  // 🆕
        personaId?: string | null    // 🆕
    ) => Promise<void>;
    generateAssets: () => Promise<void>;
    generateImagesOnly: () => Promise<void>;
    generateAudioOnly: () => Promise<void>;
    regenerateAllAudio: (voice: string, provider: TTSProvider, language: string, audioModel?: string) => Promise<void>;
    regenerateSceneImage: (idx: number, force: boolean) => void;
    regenerateSceneAudio: (idx: number, force: boolean, overrides?: { voice?: string, provider?: TTSProvider, language?: string }) => Promise<void>;
    regenerateSceneVideo: (idx: number, force: boolean) => void;
    updateScene: (index: number, updates: Partial<Scene>) => Promise<void>;
    cancelGeneration: () => void;
    resumeGeneration: () => Promise<void>;
    skipCurrentScene: () => void;
    removeScene: (index: number) => Promise<void>;
    addScene: () => Promise<void>;
    reorderScenes: (oldIndex: number, newIndex: number) => Promise<void>;
    updateProjectSettings: (settings: {
        voiceName?: string;
        ttsProvider?: TTSProvider;
        language?: string;
        videoModel?: string;
        audioModel?: string;
        generatedTitle?: string;
        generatedDescription?: string;
        characterIds?: string[];
    }) => Promise<void>;
    regenerateMusic: () => Promise<void>;
    regenerateScript: () => Promise<void>;
    onExport: () => void;
    getDisplayTitle: (p: VideoProject) => string;
    onStartTour: (tour: 'settings' | 'creation' | 'script' | 'preview' | 'export' | 'folders') => void;
    activeTour: 'settings' | 'creation' | 'script' | 'preview' | 'export' | 'folders' | null;
    selectedInputPersonaId: string | null;
    setSelectedInputPersonaId: (id: string | null) => void;
}

const ScreenManager: React.FC<ScreenManagerProps> = ({
    step,
    currentUser,
    userProjects,
    isLoadingProjects,
    isFetchingProjects,
    refreshProjects,
    page,
    setPage,
    totalPages,
    selectedFolderId,
    setSelectedFolderId,
    showArchived,
    setShowArchived,
    project,
    isLoadingProject,
    isGenerating,
    generationMessage,
    isPaused,
    fatalError,
    onNewProject,
    onOpenProject,
    onEditProject,
    onDeleteProject,
    onSetStep,
    onUpdateUser,
    showToast,
    generateNewProject,
    generateAssets,
    generateImagesOnly,
    generateAudioOnly,
    regenerateAllAudio,
    regenerateSceneImage,
    regenerateSceneAudio,
    regenerateSceneVideo,
    updateScene,
    cancelGeneration,
    resumeGeneration,
    skipCurrentScene,
    removeScene,
    addScene,
    reorderScenes,
    updateProjectSettings,
    regenerateMusic,
    regenerateScript,
    onExport,
    getDisplayTitle,
    onStartTour,
    activeTour,
    selectedInputPersonaId,
    setSelectedInputPersonaId
}) => {
    const { t } = useTranslation();

    return (
        <>
            {step === AppStep.ADMIN && currentUser && currentUser.role === 'ADMIN' && (
                <AdminDashboard currentUser={currentUser} showToast={showToast} />
            )}

            {step === AppStep.DASHBOARD && currentUser && (
                <Dashboard
                    user={currentUser}
                    projects={userProjects}
                    onNewProject={onNewProject}
                    onOpenProject={onOpenProject}
                    onEditProject={onEditProject}
                    onDeleteProject={onDeleteProject}
                    onRefreshProjects={refreshProjects}
                    isLoading={isLoadingProjects}
                    isFetching={isFetchingProjects}
                    showToast={showToast}
                    page={page}
                    setPage={setPage}
                    totalPages={totalPages}
                    selectedFolderId={selectedFolderId}
                    setSelectedFolderId={setSelectedFolderId}
                    showArchived={showArchived}
                    setShowArchived={setShowArchived}
                    onStartTour={onStartTour}
                />
            )}

            {step === AppStep.CHANNELS && currentUser && (
                <ChannelsPage />
            )}

            {step === AppStep.PERSONAS && currentUser && (
                <PersonaLibrary
                    onBack={() => onSetStep(AppStep.DASHBOARD)}
                    onSelectPersonaForProject={(personaId) => {
                        setSelectedInputPersonaId(personaId);
                        onSetStep(AppStep.INPUT);
                    }}
                />
            )}

            {step === AppStep.SHOWS && currentUser && currentUser.role === 'ADMIN' && (
                <ShowsView
                    onOpenShow={(id) => { console.log('Open Show', id); /* Implementar nav pro detalhe depois */ }}
                    showToast={showToast}
                />
            )}

            {step === AppStep.SETTINGS && currentUser && (
                <SettingsScreen user={currentUser} onUpdateUser={onUpdateUser} />
            )}

            {step === AppStep.INPUT && (
                <InputSection
                    user={currentUser}
                    onGenerate={generateNewProject}
                    isLoading={isGenerating}
                    loadingMessage={generationMessage}
                    showToast={showToast}
                    editingProject={project}
                    initialPersonaId={selectedInputPersonaId}
                />
            )}

            {(step === AppStep.SCRIPTING || step === AppStep.GENERATING_IMAGES) && (
                isLoadingProject ? (
                    <Loader fullScreen text={t('app.loading_project')} />
                ) : project ? (
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
                        generatedShortsHashtags={project.generatedShortsHashtags}
                        generatedTiktokText={project.generatedTiktokText}
                        generatedTiktokHashtags={project.generatedTiktokHashtags}
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
                        onPreview={() => onSetStep(AppStep.PREVIEW)}
                        includeMusic={project.includeMusic}
                        musicStatus={project.bgMusicStatus}
                        musicUrl={project.bgMusicUrl}
                        musicPrompt={project.bgMusicPrompt}
                        onRegenerateMusic={regenerateMusic}
                        onRegenerateScript={regenerateScript}
                        // Orchestration Props
                        isPaused={isPaused}
                        fatalError={fatalError}
                        onResume={resumeGeneration}
                        onSkip={skipCurrentScene}
                        generationMessage={generationMessage}
                        onRemoveScene={removeScene}
                        onAddScene={addScene}
                        onReorderScenes={reorderScenes}
                        onExport={onExport}
                        onUpdateProjectSettings={updateProjectSettings}
                        projectId={project.id}
                        userId={currentUser?.id || ''}
                        apiKeys={currentUser?.apiKeys || {}}
                        showToast={showToast}
                        projectCharacters={project.projectCharacters || []}
                        currentUser={currentUser}
                    />
                ) : null
            )}

            {step === AppStep.PREVIEW && project && (
                <>
                    {/* Debug: Log scenes when entering preview */}
                    {console.log('[ScreenManager] Preview scenes:', project.scenes.map(s => ({
                        sceneNumber: s.sceneNumber,
                        mediaType: s.mediaType,
                        hasVideo: !!s.videoUrl,
                        hasImage: !!s.imageUrl
                    })))}
                    <VideoPlayer
                        scenes={Array.isArray(project.scenes) ? project.scenes : []}
                        onClose={() => onSetStep(AppStep.SCRIPTING)}
                        bgMusicUrl={project.bgMusicUrl}
                        title={getDisplayTitle(project)}
                        projectId={project.id}
                        onStartTour={onStartTour}
                        activeTour={activeTour}
                    />
                </>
            )}

            {step === AppStep.GUIDES && (
                <GuideView />
            )}
        </>
    );
};

export default ScreenManager;
