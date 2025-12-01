
import React, { useState, useEffect, useRef } from 'react';
import { Scene } from '../../types';
import { Loader2, AlertCircle, ImageIcon, RefreshCw, Clock, ChevronDown, ChevronUp, Mic, Pencil, Check, Trash2, Video } from 'lucide-react';
import AudioPlayerButton from '../common/AudioPlayerButton';
import ConfirmModal from '../ConfirmModal';

interface SceneCardProps {
    scene: Scene;
    sceneIndex: number;
    onRegenerateImage: (index: number, force: boolean) => void;
    onRegenerateAudio?: (index: number, force: boolean) => void;
    onRegenerateVideo?: (index: number, force: boolean) => void;
    onUpdateScene: (index: number, updates: Partial<Scene>) => void;
    onRemoveScene: (index: number) => void;
}

const SceneCard: React.FC<SceneCardProps> = ({ scene, sceneIndex, onRegenerateImage, onRegenerateAudio, onRegenerateVideo, onUpdateScene, onRemoveScene }) => {
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [narrationText, setNarrationText] = useState(scene.narration);
    const [showVideo, setShowVideo] = useState(!!scene.videoUrl); // Prefer video if available

    const [isEditingPrompt, setIsEditingPrompt] = useState(false);
    const [promptText, setPromptText] = useState(scene.visualDescription);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setNarrationText(scene.narration);
    }, [scene.narration]);

    useEffect(() => {
        setPromptText(scene.visualDescription);
    }, [scene.visualDescription]);

    const handleSaveNarration = () => {
        if (narrationText !== scene.narration) {
            onUpdateScene(sceneIndex, { narration: narrationText });
        }
        setIsEditing(false);
    };

    const handleSavePrompt = () => {
        if (promptText !== scene.visualDescription) {
            onUpdateScene(sceneIndex, { visualDescription: promptText });
        }
        setIsEditingPrompt(false);
    };

    const toggleEdit = () => {
        if (isEditing) {
            handleSaveNarration();
        } else {
            setIsEditing(true);
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 50);
        }
    };

    const toggleEditPrompt = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isEditingPrompt) {
            handleSavePrompt();
        } else {
            setIsPromptOpen(true);
            setIsEditingPrompt(true);
            setTimeout(() => {
                promptTextareaRef.current?.focus();
            }, 50);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            handleSaveNarration();
        }
    };

    const handlePromptKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            handleSavePrompt();
        }
    };

    // UI purely reflects backend state. No local 'isBusy' state.
    const isImageLoading = ['pending', 'queued', 'processing', 'loading'].includes(scene.imageStatus);
    const isAudioLoading = ['pending', 'queued', 'processing', 'loading'].includes(scene.audioStatus);
    const isVideoLoading = scene.videoStatus ? ['pending', 'queued', 'processing', 'loading'].includes(scene.videoStatus) : false;

    // Check if both video and image are available for toggle
    const hasVideo = scene.videoStatus === 'completed' && scene.videoUrl;
    const hasImage = scene.imageStatus === 'completed' && scene.imageUrl;
    const canToggle = (hasVideo || isVideoLoading) && hasImage;

    const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; type: 'image' | 'audio' | 'video' | null }>({ isOpen: false, type: null });

    const handleRegenClick = (type: 'image' | 'audio' | 'video') => {
        const isCompleted = type === 'image' ? scene.imageStatus === 'completed' : type === 'audio' ? scene.audioStatus === 'completed' : scene.videoStatus === 'completed';

        if (isCompleted) {
            setModalConfig({ isOpen: true, type });
        } else {
            triggerRegeneration(type);
        }
    };

    const triggerRegeneration = (type: 'image' | 'audio' | 'video') => {
        const force = true; // If we are here, we either confirmed or it wasn't completed yet (so force doesn't matter much, but let's be consistent)
        if (type === 'image') onRegenerateImage(sceneIndex, force);
        else if (type === 'audio' && onRegenerateAudio) onRegenerateAudio(sceneIndex, force);
        else if (type === 'video' && onRegenerateVideo) {
            onRegenerateVideo(sceneIndex, force);
        }
        setModalConfig({ isOpen: false, type: null });
    };

    return (
        <>
            <ConfirmModal
                isOpen={modalConfig.isOpen}
                title={`Regenerate ${modalConfig.type === 'image' ? 'Image' : modalConfig.type === 'audio' ? 'Audio' : 'Video'}?`}
                message="This will overwrite the existing file. Are you sure you want to continue?"
                confirmText="Regenerate"
                onConfirm={() => modalConfig.type && triggerRegeneration(modalConfig.type)}
                onCancel={() => setModalConfig({ isOpen: false, type: null })}
            />
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden flex flex-col hover:border-slate-600 transition-colors h-full shadow-lg">
                {/* IMAGE/VIDEO AREA */}
                <div className="aspect-[9/16] bg-slate-900 relative group border-b border-slate-700/50">
                    {/* Show video OR image based on preference */}
                    {showVideo && hasVideo ? (
                        <video
                            src={scene.videoUrl}
                            className="w-full h-full object-cover"
                            autoPlay
                            loop
                            muted
                            playsInline
                        />
                    ) : showVideo && isVideoLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-indigo-400 bg-slate-900/80 backdrop-blur-sm"><Loader2 className="w-8 h-8 animate-spin mb-2" /><span className="text-xs font-medium animate-pulse">Generating Video...</span></div>
                    ) : hasImage ? (
                        <img src={scene.imageUrl} alt={`Scene ${scene.sceneNumber}`} className="w-full h-full object-cover transition-opacity duration-500" />
                    ) : isImageLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-indigo-400 bg-slate-900/80 backdrop-blur-sm"><Loader2 className="w-8 h-8 animate-spin mb-2" /><span className="text-xs font-medium animate-pulse">Generating Image...</span></div>
                    ) : scene.imageStatus === 'error' || scene.videoStatus === 'error' ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-4 text-center text-sm bg-slate-900/80"><AlertCircle className="w-8 h-8 mb-2 mx-auto opacity-80" /><span>{scene.errorMessage || "Failed to load media."}</span></div>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-700 bg-slate-900"><ImageIcon className="w-16 h-16 opacity-10" /></div>
                    )}

                    <div className="absolute top-2 left-2 flex gap-2 items-center">
                        <div className="bg-black/60 backdrop-blur px-2.5 py-1 rounded-md text-xs font-mono text-white pointer-events-none border border-white/10 shadow-sm">
                            Scene {scene.sceneNumber}
                        </div>
                        {canToggle && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowVideo(!showVideo); }}
                                className="bg-black/60 hover:bg-purple-600/80 backdrop-blur px-2 py-0.5 rounded-md text-xs font-bold text-white transition-all border border-white/10 shadow-sm hover:scale-105"
                                title={showVideo ? "Switch to Image" : "Switch to Video"}
                            >
                                {showVideo ? '📹 VIDEO' : '🖼️ IMAGE'}
                            </button>
                        )}
                        {hasVideo && showVideo && (
                            <div className="bg-purple-500/80 backdrop-blur px-2 py-0.5 rounded-md text-xs font-bold text-white pointer-events-none border border-purple-400/30 shadow-sm flex items-center gap-1">
                                <Video className="w-3 h-3" /> VEO 2
                            </div>
                        )}
                    </div>

                    {/* Controls Overlay */}
                    <div className="absolute top-2 right-2 flex gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRegenClick('image'); }}
                            className={`bg-black/60 hover:bg-indigo-600 backdrop-blur p-1.5 rounded-md text-white transition-all border border-white/10 shadow-sm ${isImageLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}`}
                            disabled={isImageLoading}
                            title="Regenerate Image"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isImageLoading ? 'animate-spin' : ''}`} />
                        </button>
                        {onRegenerateVideo && scene.imageStatus === 'completed' && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleRegenClick('video'); }}
                                className={`bg-black/60 hover:bg-purple-600 backdrop-blur p-1.5 rounded-md text-white transition-all border border-white/10 shadow-sm ${isVideoLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}`}
                                disabled={isVideoLoading}
                                title="Animate with Veo 2"
                            >
                                {isVideoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); onRemoveScene(sceneIndex); }}
                            className="bg-black/60 hover:bg-red-600 backdrop-blur p-1.5 rounded-md text-white transition-all border border-white/10 shadow-sm cursor-pointer hover:scale-105"
                            title="Remove Scene"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="bg-black/60 backdrop-blur px-2 py-1 rounded-md text-xs font-mono text-white flex items-center pointer-events-none border border-white/10 shadow-sm">
                            <Clock className="w-3 h-3 mr-1.5 text-slate-300" /> {scene.durationSeconds}s
                        </div>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="p-4 flex-1 flex flex-col gap-4">
                    <div className="flex-1 min-h-0 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                    <Mic className="w-3 h-3" /> Narration
                                </h4>
                                <button
                                    onClick={toggleEdit}
                                    disabled={isAudioLoading}
                                    className={`p-1 rounded-md transition-all ${isEditing ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-indigo-400 hover:bg-slate-700'} ${isAudioLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isEditing ? <Check className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                {onRegenerateAudio && (
                                    <button
                                        onClick={() => handleRegenClick('audio')}
                                        disabled={isAudioLoading || isEditing}
                                        className={`p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ${isAudioLoading || isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        title="Regenerate Audio"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${isAudioLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                )}
                                <AudioPlayerButton audioUrl={scene.audioUrl} status={scene.audioStatus} />
                            </div>
                        </div>

                        <div className="relative">
                            <textarea
                                ref={textareaRef}
                                readOnly={!isEditing}
                                className={`w-full rounded-lg p-3 text-sm text-slate-200 leading-relaxed resize-none transition-all min-h-[80px] ${isEditing
                                    ? 'bg-slate-900/50 border border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none shadow-inner'
                                    : 'bg-transparent border border-transparent cursor-default focus:ring-0 opacity-90'
                                    }`}
                                value={narrationText}
                                onChange={(e) => setNarrationText(e.target.value)}
                                onBlur={handleSaveNarration}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                    </div>

                    <div className="mt-auto border-t border-slate-700/50 pt-3">
                        <div className="flex items-center justify-between mb-2">
                            <button onClick={() => setIsPromptOpen(!isPromptOpen)} className="flex items-center text-left text-[10px] uppercase tracking-wider text-slate-500 font-bold hover:text-indigo-400 transition-colors">
                                <span>Visual Prompt</span>{isPromptOpen ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                            </button>
                            <button
                                onClick={toggleEditPrompt}
                                disabled={isImageLoading}
                                className={`p-1 rounded-md transition-all ${isEditingPrompt ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-indigo-400 hover:bg-slate-700'} ${isImageLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isEditingPrompt ? <Check className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                            </button>
                        </div>
                        {isPromptOpen && (
                            <div className="animate-fade-in-up">
                                <textarea
                                    ref={promptTextareaRef}
                                    readOnly={!isEditingPrompt}
                                    className={`w-full text-xs text-slate-300 p-2.5 rounded border resize-y min-h-[80px] transition-all ${isEditingPrompt
                                        ? 'bg-slate-900/50 border border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none shadow-inner'
                                        : 'bg-transparent border border-transparent cursor-default focus:ring-0 opacity-90'
                                        }`}
                                    value={promptText}
                                    onChange={(e) => setPromptText(e.target.value)}
                                    onBlur={handleSavePrompt}
                                    onKeyDown={handlePromptKeyDown}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default SceneCard;
