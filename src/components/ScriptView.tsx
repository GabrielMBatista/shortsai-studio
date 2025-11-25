import React, { useState, useRef, useEffect } from 'react';
import { Scene, AVAILABLE_VOICES, AVAILABLE_LANGUAGES, Voice, TTSProvider } from '../types';
import { Clock, Image as ImageIcon, PlayCircle, Loader2, Volume2, AlertCircle, Play, Square, RefreshCw, Mic, Eye, ChevronDown, ChevronUp, Music, StopCircle, Sparkles, Waves, Globe, Copy, Check, Youtube } from 'lucide-react';
import { generateNarrationAudio } from '../services/geminiService';
import { generateElevenLabsAudio, getElevenLabsVoices } from '../services/elevenLabsService';

interface ScriptViewProps {
  projectTopic: string;
  projectStyle: string;
  projectVoice: string;
  projectProvider: TTSProvider;
  projectLanguage: string;
  scenes: Scene[];
  generatedTitle?: string;
  generatedDescription?: string;
  onStartImageGeneration: () => void;
  onRegenerateAudio: (newVoice: string, newProvider: TTSProvider, newLanguage: string) => void;
  onRegenerateSceneImage: (sceneIndex: number) => void;
  isGeneratingImages: boolean;
  onCancelGeneration?: () => void;
  canPreview: boolean;
  onPreview: () => void;
  includeMusic?: boolean;
  musicStatus?: 'pending' | 'loading' | 'completed' | 'error';
  musicUrl?: string;
  musicPrompt?: string;
  onRegenerateMusic?: () => void;
}

const AudioPlayerButton: React.FC<{ audioUrl?: string; status: string; label?: string; icon?: React.ReactNode }> = ({ audioUrl, status, label = "Listen", icon }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!audioRef.current && audioUrl) {
            audioRef.current = new Audio(audioUrl);
            audioRef.current.onended = () => setIsPlaying(false);
            audioRef.current.onpause = () => setIsPlaying(false);
        } else if (audioRef.current && audioUrl && audioRef.current.src !== audioUrl) {
             audioRef.current.src = audioUrl;
        }
    }, [audioUrl]);

    const toggleAudio = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        } else {
            audioRef.current.play().catch(e => console.error("Playback failed", e));
            setIsPlaying(true);
        }
    };

    if (status === 'loading') return <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />;
    if (status === 'error') return <AlertCircle className="w-4 h-4 text-red-400" />;
    if (status === 'completed' && audioUrl) {
        return (
            <button 
                onClick={toggleAudio}
                className="flex items-center space-x-1 text-xs bg-slate-700 hover:bg-slate-600 text-indigo-300 px-2 py-1 rounded transition-colors"
                title={isPlaying ? "Stop" : "Play"}
            >
                {isPlaying ? <Square className="w-3 h-3 fill-current" /> : (icon || <Play className="w-3 h-3 fill-current" />)}
                <span>{isPlaying ? 'Stop' : label}</span>
            </button>
        );
    }
    return <Volume2 className="w-4 h-4 text-slate-600" />;
};

