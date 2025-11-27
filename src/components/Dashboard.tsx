
import React from 'react';
import { User, VideoProject } from '../types';
import { Plus, Clock, Film, Play, Trash2, Zap, Sparkles, ArrowRight } from 'lucide-react';
import Loader from './Loader';

interface DashboardProps {
  user: User;
  projects: VideoProject[];
  onNewProject: () => void;
  onOpenProject: (project: VideoProject) => void;
  onDeleteProject: (projectId: string) => void;
  isLoading?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ user, projects, onNewProject, onOpenProject, onDeleteProject, isLoading = false }) => {
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 animate-fade-in-up">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            Hello, {user.name.split(' ')[0]} <span className="animate-pulse">👋</span>
          </h1>
          <p className="text-slate-400 text-lg">Ready to create your next viral video?</p>
        </div>
        
        <button 
          onClick={onNewProject} 
          className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
        >
          <Sparkles className="w-5 h-5 mr-2 text-indigo-200 group-hover:text-white transition-colors" />
          <span>Create Magic</span>
          <ArrowRight className="w-5 h-5 ml-2 opacity-60 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" /> Recent Projects
            </h2>
            <div className="text-sm text-slate-500">
                {isLoading ? 'Syncing...' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
            </div>
        </div>

        {isLoading ? (
            <div className="w-full h-64 flex items-center justify-center bg-slate-800/30 rounded-3xl border border-slate-700/50">
                <Loader text="Loading your projects..." />
            </div>
        ) : projects.length === 0 ? (
            <div className="relative overflow-hidden bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-700/50 p-12 text-center group hover:border-indigo-500/30 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl ring-4 ring-slate-800 group-hover:scale-110 transition-transform duration-300">
                        <Film className="w-10 h-10 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">No projects yet</h3>
                    <p className="text-slate-400 mb-8 max-w-md mx-auto">
                        Your studio is empty. Start your first automated workflow to generate scripts, images, and voiceovers in seconds.
                    </p>
                    <button onClick={onNewProject} className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline flex items-center justify-center gap-2 mx-auto">
                        <Plus className="w-4 h-4" /> Start your first project
                    </button>
                </div>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => {
                    const completedScenes = project.scenes.filter(s => s.imageStatus === 'completed').length;
                    const totalScenes = project.scenes.length || 6;
                    const progress = Math.round((completedScenes / totalScenes) * 100);
                    
                    // Prefer the generated title (clean) over the raw topic (which might be a JSON blob)
                    let displayTitle = project.generatedTitle || project.topic;
                    
                    // Fallback: If title still looks like JSON (recovery failed or not happened yet), try to clean it for UI
                    if (typeof displayTitle === 'string' && (displayTitle.trim().startsWith('{') || displayTitle.trim().startsWith('['))) {
                         try {
                             const p = JSON.parse(displayTitle);
                             displayTitle = p.projectTitle || p.videoTitle || p.title || p.scriptTitle || "Untitled Project";
                         } catch(e) {}
                    }

                    return (
                        <div 
                            key={project.id} 
                            onClick={() => onOpenProject(project)}
                            className="group bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all cursor-pointer flex flex-col h-full"
                        >
                            {/* Thumbnail */}
                            <div className="aspect-video bg-slate-900 relative overflow-hidden">
                                {project.scenes[0]?.imageUrl ? (
                                    <img 
                                        src={project.scenes[0].imageUrl} 
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" 
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-800/80">
                                        <Zap className="w-12 h-12 text-slate-700 group-hover:text-indigo-500/50 transition-colors" />
                                    </div>
                                )}
                                
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
                                
                                <div className="absolute top-3 right-3 flex gap-2">
                                     <span className="bg-black/60 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-bold text-white uppercase tracking-wider border border-white/10">
                                        {project.language}
                                     </span>
                                </div>
                                
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }} 
                                    className="absolute top-3 left-3 p-2 bg-red-500/80 text-white rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all transform hover:scale-110 backdrop-blur-sm shadow-lg"
                                    title="Delete Project"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>

                                {/* Play Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30 shadow-2xl transform scale-75 group-hover:scale-100 transition-transform">
                                        <Play className="w-6 h-6 text-white fill-current" />
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="mb-3">
                                    <h3 className="font-bold text-white text-lg line-clamp-1 group-hover:text-indigo-300 transition-colors" title={displayTitle}>
                                        {displayTitle}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        <span className="bg-slate-700/50 px-2 py-0.5 rounded border border-slate-700">{project.style}</span>
                                        <span>•</span>
                                        <span>{formatDate(project.createdAt)}</span>
                                    </div>
                                </div>
                                
                                <div className="mt-auto pt-4 border-t border-slate-700/50">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-xs font-semibold text-slate-400">Progress</span>
                                        <span className="text-xs font-bold text-indigo-400">{progress}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-700/50 rounded-full w-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" 
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
