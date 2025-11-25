
import React, { useState, useEffect, useRef } from 'react';
import { AppStep, VideoProject, User, GOOGLE_CLIENT_ID } from './types';
import InputSection from './components/InputSection';
import ScriptView from './components/ScriptView';
import VideoPlayer from './components/VideoPlayer';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import SettingsScreen from './components/SettingsScreen';
import QuotaHud from './components/QuotaHud';
import Toast, { ToastType } from './components/Toast';
import ConfirmModal from './components/ConfirmModal';
import { loginUser, logoutUser, restoreSession, saveProject, getUserProjects, deleteProject } from './services/storageService';
import { Film, LogOut, ChevronLeft, Settings } from 'lucide-react';
import { useVideoGeneration } from './hooks/useVideoGeneration';
import { GoogleOAuthProvider } from '@react-oauth/google';

const App: React.FC = () => {
  // Global State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProjects, setUserProjects] = useState<VideoProject[]>([]);
  const [step, setStep] = useState<AppStep>(AppStep.AUTH);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // UI State for Toasts & Modals
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; projectId: string | null }>({ isOpen: false, projectId: null });

  // Use the Generation Logic Hook
  const { 
      project, 
      setProject, 
      isGenerating, 
      generationMessage, 
      generateNewProject, 
      generateAssets, 
      cancelGeneration, 
      regenerateSceneImage, 
      regenerateAllAudio,
      regenerateMusic
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

  // --- Auth & Data Loading ---
  useEffect(() => {
    const initApp = async () => {
        setIsInitializing(true);
        const user = await restoreSession();
        if (user) {
            setCurrentUser(user);
            try {
                const projects = await getUserProjects(user.id);
                setUserProjects(projects);
                setStep(AppStep.DASHBOARD);
            } catch (e) {
                console.error("Failed to load projects", e);
            }
        } else {
            setStep(AppStep.AUTH);
        }
        setIsInitializing(false);
    };
    initApp();
  }, []);

  const refreshProjects = async () => {
      if (currentUser) {
          try {
            const p = await getUserProjects(currentUser.id);
            setUserProjects(p);
          } catch (e) {
            console.error("Failed to refresh projects");
          }
      }
  };

  const handleLogin = async (user: User) => {
      try {
          const loggedUser = await loginUser(user.email, user.name, user.avatar, user.id);
          setCurrentUser(loggedUser);
          getUserProjects(loggedUser.id).then(setUserProjects);
          setStep(AppStep.DASHBOARD);
          showToast(`Welcome back, ${loggedUser.name.split(' ')[0]}!`, 'success');
      } catch (err) {
          showToast("Failed to login. Please try again.", 'error');
      }
  };

  const handleLogout = () => {
      logoutUser();
      setCurrentUser(null);
      setStep(AppStep.AUTH);
      showToast("Logged out successfully.", 'info');
  };

  // --- Project Flow Handlers ---
  const handleNewProject = () => {
      setProject(null);
      lastSavedProjectJson.current = ""; 
      setStep(AppStep.INPUT);
  };

  const handleOpenProject = (p: VideoProject) => {
      // Ensure we pass a clean object to state
      const sanitizedProject = {
          ...p,
          scenes: Array.isArray(p.scenes) ? p.scenes : []
      };
      // Set the ref to the current state so autosave doesn't trigger immediately
      lastSavedProjectJson.current = JSON.stringify(sanitizedProject);
      setProject(sanitizedProject);
      setStep(AppStep.SCRIPTING);
  };

  // Trigger the delete modal
  const handleRequestDelete = (id: string) => {
      setDeleteModal({ isOpen: true, projectId: id });
  };

  // Execute the deletion
  const handleConfirmDelete = async () => {
      const id = deleteModal.projectId;
      if (!id) return;

      // Optimistic Update: Remove from UI immediately
      setUserProjects(prev => prev.filter(p => p.id !== id));
      setDeleteModal({ isOpen: false, projectId: null });

      try {
          await deleteProject(id);
          showToast("Project deleted successfully.", 'success');
          // Refresh in background to ensure sync
          refreshProjects();
      } catch (e) {
          showToast("Failed to delete project from server.", 'error');
          refreshProjects(); // Revert if failed
      }
  };

  // Autosave
  useEffect(() => {
      if (project && currentUser && step !== AppStep.DASHBOARD) {
          // Check if data actually changed to avoid unnecessary API calls and duplication
          const currentJson = JSON.stringify(project);
          if (currentJson === lastSavedProjectJson.current) {
              return;
          }

          const timeout = setTimeout(async () => {
             try {
                 const savedProject = await saveProject(project);
                 
                 // Update the ref to the latest saved state
                 lastSavedProjectJson.current = JSON.stringify(savedProject);

                 // Check if we need to sync IDs (Defensive check for array)
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

  if (isInitializing) {
      return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-400">Loading Session...</div>;
  }

  // --- Render ---
  if (step === AppStep.AUTH) {
    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.trim() !== "") {
        return (
          <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <AuthScreen onLogin={handleLogin} />
          </GoogleOAuthProvider>
        );
    }
    return (
        <>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <AuthScreen onLogin={handleLogin} />
        </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-50 flex flex-col font-sans">
      {/* Notifications */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Modals */}
      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        title="Delete Project?"
        message="This action cannot be undone. This will permanently delete the script, images, and audio files associated with this project."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, projectId: null })}
        isDestructive={true}
        confirmText="Delete Project"
      />

      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {step !== AppStep.DASHBOARD ? (
                  <button onClick={() => { refreshProjects(); setStep(AppStep.DASHBOARD); }} className="text-slate-400 hover:text-white transition-colors">
                      <ChevronLeft className="w-6 h-6" />
                  </button>
              ) : <Film className="h-8 w-8 text-indigo-500" />}
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">ShortsAI</span>
            </div>
            
            {currentUser && (
                <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
                    <button onClick={() => setStep(AppStep.SETTINGS)} className="flex items-center gap-2 group">
                        <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-slate-600 transition-transform group-hover:scale-105 group-hover:border-indigo-500" />
                    </button>
                    <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors"><LogOut className="w-5 h-5" /></button>
                </div>
            )}
        </div>
      </nav>

      <main className="flex-grow flex flex-col relative">
        {step === AppStep.DASHBOARD && currentUser && (
            <Dashboard 
                user={currentUser} 
                projects={userProjects}
                onNewProject={handleNewProject}
                onOpenProject={handleOpenProject}
                onDeleteProject={handleRequestDelete}
            />
        )}

        {step === AppStep.SETTINGS && currentUser && (
            <SettingsScreen user={currentUser} onUpdateUser={(u) => { setCurrentUser(u); showToast("Settings updated!", 'success'); }} />
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
            scenes={Array.isArray(project.scenes) ? project.scenes : []}
            generatedTitle={project.generatedTitle}
            generatedDescription={project.generatedDescription}
            onStartImageGeneration={generateAssets}
            onRegenerateAudio={(v, p, l) => { regenerateAllAudio(v, p, l); showToast("Regenerating audio...", 'info'); }}
            onRegenerateSceneImage={regenerateSceneImage}
            isGeneratingImages={step === AppStep.GENERATING_IMAGES}
            onCancelGeneration={() => { cancelGeneration(); showToast("Generation cancelled.", 'info'); }}
            canPreview={Array.isArray(project.scenes) && project.scenes.some(s => s.imageStatus === 'completed')}
            onPreview={() => setStep(AppStep.PREVIEW)}
            includeMusic={project.includeMusic}
            musicStatus={project.bgMusicStatus}
            musicUrl={project.bgMusicUrl}
            musicPrompt={project.bgMusicPrompt}
            onRegenerateMusic={regenerateMusic}
          />
        )}

        {step === AppStep.PREVIEW && project && (
          <VideoPlayer 
            scenes={Array.isArray(project.scenes) ? project.scenes : []} 
            onClose={() => setStep(AppStep.SCRIPTING)}
            bgMusicUrl={project.bgMusicUrl}
            projectTopic={project.topic}
          />
        )}
      </main>
      
      <QuotaHud />
    </div>
  );
};

export default App;
