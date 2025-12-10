import { VideoProject, Scene } from '../types';

export const toApiProject = (p: VideoProject) => {
    const apiObj = {
        user_id: p.userId,
        topic: p.topic,
        style: p.style,
        voice_name: p.voiceName,
        tts_provider: p.ttsProvider,
        video_model: p.videoModel,
        audio_model: p.audioModel,
        language: p.language,
        include_music: p.includeMusic,
        bg_music_prompt: p.bgMusicPrompt,
        bg_music_url: p.bgMusicUrl,
        bg_music_status: p.bgMusicStatus,
        generated_title: p.generatedTitle,
        generated_description: p.generatedDescription,
        generated_shorts_hashtags: p.generatedShortsHashtags,
        generated_tiktok_text: p.generatedTiktokText,
        generated_tiktok_hashtags: p.generatedTiktokHashtags,
        script_metadata: p.scriptMetadata,
        reference_image_url: p.referenceImageUrl,
        duration_config: p.durationConfig,
        status: p.status,
        folder_id: p.folderId,
        characterIds: p.characterIds
    };
    return apiObj;
};

export const fromApiProject = (apiP: any): VideoProject => {
    const uniqueScenesMap = new Map<number, Scene>();

    // Helper to map DB Character to Frontend SavedCharacter
    const mapToSavedCharacter = (c: any) => ({
        id: c.id,
        userId: c.user_id,
        name: c.name,
        description: c.description,
        images: c.images || [],
        imageUrl: c.images?.[0] || '', // Legacy
        createdAt: new Date(c.created_at).getTime()
    });

    if (apiP.scenes && Array.isArray(apiP.scenes)) {
        apiP.scenes.forEach((s: any) => {
            if (!uniqueScenesMap.has(s.scene_number)) {
                uniqueScenesMap.set(s.scene_number, {
                    id: s.id || s._id,
                    sceneNumber: s.scene_number,
                    visualDescription: s.visualDescription || s.visual_description || '',
                    narration: s.narration,
                    durationSeconds: Number(s.duration_seconds) || 5,
                    imageUrl: s.image_url,
                    audioUrl: s.audio_url,
                    sfxUrl: s.sfx_url,
                    videoUrl: s.video_url,
                    // Use status from backend as-is
                    imageStatus: s.image_status,
                    audioStatus: s.audio_status,
                    sfxStatus: s.sfx_status,
                    imageAttempts: s.image_attempts || 0,
                    audioAttempts: s.audio_attempts || 0,
                    errorMessage: s.error_message,
                    videoStatus: s.video_status || 'pending',
                    mediaType: s.media_type || 'image',
                    characters: s.characters ? s.characters.map(mapToSavedCharacter) : []
                });
            }

        });
    }

    let recoveredTitle = apiP.generated_title || apiP.generatedTitle || apiP.title;
    let recoveredDesc = apiP.generated_description || apiP.generatedDescription || apiP.description;

    return {
        id: apiP.id || apiP._id,
        userId: apiP.user_id,
        createdAt: new Date(apiP.created_at || Date.now()).getTime(),
        topic: apiP.topic,
        style: apiP.style,
        voiceName: apiP.voice_name || apiP.voiceName,
        ttsProvider: (apiP.tts_provider || apiP.ttsProvider) as any,
        videoModel: apiP.video_model || apiP.videoModel,
        audioModel: apiP.audio_model || apiP.audioModel,
        language: apiP.language || 'en',
        includeMusic: apiP.include_music || apiP.includeMusic,
        bgMusicPrompt: apiP.bg_music_prompt || apiP.bgMusicPrompt,
        bgMusicUrl: apiP.bg_music_url || apiP.bgMusicUrl,
        bgMusicStatus: apiP.bg_music_status || apiP.bgMusicStatus,
        generatedTitle: recoveredTitle || apiP.topic,
        generatedDescription: recoveredDesc || '',
        generatedShortsHashtags: apiP.generated_shorts_hashtags || apiP.generatedShortsHashtags || [],
        generatedTiktokText: apiP.generated_tiktok_text || apiP.generatedTiktokText,
        generatedTiktokHashtags: apiP.generated_tiktok_hashtags || apiP.generatedTiktokHashtags || [],
        scriptMetadata: apiP.script_metadata || apiP.scriptMetadata,
        referenceImageUrl: apiP.reference_image_url || apiP.referenceImageUrl,
        scenes: Array.from(uniqueScenesMap.values()).sort((a, b) => a.sceneNumber - b.sceneNumber),
        characterIds: apiP.characterIds || apiP.character_ids || [],
        // Map ProjectCharacters (join table) to flattened array
        projectCharacters: apiP.characters
            ? apiP.characters.map(mapToSavedCharacter)
            : (apiP.ProjectCharacters
                ? apiP.ProjectCharacters.map((pc: any) => mapToSavedCharacter(pc.characters))
                : []),
        durationConfig: apiP.duration_config || apiP.durationConfig,
        status: apiP.status || 'draft',
        folderId: apiP.folder_id || apiP.folderId,
        isArchived: apiP.is_archived || apiP.isArchived || false,
        tags: apiP.tags || []
    };
};
