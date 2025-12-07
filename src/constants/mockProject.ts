import { VideoProject } from '../types';

export const MOCK_PROJECT_COMMON: VideoProject = {
    id: '__mock__-tour-project',
    userId: 'mock-user',
    createdAt: Date.now(),
    topic: 'Cyberpunk Detective in Neo-Tokyo',
    style: 'Cyberpunk Neon',
    voiceName: 'Fenrir',
    ttsProvider: 'gemini',
    language: 'English',
    status: 'draft',
    scenes: [
        {
            id: 'mock-scene-1',
            sceneNumber: 1,
            visualDescription: 'A rain-slicked neon street in Neo-Tokyo. Holographic ads reflect in puddles.',
            narration: 'The rain never stops in this city. It just washes away the evidence.',
            durationSeconds: 3,
            imageStatus: 'completed',
            audioStatus: 'completed',
            sfxStatus: 'pending',
            videoStatus: 'completed', // Video is ready
            imageUrl: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=2070&auto=format&fit=crop',
            videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', // Valid sample video
            mediaType: 'video', // Start showing video to demonstrate toggle
        }
    ],
    generatedTitle: 'Neon Shadows',
    generatedDescription: 'A short noir story set in a cyberpunk future.',
    referenceCharacters: []
};

// Both exports point to the same unified mock
export const MOCK_PROJECT_TOUR = MOCK_PROJECT_COMMON;
export const MOCK_PROJECT_PREVIEW = MOCK_PROJECT_COMMON;
