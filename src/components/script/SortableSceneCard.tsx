import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SceneCard from './SceneCard';
import { Scene, TTSProvider, ApiKeys } from '../../types';

interface SortableSceneCardProps {
    id: string;
    scene: Scene;
    sceneIndex: number;
    onRegenerateImage: (index: number, force: boolean) => void;
    onRegenerateAudio?: (index: number, force: boolean) => void;
    onRegenerateVideo?: (index: number, force: boolean) => void;
    onUpdateScene: (index: number, updates: Partial<Scene>) => void;
    onRemoveScene: (index: number) => void;
    projectId: string;
    userId: string;
    apiKeys: ApiKeys;
    videoModel: string;
    projectCharacters: import('../../types').SavedCharacter[];
}

export const SortableSceneCard: React.FC<SortableSceneCardProps> = (props) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative' as const,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <SceneCard
                {...props}
                dragHandleProps={{ ...attributes, ...listeners }}
            />
        </div>
    );
};
