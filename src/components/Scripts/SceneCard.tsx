
import React, { useState, useEffect, useRef } from 'react';
import { Scene, ApiKeys } from '../../types';
import { useSceneVideoGeneration } from '../../hooks/useSceneVideoGeneration';
import { getSceneMedia } from '../../services/scenes';
import { Loader2, AlertCircle, ImageIcon, RefreshCw, Clock, ChevronDown, ChevronUp, Mic, Pencil, Check, Trash2, Video, GripVertical, User as UserIcon } from 'lucide-react';
import AudioPlayerButton from '../Common/AudioPlayerButton';
import ConfirmModal from '../Common/ConfirmModal';
import { SafeImage } from '../Common/SafeImage';
import { SafeVideo } from '../Common/SafeVideo';
import { useTranslation } from 'react-i18next';
import { SceneCharacterPicker } from './SceneCharacterPicker';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { AssetLibraryModal } from '../Common/AssetLibraryModal';
import { Library } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useAssetUpload } from '../../hooks/useAssetUpload';

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
    projectCharacters?: import('../../types').SavedCharacter[];
}

const SceneCard: React.FC<SceneCardProps> = ({ scene, sceneIndex, onRegenerateImage, onRegenerateAudio, onRegenerateVideo, onUpdateScene, onRemoveScene, dragHandleProps, projectId, userId, apiKeys, videoModel, projectCharacters }) => {
    const { t } = useTranslation();
    const { generate: generateVideo, isPending: isVideoPending } = useSceneVideoGeneration();
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [narrationText, setNarrationText] = useState(scene.narration);
    // Prefer video if explicit preference is 'video', or if no preference but video exists
    const [showVideo, setShowVideo] = useState(scene.mediaType === 'video' || (!scene.mediaType && !!scene.videoUrl));

    const [isEditingPrompt, setIsEditingPrompt] = useState(false);
    const [promptText, setPromptText] = useState(scene.visualDescription);
    const [isAssetLibraryOpen, setIsAssetLibraryOpen] = useState(false);

    // Drag and drop states
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [dragCounter, setDragCounter] = useState(0);
    const { uploadAsset, isUploading, uploadProgress, error: uploadError } = useAssetUpload();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setNarrationText(scene.narration);
    }, [scene.narration]);

    useEffect(() => {
        setPromptText(scene.visualDescription);
    }, [scene.visualDescription]);

    const [mediaData, setMediaData] = useState<{ imageUrl?: string | null, audioUrl?: string | null, videoUrl?: string | null }>({
        imageUrl: scene.imageUrl || null,
        audioUrl: scene.audioUrl || null,
        videoUrl: scene.videoUrl || null
    });

    // Optimistic status to handle UI updates before parent prop propagation
    const [optimisticStatus, setOptimisticStatus] = useState<{
        image?: string;
        video?: string;
        audio?: string;
    }>({});

    // Reset optimistic status when props update
    useEffect(() => {
        setOptimisticStatus(prev => ({ ...prev, image: undefined }));
    }, [scene.imageStatus]);
    useEffect(() => {
        setOptimisticStatus(prev => ({ ...prev, audio: undefined }));
    }, [scene.audioStatus]);
    useEffect(() => {
        setOptimisticStatus(prev => ({ ...prev, video: undefined }));
    }, [scene.videoStatus]);
    const [isLoadingMedia, setIsLoadingMedia] = useState(false);

    const { targetRef, isIntersecting } = useIntersectionObserver({ rootMargin: '400px' });
    const [hasBeenVisible, setHasBeenVisible] = useState(false);

    useEffect(() => {
        if (isIntersecting) setHasBeenVisible(true);
    }, [isIntersecting]);

    useEffect(() => {
        // Sync with props if they update (e.g. after regeneration)
        if (scene.imageUrl) setMediaData(prev => ({ ...prev, imageUrl: scene.imageUrl }));
        if (scene.audioUrl) setMediaData(prev => ({ ...prev, audioUrl: scene.audioUrl }));
        if (scene.videoUrl) setMediaData(prev => ({ ...prev, videoUrl: scene.videoUrl }));

        // Only fetch if visible (lazy load)
        if (!hasBeenVisible) return;

        const loadMedia = async () => {
            const missingImage = scene.imageStatus === 'completed' && !scene.imageUrl && !mediaData.imageUrl;
            const missingAudio = scene.audioStatus === 'completed' && !scene.audioUrl && !mediaData.audioUrl;
            const missingVideo = (scene.videoStatus === 'completed' || showVideo) && !scene.videoUrl && !mediaData.videoUrl;

            if ((missingImage || missingAudio || missingVideo) && scene.id) {
                setIsLoadingMedia(true);
                const data = await getSceneMedia(scene.id);
                if (data) {
                    setMediaData(prev => ({
                        ...prev,
                        imageUrl: data.image_base64 || prev.imageUrl,
                        audioUrl: data.audio_base64 || prev.audioUrl,
                        videoUrl: data.video_base64 || prev.videoUrl
                    }));
                }
                setIsLoadingMedia(false);
            }
        };
        loadMedia();
    }, [scene.id, scene.imageStatus, scene.audioStatus, scene.videoStatus, scene.imageUrl, scene.audioUrl, scene.videoUrl, hasBeenVisible]);

    useEffect(() => {
        // Sync local state with prop if it changes externally (or on remount if parent persisted it)
        setShowVideo(scene.mediaType === 'video' || (!scene.mediaType && !!(scene.videoUrl || mediaData.videoUrl)));
    }, [scene.mediaType, scene.videoUrl, mediaData.videoUrl]);

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
    const currentImageStatus = optimisticStatus.image || scene.imageStatus;
    const currentAudioStatus = optimisticStatus.audio || scene.audioStatus;
    const currentVideoStatus = optimisticStatus.video || scene.videoStatus;

    const isImageLoading = ['pending', 'queued', 'processing', 'loading'].includes(currentImageStatus);
    const isAudioLoading = ['pending', 'queued', 'processing', 'loading'].includes(currentAudioStatus);
    // Video loading: check hook state BUT override if backend shows completed/failed
    const isVideoLoadingFromStatus = currentVideoStatus ? ['pending', 'queued', 'processing', 'loading'].includes(currentVideoStatus) : false;
    const isVideoCompleted = currentVideoStatus === 'completed' || currentVideoStatus === 'failed' || currentVideoStatus === 'error';
    const isVideoLoading = isVideoCompleted ? false : (isVideoPending || isVideoLoadingFromStatus);

    // Check if both video and image are available for toggle
    // Consider video as "has" if status is completed AND (URL exists OR still loading media data)
    const hasVideoUrl = !!(scene.videoUrl || mediaData.videoUrl);
    const hasVideo = currentVideoStatus === 'completed' && (hasVideoUrl || isLoadingMedia);
    const hasImage = currentImageStatus === 'completed' && (scene.imageUrl || mediaData.imageUrl);
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
                    userId,
                    // imageUrl: scene.imageUrl, // Removed to avoid 413 payload too large. Fetched server-side.
                    prompt: scene.visualDescription,
                    keys: apiKeys,
                    modelId: videoModel,
                    withAudio: false
                });
            } else if (onRegenerateVideo) {
                onRegenerateVideo(sceneIndex, force);
            }
        }
        setModalConfig({ isOpen: false, type: null });
    };

    const imgRef = useRef<HTMLImageElement>(null);
    const [imageLoaded, setImageLoaded] = useState(false);

    useEffect(() => {
        setImageLoaded(false);
        // Fix for race condition where image loads before effect runs (cached images)
        if (imgRef.current && imgRef.current.complete) {
            setImageLoaded(true);
        }
    }, [mediaData.imageUrl, scene.imageUrl]);

    const selectedCharIds = scene.characters?.map(c => c.id) || [];

    const handleToggleCharacter = (charId: string) => {
        const chars = scene.characters || [];
        const isSelected = chars.find(c => c.id === charId);
        let newChars = [];

        if (isSelected) {
            newChars = chars.filter(c => c.id !== charId);
        } else {
            const charToAdd = projectCharacters?.find(c => c.id === charId);
            if (charToAdd) newChars = [...chars, charToAdd];
            else newChars = chars;
        }
        onUpdateScene(sceneIndex, { characters: newChars });
    };

    const handleClearSelection = () => {
        onUpdateScene(sceneIndex, { characters: [] });
    };

    // Drag and drop handlers with counter to prevent stuck state
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragCounter(prev => prev + 1);
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragCounter(prev => {
            const newCount = prev - 1;
            if (newCount === 0) {
                setIsDraggingOver(false);
            }
            return newCount;
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Always reset drag state completely
        setDragCounter(0);
        setIsDraggingOver(false);

        if (!scene.id) {
            console.error('Scene ID not available');
            return;
        }

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        const file = files[0]; // Only handle first file

        // Validate file type
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (!isImage && !isVideo) {
            alert(t('scene.invalid_file_type', 'Apenas imagens e vídeos são permitidos'));
            return;
        }

        try {
            const result = await uploadAsset({
                sceneId: scene.id,
                file,
                assetType: isVideo ? 'video' : 'image'
            });

            if (result && result.success) {
                // Update local state immediately
                const updates: Partial<Scene> = {};

                if (isVideo) {
                    updates.videoUrl = result.url;
                    updates.videoStatus = 'completed';
                    updates.mediaType = 'video';
                    // Update state to trigger reload
                    setMediaData(prev => ({ ...prev, videoUrl: result.url }));
                    setOptimisticStatus(prev => ({ ...prev, video: 'completed' }));
                    setShowVideo(true);
                } else {
                    updates.imageUrl = result.url;
                    updates.imageStatus = 'completed';
                    updates.mediaType = 'image';
                    // Update state to trigger reload
                    setMediaData(prev => ({ ...prev, imageUrl: result.url }));
                    setOptimisticStatus(prev => ({ ...prev, image: 'completed' }));
                    setShowVideo(false);
                }

                onUpdateScene(sceneIndex, updates);
            } else {
                // Upload failed - show error to user
                const errorMsg = uploadError || t('scene.upload_failed', 'Falha no upload. Tente novamente.');
                alert(errorMsg);
            }
        } catch (error: any) {
            console.error('Upload failed:', error);
            const errorMsg = error.message || t('scene.upload_error', 'Erro ao fazer upload do arquivo');
            alert(errorMsg);
        }
    };

    const handleSelectLibraryAsset = async (asset: any) => {
        try {
            const data = await apiFetch(`/scenes/${scene.id}/reuse`, {
                method: 'POST',
                body: JSON.stringify({ assetUrl: asset.url, assetId: asset.id })
            });

            if (data && (data.success || data.id)) {
                // Determine updates based on the ASSET type, not the current scene type
                const isVideo = asset.type === 'VIDEO';
                const isImage = asset.type === 'IMAGE';
                const isAudio = asset.type === 'AUDIO';

                const updates: Partial<Scene> = {};

                if (isVideo) {
                    updates.videoUrl = asset.url;
                    updates.videoStatus = 'completed';
                    updates.mediaType = 'video';

                    // Force immediate local update
                    setMediaData(prev => ({
                        ...prev,
                        videoUrl: asset.url
                    }));
                    setOptimisticStatus(prev => ({ ...prev, video: 'completed' }));
                    setShowVideo(true);
                } else if (isImage) {
                    updates.imageUrl = asset.url;
                    updates.imageStatus = 'completed';
                    updates.mediaType = 'image';

                    // Force immediate local update
                    setMediaData(prev => ({
                        ...prev,
                        imageUrl: asset.url
                    }));
                    setOptimisticStatus(prev => ({ ...prev, image: 'completed' }));
                    setShowVideo(false);
                } else if (isAudio) {
                    updates.audioUrl = asset.url;
                    updates.audioStatus = 'completed';
                    setMediaData(prev => ({ ...prev, audioUrl: asset.url }));
                    setOptimisticStatus(prev => ({ ...prev, audio: 'completed' }));
                }

                onUpdateScene(sceneIndex, updates);
            }
        } catch (error) {
            console.error('Failed to apply asset:', error);
            throw error;
        }
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
            <div ref={targetRef} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden flex flex-col hover:border-slate-600 transition-colors h-full shadow-lg">
                <div
                    className={`aspect-[9/16] bg-slate-900 relative group border-b border-slate-700/50 ${isDraggingOver ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900' : ''
                        }`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    {/* Drag overlay */}
                    {isDraggingOver && (
                        <div className="absolute inset-0 bg-indigo-600/20 backdrop-blur-sm z-50 flex items-center justify-center border-2 border-dashed border-indigo-400">
                            <div className="bg-slate-900/90 px-6 py-4 rounded-lg border border-indigo-500 shadow-xl">
                                <p className="text-indigo-300 font-medium text-sm flex items-center gap-2">
                                    <ImageIcon className="w-5 h-5" />
                                    {t('scene.drop_file', 'Solte a imagem ou vídeo aqui')}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Upload progress overlay */}
                    {isUploading && (
                        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm z-40 flex flex-col items-center justify-center">
                            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-3" />
                            <p className="text-indigo-300 font-medium text-sm mb-2">
                                {t('scene.uploading', 'Fazendo upload...')}
                            </p>
                            <div className="w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {showVideo && hasVideo ? (
                        <SafeVideo
                            src={mediaData.videoUrl || scene.videoUrl || ''}
                            poster={mediaData.imageUrl || scene.imageUrl || undefined}
                            className="w-full h-full object-cover"
                            autoPlay
                            loop
                            muted
                            playsInline
                            style={{ objectPosition: `${scene.videoCropConfig?.x ?? 50}% center` }}
                        />
                    ) : showVideo && isVideoLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-indigo-400 bg-slate-900/80 backdrop-blur-sm">
                            <div className="w-16 h-16 bg-slate-800 rounded-lg animate-pulse mb-3 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                            </div>
                            <span className="text-xs font-medium animate-pulse text-indigo-300">{t('scene.generating_video')}</span>
                        </div>
                    ) : showVideo ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-900/80">
                            <Video className="w-8 h-8 mb-2 opacity-50" />
                            <span className="text-xs">{t('scene.video_missing', 'Video unavailable')}</span>
                            <button
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    // Clear local cache
                                    setMediaData(prev => ({ ...prev, videoUrl: null }));
                                    // Force refetch from server
                                    if (scene.id) {
                                        setIsLoadingMedia(true);
                                        const data = await getSceneMedia(scene.id);
                                        if (data) {
                                            setMediaData(prev => ({
                                                ...prev,
                                                videoUrl: data.video_base64
                                            }));
                                        }
                                        setIsLoadingMedia(false);
                                    }
                                }}
                                className="mt-2 px-3 py-1 text-[10px] text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors"
                            >
                                Retry Load
                            </button>
                        </div>
                    ) : hasImage ? (
                        <SafeImage
                            src={mediaData.imageUrl || scene.imageUrl || ''}
                            alt={`Scene ${scene.sceneNumber}`}
                            className="w-full h-full object-cover"
                        />
                    ) : isLoadingMedia ? (
                        <div className="absolute inset-0 bg-slate-800 flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite] z-0" />
                            <ImageIcon className="w-16 h-16 text-slate-700 z-10 opacity-50" />
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin absolute z-20" />
                        </div>
                    ) : isImageLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-indigo-400 bg-slate-900/80 backdrop-blur-sm"><Loader2 className="w-8 h-8 animate-spin mb-2" /><span className="text-xs font-medium animate-pulse">{t('scene.generating_image')}</span></div>
                    ) : currentImageStatus === 'error' || currentVideoStatus === 'error' ? (
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
                                <Video className="w-3 h-3" /> {scene.videoModel === 'veo3' ? 'VEO 3' : scene.videoModel === 'veo2' ? 'VEO 2' : 'VEO'}
                            </div>
                        )}
                    </div>

                    {/* Bottom Right: Controls & Duration */}
                    <div className="absolute bottom-2 right-2 flex gap-2 items-center z-10">
                        {/* Character Picker Trigger */}
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsPickerOpen(!isPickerOpen); }}
                                className={`bg-black/60 hover:bg-indigo-600 backdrop-blur p-1.5 rounded-md text-white transition-all border border-white/10 shadow-sm ${isPickerOpen ? 'bg-indigo-600 border-indigo-500 ring-2 ring-indigo-400/50' : 'cursor-pointer hover:scale-105'}`}
                                title={t('script.select_character')}
                            >
                                <UserIcon className="w-3.5 h-3.5" />
                            </button>
                            {/* Picker Popover - Positioned relative to this wrapper */}
                            <div className="absolute right-0 bottom-full mb-2">
                                <SceneCharacterPicker
                                    isOpen={isPickerOpen}
                                    onClose={() => setIsPickerOpen(false)}
                                    availableCharacters={projectCharacters || []}
                                    selectedCharacterIds={selectedCharIds}
                                    onToggleCharacter={handleToggleCharacter}
                                />
                            </div>
                        </div>

                        <div className="bg-black/60 backdrop-blur px-2 py-1 rounded-md text-xs font-mono text-white flex items-center pointer-events-none border border-white/10 shadow-sm mr-1">
                            <Clock className="w-3 h-3 mr-1.5 text-slate-300" /> {Math.round(Number(scene.durationSeconds || 0))}s
                        </div>

                        <button
                            id={sceneIndex === 0 ? 'scene-0-regen-image' : undefined}
                            onClick={(e) => { e.stopPropagation(); handleRegenClick('image'); }}
                            className={`bg-black/60 hover:bg-indigo-600 backdrop-blur p-1.5 rounded-md text-white transition-all border border-white/10 shadow-sm ${isImageLoading || localLoading.image ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}`}
                            disabled={isImageLoading || localLoading.image}
                            title={t('scene.regenerate_image')}
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isImageLoading || localLoading.image ? 'animate-spin' : ''}`} />
                        </button>

                        {onRegenerateVideo && currentImageStatus === 'completed' && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleRegenClick('video'); }}
                                className={`bg-black/60 hover:bg-purple-600 backdrop-blur p-1.5 rounded-md text-white transition-all border border-white/10 shadow-sm ${isVideoLoading || localLoading.video ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}`}
                                disabled={isVideoLoading || localLoading.video}
                                title={t('scene.animate_veo')}
                            >
                                {isVideoLoading || localLoading.video ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                            </button>
                        )}

                        {/* Video Framing Controls */}
                        {showVideo && hasVideo && (onUpdateScene && sceneIndex !== undefined) && (
                            <div className="flex items-center gap-1 bg-black/60 backdrop-blur rounded-md p-0.5 border border-white/10 shadow-sm mr-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const currentX = scene.videoCropConfig?.x ?? 50;
                                        const newX = Math.max(0, currentX - 10);
                                        onUpdateScene(sceneIndex, { videoCropConfig: { ...scene.videoCropConfig, x: newX } });
                                    }}
                                    className="p-1 hover:text-indigo-400 text-white/80 transition-colors"
                                    title="Move Left"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                                </button>
                                <span className="text-[10px] font-mono text-white/50 w-6 text-center select-none">
                                    {scene.videoCropConfig?.x ?? 50}%
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const currentX = scene.videoCropConfig?.x ?? 50;
                                        const newX = Math.min(100, currentX + 10);
                                        onUpdateScene(sceneIndex, { videoCropConfig: { ...scene.videoCropConfig, x: newX } });
                                    }}
                                    className="p-1 hover:text-indigo-400 text-white/80 transition-colors"
                                    title="Move Right"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                                </button>
                            </div>
                        )}

                        {/* Asset Library Button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsAssetLibraryOpen(true); }}
                            className="bg-black/60 hover:bg-emerald-600 backdrop-blur p-1.5 rounded-md text-white transition-all border border-white/10 shadow-sm cursor-pointer hover:scale-105"
                            title={t('asset_library.open', 'Abrir biblioteca de similares')}
                        >
                            <Library className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div >

                {/* CONTENT AREA */}
                < div className="p-4 flex-1 flex flex-col gap-4" >
                    <div className="flex-1 min-h-0 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                                    <Mic className="w-3 h-3" /> {t('scene.narration')}
                                </h4>
                                <button
                                    id={sceneIndex === 0 ? 'scene-0-edit-narration' : undefined}
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
                                        id={sceneIndex === 0 ? 'scene-0-regen-audio' : undefined}
                                        onClick={() => handleRegenClick('audio')}
                                        disabled={isAudioLoading || isEditing || localLoading.audio}
                                        className={`p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ${isAudioLoading || isEditing || localLoading.audio ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        title={t('scene.regenerate_audio')}
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${isAudioLoading || localLoading.audio ? 'animate-spin' : ''}`} />
                                    </button>
                                )}
                                <AudioPlayerButton audioUrl={mediaData.audioUrl || scene.audioUrl} status={currentAudioStatus} />
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

                        {/* Selected Characters Footer */}
                        {scene.characters && scene.characters.length > 0 && (
                            <div className="mb-4 flex gap-2 items-center">
                                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5 mr-1">
                                    <UserIcon className="w-3 h-3" />
                                </div>
                                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
                                    {scene.characters.map(c => (
                                        <div key={c.id} className="relative group/char cursor-pointer" title={c.name}>
                                            <div className="w-6 h-6 rounded-full border border-slate-600 overflow-hidden">
                                                <img src={c.imageUrl || c.images[0]} className="w-full h-full object-cover" />
                                            </div>
                                            {/* Mini Remove Button on Hover */}
                                            <button
                                                onClick={() => handleToggleCharacter(c.id)}
                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3 h-3 flex items-center justify-center opacity-0 group-hover/char:opacity-100 transition-opacity"
                                            >
                                                <div className="w-1.5 h-0.5 bg-white rounded-full" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-2">
                            <button
                                id={sceneIndex === 0 ? 'scene-0-toggle-prompt' : undefined}
                                onClick={() => setIsPromptOpen(!isPromptOpen)} className="flex items-center text-left text-[10px] uppercase tracking-wider text-slate-500 font-bold hover:text-indigo-400 transition-colors">
                                <span>{t('scene.visual_prompt')}</span>{isPromptOpen ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                            </button>
                            <button
                                id={sceneIndex === 0 ? 'scene-0-edit-prompt' : undefined}
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
                </div >
            </div >
            <AssetLibraryModal
                isOpen={isAssetLibraryOpen}
                onClose={() => setIsAssetLibraryOpen(false)}
                sceneDescription={scene.visualDescription}
                assetType={scene.mediaType?.toUpperCase() as any || 'VIDEO'}
                onSelectAsset={handleSelectLibraryAsset}
            />
        </>
    );
};

export default SceneCard;
