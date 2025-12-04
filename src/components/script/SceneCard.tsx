
import React, { useState, useEffect, useRef } from 'react';
import { Scene, ApiKeys } from '../../types';
import { useSceneVideoGeneration } from '../../hooks/useSceneVideoGeneration';
import { Loader2, AlertCircle, ImageIcon, RefreshCw, Clock, ChevronDown, ChevronUp, Mic, Pencil, Check, Trash2, Video, GripVertical } from 'lucide-react';
import AudioPlayerButton from '../common/AudioPlayerButton';
import ConfirmModal from '../ConfirmModal';
import { useTranslation } from 'react-i18next';

interface SceneCardProps {
    scene: Scene;
    sceneIndex: number;
    onRegenerateImage: (index: number, force: boolean) => void;
    onRegenerateAudio?: (index: number, force: boolean) => void;
    onRegenerateVideo?: (index: number, force: boolean) => void;
    onUpdateScene: (index: number, updates: Partial<Scene>) => void;
    onRemoveScene: (index: number) => void;
    dragHandleProps?: any;
    projectId: string;
    userId: string;
    apiKeys: ApiKeys;
    videoModel: string;
}

const SceneCard: React.FC<SceneCardProps> = ({ scene, sceneIndex, onRegenerateImage, onRegenerateAudio, onRegenerateVideo, onUpdateScene, onRemoveScene, dragHandleProps, projectId, userId, apiKeys, videoModel }) => {
    const { t } = useTranslation();
    const { generate: generateVideo, isPending: isVideoPending } = useSceneVideoGeneration();
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [narrationText, setNarrationText] = useState(scene.narration);
    // Prefer video if explicit preference is 'video', or if no preference but video exists
    const [showVideo, setShowVideo] = useState(scene.mediaType === 'video' || (!scene.mediaType && !!scene.videoUrl));

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

    useEffect(() => {
        // Sync local state with prop if it changes externally (or on remount if parent persisted it)
        setShowVideo(scene.mediaType === 'video' || (!scene.mediaType && !!scene.videoUrl));
    }, [scene.mediaType, scene.videoUrl]);

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
    const isVideoLoading = isVideoPending || (scene.videoStatus ? ['pending', 'queued', 'processing', 'loading'].includes(scene.videoStatus) : false);

    // Check if both video and image are available for toggle
    const hasVideo = scene.videoStatus === 'completed' && scene.videoUrl;
    const hasImage = scene.imageStatus === 'completed' && scene.imageUrl;
    const canToggle = (hasVideo || isVideoLoading) && hasImage;

    const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; type: 'image' | 'audio' | 'video' | null }>({ isOpen: false, type: null });
    const [localLoading, setLocalLoading] = useState<{ image: boolean; audio: boolean; video: boolean }>({ image: false, audio: false, video: false });

    useEffect(() => {
        if (localLoading.image) setLocalLoading(prev => ({ ...prev, image: false }));
    }, [scene.imageStatus]);

    useEffect(() => {
        if (localLoading.audio) setLocalLoading(prev => ({ ...prev, audio: false }));
    }, [scene.audioStatus]);

    useEffect(() => {
        if (localLoading.video) setLocalLoading(prev => ({ ...prev, video: false }));
    }, [scene.videoStatus]);

    const handleRegenClick = (type: 'image' | 'audio' | 'video') => {
        const isCompleted = type === 'image' ? scene.imageStatus === 'completed' : type === 'audio' ? scene.audioStatus === 'completed' : scene.videoStatus === 'completed';

        if (isCompleted) {
            setModalConfig({ isOpen: true, type });
        } else {
            triggerRegeneration(type);
        }
    };

    const triggerRegeneration = (type: 'image' | 'audio' | 'video') => {
        setLocalLoading(prev => ({ ...prev, [type]: true }));
        const force = true;
        if (type === 'image') onRegenerateImage(sceneIndex, force);
        else if (type === 'audio' && onRegenerateAudio) onRegenerateAudio(sceneIndex, force);
        else if (type === 'video') {
            if (scene.id && projectId) {
                generateVideo({
                    sceneId: scene.id,
                    projectId,
                    payload: {
                        userId,
                        imageUrl: scene.imageUrl,
                        prompt: scene.visualDescription,
                        keys: apiKeys,
                        modelId: videoModel,
                        withAudio: false
                    }
                });
            } else if (onRegenerateVideo) {
                onRegenerateVideo(sceneIndex, force);
            }
        }
        setModalConfig({ isOpen: false, type: null });
    };

    return (
        <>
            <ConfirmModal
                isOpen={modalConfig.isOpen}
                title={t('scene.regenerate_title', { type: modalConfig.type ? t(`scene.type_${modalConfig.type}`) : '' })}
                message={t('scene.regenerate_confirm')}
                confirmText={t('scene.regenerate_action')}
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
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-indigo-400 bg-slate-900/80 backdrop-blur-sm"><Loader2 className="w-8 h-8 animate-spin mb-2" /><span className="text-xs font-medium animate-pulse">{t('scene.generating_video')}</span></div>
                    ) : hasImage ? (
                        <img src={scene.imageUrl} alt={`Scene ${scene.sceneNumber}`} className="w-full h-full object-cover transition-opacity duration-500" />
                    ) : isImageLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-indigo-400 bg-slate-900/80 backdrop-blur-sm"><Loader2 className="w-8 h-8 animate-spin mb-2" /><span className="text-xs font-medium animate-pulse">{t('scene.generating_image')}</span></div>
                    ) : scene.imageStatus === 'error' || scene.videoStatus === 'error' ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-4 text-center text-sm bg-slate-900/80"><AlertCircle className="w-8 h-8 mb-2 mx-auto opacity-80" /><span>{scene.errorMessage || t('scene.failed_load')}</span></div>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-700 bg-slate-900"><ImageIcon className="w-16 h-16 opacity-10" /></div>
                    )}

                    {/* Top Left: Drag & Scene Info */}
                    <div className="absolute top-2 left-2 flex gap-2 items-center z-10">
                        {dragHandleProps && (
                            <div {...dragHandleProps} className="bg-black/60 hover:bg-slate-700 backdrop-blur p-1 rounded-md text-slate-400 hover:text-white cursor-grab active:cursor-grabbing border border-white/10 shadow-sm transition-colors">
                                <GripVertical className="w-4 h-4" />
                            </div>
                        )}
                        <div className="bg-black/60 backdrop-blur px-2.5 py-1 rounded-md text-xs font-mono text-white pointer-events-none border border-white/10 shadow-sm">
                            {t('scene.scene_number', { number: scene.sceneNumber })}
                        </div>
                    </div>

                    {/* Top Right: Delete */}
                    <div className="absolute top-2 right-2 z-10">
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); onRemoveScene(sceneIndex); }}
                            className="bg-black/60 hover:bg-red-600 backdrop-blur p-1.5 rounded-md text-white transition-all border border-white/10 shadow-sm cursor-pointer hover:scale-105"
                            title={t('scene.remove_scene')}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Bottom Left: Media Toggles */}
                    <div className="absolute bottom-2 left-2 flex gap-2 items-center z-10">
                        {canToggle && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const newShowVideo = !showVideo;
                                    setShowVideo(newShowVideo);
                                    onUpdateScene(sceneIndex, { mediaType: newShowVideo ? 'video' : 'image' });
                                }}
                                className="bg-black/60 hover:bg-purple-600/80 backdrop-blur px-2 py-1 rounded-md text-xs font-bold text-white transition-all border border-white/10 shadow-sm hover:scale-105"
                                title={showVideo ? t('scene.switch_to_image') : t('scene.switch_to_video')}
                            >
                                {showVideo ? `📹 ${t('scene.video_label')}` : `🖼️ ${t('scene.image_label')}`}
                            </button>
                        )}
                        {hasVideo && showVideo && (
                            <div className="bg-purple-500/80 backdrop-blur px-2 py-1 rounded-md text-xs font-bold text-white pointer-events-none border border-purple-400/30 shadow-sm flex items-center gap-1">
                                <Video className="w-3 h-3" /> {t('scene.veo_label')}
                            </div>
                        )}
                    </div>

                    {/* Bottom Right: Controls & Duration */}
                    <div className="absolute bottom-2 right-2 flex gap-2 items-center z-10">
                        <div className="bg-black/60 backdrop-blur px-2 py-1 rounded-md text-xs font-mono text-white flex items-center pointer-events-none border border-white/10 shadow-sm mr-1">
                            <Clock className="w-3 h-3 mr-1.5 text-slate-300" /> {Math.round(Number(scene.durationSeconds || 0))}s
                        </div>

                        <button
                            onClick={(e) => { e.stopPropagation(); handleRegenClick('image'); }}
                            className={`bg-black/60 hover:bg-indigo-600 backdrop-blur p-1.5 rounded-md text-white transition-all border border-white/10 shadow-sm ${isImageLoading || localLoading.image ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}`}
                            disabled={isImageLoading || localLoading.image}
                            title={t('scene.regenerate_image')}
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isImageLoading || localLoading.image ? 'animate-spin' : ''}`} />
                        </button>

                        {onRegenerateVideo && scene.imageStatus === 'completed' && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleRegenClick('video'); }}
                                className={`bg-black/60 hover:bg-purple-600 backdrop-blur p-1.5 rounded-md text-white transition-all border border-white/10 shadow-sm ${isVideoLoading || localLoading.video ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}`}
                                disabled={isVideoLoading || localLoading.video}
                                title={t('scene.animate_veo')}
                            >
                                {isVideoLoading || localLoading.video ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                            </button>
                        )}
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="p-4 flex-1 flex flex-col gap-4">
                    <div className="flex-1 min-h-0 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                    <Mic className="w-3 h-3" /> {t('scene.narration')}
                                </h4>
                                <button
                                    onClick={toggleEdit}
                                    disabled={isAudioLoading || localLoading.audio}
                                    className={`p-1 rounded-md transition-all ${isEditing ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-indigo-400 hover:bg-slate-700'} ${isAudioLoading || localLoading.audio ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isEditing ? <Check className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                {onRegenerateAudio && (
                                    <button
                                        onClick={() => handleRegenClick('audio')}
                                        disabled={isAudioLoading || isEditing || localLoading.audio}
                                        className={`p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ${isAudioLoading || isEditing || localLoading.audio ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        title={t('scene.regenerate_audio')}
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${isAudioLoading || localLoading.audio ? 'animate-spin' : ''}`} />
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
                                <span>{t('scene.visual_prompt')}</span>{isPromptOpen ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
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