const MetadataCard: React.FC<{ title?: string; description?: string }> = ({ title, description }) => {
    const [isCopiedTitle, setIsCopiedTitle] = useState(false);
    const [isCopiedDesc, setIsCopiedDesc] = useState(false);
    const [isOpen, setIsOpen] = useState(true);

    const copyToClipboard = async (text: string, isTitle: boolean) => {
        try {
            await navigator.clipboard.writeText(text);
            if (isTitle) {
                setIsCopiedTitle(true);
                setTimeout(() => setIsCopiedTitle(false), 2000);
            } else {
                setIsCopiedDesc(true);
                setTimeout(() => setIsCopiedDesc(false), 2000);
            }
        } catch (err) { console.error("Failed to copy", err); }
    };

    if (!title && !description) return null;

    return (
        <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl mb-6 overflow-hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-4 bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-2 text-red-400"><Youtube className="w-5 h-5" /><span className="font-semibold text-sm">YouTube Shorts Metadata</span></div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {isOpen && (
                <div className="p-4 space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Viral Title</label>
                            <button onClick={() => title && copyToClipboard(title, true)} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300">
                                {isCopiedTitle ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {isCopiedTitle ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm">{title || "Generating title..."}</div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Description & Hashtags</label>
                            <button onClick={() => description && copyToClipboard(description, false)} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300">
                                {isCopiedDesc ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {isCopiedDesc ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-300 text-sm whitespace-pre-wrap">{description || "Generating description..."}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SceneCard: React.FC<{ scene: Scene; sceneIndex: number; onRegenerateImage: (index: number) => void }> = ({ scene, sceneIndex, onRegenerateImage }) => {
    const [isPromptOpen, setIsPromptOpen] = useState(false);

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden flex flex-col hover:border-slate-600 transition-colors h-full">
            <div className="aspect-[9/16] bg-slate-900 relative group border-b border-slate-700/50">
               {scene.imageStatus === 'completed' && scene.imageUrl ? (
                   <img src={scene.imageUrl} alt={`Scene ${scene.sceneNumber}`} className="w-full h-full object-cover" />
               ) : scene.imageStatus === 'loading' ? (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-indigo-400"><Loader2 className="w-8 h-8 animate-spin mb-2" /><span className="text-xs font-medium">Generating Image...</span></div>
               ) : scene.imageStatus === 'error' ? (
                   <div className="absolute inset-0 flex items-center justify-center text-red-400 p-4 text-center text-sm"><AlertCircle className="w-6 h-6 mb-1 mx-auto" />Failed to load image.</div>
               ) : (
                   <div className="absolute inset-0 flex items-center justify-center text-slate-600"><ImageIcon className="w-12 h-12 opacity-20" /></div>
               )}
               
               <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-mono text-white pointer-events-none">Scene {scene.sceneNumber}</div>
               <div className="absolute top-2 right-2 flex gap-2">
                   <button onClick={(e) => { e.stopPropagation(); onRegenerateImage(sceneIndex); }} className={`bg-black/60 hover:bg-indigo-600 backdrop-blur p-1 rounded text-white transition-all ${scene.imageStatus === 'loading' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`} disabled={scene.imageStatus === 'loading'}><RefreshCw className={`w-3.5 h-3.5 ${scene.imageStatus === 'loading' ? 'animate-spin' : ''}`} /></button>
                   <div className="bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-mono text-white flex items-center pointer-events-none"><Clock className="w-3 h-3 mr-1" /> {scene.durationSeconds}s</div>
               </div>
            </div>

            <div className="p-4 flex-1 flex flex-col gap-3">
              <div className="flex-1 min-h-0">
                <div className="flex items-center justify-between mb-1"><h4 className="text-xs uppercase tracking-wider text-slate-500 font-bold">Narration</h4><AudioPlayerButton audioUrl={scene.audioUrl} status={scene.audioStatus} /></div>
                <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/50"><p className="text-sm text-slate-200 leading-relaxed italic max-h-[80px] overflow-y-auto scrollbar-hide">"{scene.narration}"</p></div>
              </div>
              <div className="mt-auto">
                <button onClick={() => setIsPromptOpen(!isPromptOpen)} className="flex items-center w-full text-left text-xs uppercase tracking-wider text-slate-500 font-bold hover:text-indigo-400 transition-colors mb-1">
                    <span>Visual Prompt</span>{isPromptOpen ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                </button>
                {isPromptOpen && <div className="text-xs text-slate-400 bg-slate-900/30 p-2 rounded border border-slate-800 animate-fade-in-up">{scene.visualDescription}</div>}
              </div>
            </div>
        </div>
    );
}

const ScriptView: React.FC<ScriptViewProps> = ({
  projectTopic, projectStyle, projectVoice, projectProvider, projectLanguage, scenes,
  generatedTitle, generatedDescription,
  onStartImageGeneration, onRegenerateAudio, onRegenerateSceneImage, isGeneratingImages, onCancelGeneration,
  canPreview, onPreview, includeMusic, musicStatus, musicUrl, musicPrompt, onRegenerateMusic
}) => {
  const [selectedProvider, setSelectedProvider] = useState<TTSProvider>(projectProvider);
  const [selectedVoice, setSelectedVoice] = useState(projectVoice);
  const [selectedLanguage, setSelectedLanguage] = useState(projectLanguage);
  
  const [previewState, setPreviewState] = useState<{ status: 'idle' | 'loading' | 'playing' }>({ status: 'idle' });
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [showMusicPrompt, setShowMusicPrompt] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);

  useEffect(() => {
      const loadVoices = async () => {
          setIsLoadingVoices(true);
          if (selectedProvider === 'elevenlabs') {
              try {
                  const voices = await getElevenLabsVoices();
                  setAvailableVoices(voices);
                  // Preserve selected voice if it exists in list, otherwise default to first
                  if (voices.length > 0) {
                       const currentVoiceExists = voices.find(v => v.name === selectedVoice);
                       if (!currentVoiceExists) setSelectedVoice(voices[0].name);
                  }
              } catch (e) { 
                  console.error("Failed to load ElevenLabs voices", e);
                  setAvailableVoices([]); 
              }
          } else {
              setAvailableVoices(AVAILABLE_VOICES);
              const currentVoiceExists = AVAILABLE_VOICES.find(v => v.name === selectedVoice);
              if (!currentVoiceExists) setSelectedVoice(AVAILABLE_VOICES[0].name);
          }
          setIsLoadingVoices(false);
      };
      loadVoices();
  }, [selectedProvider]);

  const completedImages = scenes.filter(s => s.imageStatus === 'completed').length;
  const totalTasks = scenes.length * 2; 
  const completedTasks = scenes.reduce((acc, s) => acc + (s.imageStatus === 'completed' ? 1 : 0) + (s.audioStatus === 'completed' ? 1 : 0), 0);
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const handlePreviewVoice = async () => {
    if (previewState.status === 'playing') {
        previewAudioRef.current?.pause();
        setPreviewState({ status: 'idle' });
        return;
    }
    setPreviewState({ status: 'loading' });
    try {
        const voiceObj = availableVoices.find(v => v.name === selectedVoice);
        const sampleText = `Hello, I am ${voiceObj?.label}.`;
        let url = selectedProvider === 'elevenlabs' 
            ? await generateElevenLabsAudio(sampleText, selectedVoice, selectedLanguage)
            : await generateNarrationAudio(sampleText, selectedVoice);
        
        const audio = new Audio(url);
        previewAudioRef.current = audio;
        audio.onended = () => setPreviewState({ status: 'idle' });
        await audio.play();
        setPreviewState({ status: 'playing' });
    } catch (e) {
        setPreviewState({ status: 'idle' });
    }
  };

  const hasChanges = selectedVoice !== projectVoice || selectedProvider !== projectProvider || selectedLanguage !== projectLanguage;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <header className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8 backdrop-blur-sm shadow-xl space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">{projectStyle}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">{projectLanguage}</span>
                    {includeMusic && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-500/20 text-pink-300 border border-pink-500/30">Soundtrack</span>}
                </div>
                <div className="flex items-start gap-2">
                     <h2 className="text-xl md:text-2xl font-bold text-white truncate" title={projectTopic}>{projectTopic}</h2>
                     <button onClick={() => setShowFullPrompt(!showFullPrompt)} className="mt-1 text-slate-400 hover:text-indigo-400"><Eye className="w-5 h-5" /></button>
                </div>
                {showFullPrompt && <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-700 text-slate-300 text-sm animate-fade-in-up">{projectTopic}</div>}
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 p-1">
                    <div className="flex mr-2 border-r border-slate-700 pr-2 gap-1">
                         <button onClick={() => setSelectedProvider('gemini')} className={`p-1.5 rounded transition-all ${selectedProvider === 'gemini' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}><Sparkles className="w-4 h-4" /></button>
                         <button onClick={() => setSelectedProvider('elevenlabs')} className={`p-1.5 rounded transition-all ${selectedProvider === 'elevenlabs' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-white'}`}><Waves className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-center px-2 border-r border-slate-700">
                        <Globe className="w-4 h-4 text-slate-500" />
                        <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} disabled={isGeneratingImages} className="bg-transparent text-white text-sm py-2 pl-2 pr-6 outline-none cursor-pointer hover:text-indigo-300 appearance-none min-w-[50px] max-w-[120px]">
                            {AVAILABLE_LANGUAGES.map(lang => <option key={lang.code} value={lang.label} className="bg-slate-900">{lang.label}</option>)}
                        </select>
                    </div>
                    {isLoadingVoices ? (
                        <div className="px-4 py-2 text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Loading...</div>
                    ) : (
                        <select 
                          value={selectedVoice} 
                          onChange={(e) => setSelectedVoice(e.target.value)} 
                          disabled={isGeneratingImages} 
                          className="bg-transparent text-white text-sm py-2 pl-2 pr-8 outline-none cursor-pointer hover:text-indigo-300 appearance-none min-w-[160px] max-w-[320px] truncate"
                        >
                            {availableVoices.map(v => <option key={v.name} value={v.name} className="bg-slate-900">{v.label} ({v.gender})</option>)}
                        </select>
                    )}
                    <button onClick={handlePreviewVoice} disabled={isGeneratingImages || isLoadingVoices} className="p-2 text-slate-400 hover:text-white border-l border-slate-700">{previewState.status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : previewState.status === 'playing' ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button>
                </div>

                <div className="flex items-center gap-3">
                    {hasChanges && (
                        <button onClick={() => onRegenerateAudio(selectedVoice, selectedProvider, selectedLanguage)} disabled={isGeneratingImages} className="flex items-center px-4 py-2.5 rounded-lg text-sm font-semibold bg-slate-700 hover:bg-slate-600 text-white border border-slate-600">
                            <RefreshCw className={`w-4 h-4 mr-2 ${isGeneratingImages ? 'animate-spin' : ''}`} /> Update Audio
                        </button>
                    )}
                    {isGeneratingImages && onCancelGeneration ? (
                        <button onClick={onCancelGeneration} className="flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/50">
                            <StopCircle className="w-4 h-4 mr-2" /> Stop
                        </button>
                    ) : (
                        completedImages < scenes.length && (
                            <button onClick={onStartImageGeneration} className={`flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20 ${isGeneratingImages ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
                                <ImageIcon className="w-4 h-4 mr-2" /> {completedImages === 0 ? "Generate Assets" : "Continue Generation"}
                            </button>
                        )
                    )}
                    <button onClick={onPreview} disabled={!canPreview} className={`flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${canPreview ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 border border-slate-700 text-slate-600 cursor-not-allowed'}`}>
                        <PlayCircle className="w-4 h-4 mr-2" /> Preview Video
                    </button>
                </div>
            </div>
        </div>

        <MetadataCard title={generatedTitle} description={generatedDescription} />

        {includeMusic && (
             <div className="border-t border-slate-700/50 pt-4 flex flex-col md:flex-row items-center gap-4 bg-slate-900/30 p-4 rounded-xl">
                 <div className="flex items-center gap-3">
                     <div className="p-2 bg-pink-500/20 text-pink-400 rounded-lg"><Music className="w-5 h-5" /></div>
                     <div>
                         <h3 className="text-sm font-semibold text-white">Background Music</h3>
                         {musicStatus === 'loading' ? <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Generating...</span> : musicStatus === 'error' ? <span className="text-xs text-red-400">Failed</span> : musicStatus === 'completed' ? <span className="text-xs text-emerald-400">Ready</span> : <span className="text-xs text-slate-500">Pending...</span>}
                     </div>
                 </div>
                 <div className="flex-1 w-full md:w-auto">
                    {musicPrompt && (
                        <div className="relative group">
                            <p onClick={() => setShowMusicPrompt(!showMusicPrompt)} className="text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded px-3 py-2 cursor-pointer hover:border-pink-500/30 truncate max-w-md">
                                <span className="font-mono text-pink-500/70 mr-2">PROMPT:</span>{musicPrompt}
                            </p>
                            {showMusicPrompt && <div className="absolute top-full left-0 mt-2 p-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 shadow-xl z-20 w-96">{musicPrompt}</div>}
                        </div>
                    )}
                 </div>
                 <div className="flex items-center gap-2">
                     {musicUrl && <AudioPlayerButton audioUrl={musicUrl} status={musicStatus || 'pending'} label="Preview Track" icon={<Play className="w-3 h-3 fill-current" />} />}
                     {onRegenerateMusic && musicStatus !== 'loading' && (
                         <button onClick={onRegenerateMusic} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors" title="Regenerate Music"><RefreshCw className="w-4 h-4" /></button>
                     )}
                 </div>
             </div>
        )}
      </header>

      {(isGeneratingImages || completedImages > 0) && (
        <div className="mb-8 bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div className="bg-indigo-500 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {scenes.map((scene, index) => <SceneCard key={scene.sceneNumber} scene={scene} sceneIndex={index} onRegenerateImage={onRegenerateSceneImage} />)}
      </div>
    </div>
  );
};

export default ScriptView;
