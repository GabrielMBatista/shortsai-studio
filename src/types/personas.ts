export type PersonaType = 'SYSTEM' | 'CUSTOM';
export type PersonaVisibility = 'PUBLIC' | 'PRIVATE';
export type PlanLevel = 'free' | 'pro' | 'enterprise';

export interface Persona {
    id: string;
    type: PersonaType;
    visibility: PersonaVisibility;
    requiredPlan: PlanLevel;
    name: string;
    description?: string;
    category?: string;
    isOfficial: boolean;
    isFeatured: boolean;
    isPremium: boolean;
    systemInstruction: string;
    temperature: number;
    topP: number;
    topK: number;
    maxOutputTokens: number;
    tags: string[];
    usageCount: number;
    lastUsedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Channel {
    id: string;
    userId: string;
    youtubeChannelId: string;
    name: string;
    description?: string;
    thumbnail?: string;
    personaId?: string;
    isActive: boolean;
    subscriberCount?: number;
    videoCount?: number;
    viewCount?: bigint;
    lastSyncedAt?: string;
    persona?: PersonaBasic;
    account?: {
        id: string;
        provider: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface PersonaBasic {
    id: string;
    name: string;
    type: PersonaType;
    category?: string;
}

export interface DiscoveredChannel {
    youtubeChannelId: string;
    name: string;
    email?: string;
    thumbnail?: string;
    statistics: {
        subscriberCount: number;
        videoCount: number;
        viewCount: string;
    };
}

export interface CreatePersonaData {
    name: string;
    description?: string;
    category?: string;
    systemInstruction: string;
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    tags?: string[];
}
