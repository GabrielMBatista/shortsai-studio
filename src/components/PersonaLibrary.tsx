import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Sparkles, MessageCircle, Crown, Star } from 'lucide-react';
import { Persona } from '../types/personas';
import { usePersonas } from '../hooks/usePersonas';
import PersonaSidebarList from './PersonaSidebarList';
import CreatePersonaModal from './CreatePersonaModal';
import PersonaChatModal from './PersonaChatModal';
import { Card, Button, Badge } from './ui';

interface PersonaLibraryProps {
    onBack: () => void;
}

const PersonaLibrary: React.FC<PersonaLibraryProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { personas, loading, error, createPersona } = usePersonas();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [chatPersona, setChatPersona] = useState<Persona | null>(null);

    const selectedPersona = selectedPersonaId ? personas.find(p => p.id === selectedPersonaId) : null;
    const displayPersonas = selectedPersonaId ? (selectedPersona ? [selectedPersona] : []) : personas;

    const getInitials = (name: string) => {
        return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    };

    const getAvatarColor = (name: string) => {
        const colors = [
            'from-indigo-500 to-purple-500',
            'from-emerald-500 to-cyan-500',
            'from-amber-500 to-orange-500',
            'from-pink-500 to-rose-500',
            'from-blue-500 to-indigo-500',
        ];
        const index = name.length % colors.length;
        return colors[index];
    };

    return (
        <div className="flex min-h-[calc(100vh-64px)]">
            {/* Sidebar */}
            <PersonaSidebarList
                className="fixed md:sticky md:top-16 z-50 h-[calc(100vh-64px)]"
                personas={personas}
                selectedPersonaId={selectedPersonaId}
                onSelectPersona={setSelectedPersonaId}
                onCreatePersona={() => setIsCreateModalOpen(true)}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                isLoading={loading}
            />

            {/* Main Content */}
            <div className="flex-1 bg-[#0f172a] relative flex flex-col overflow-y-auto">
                <div className="w-full px-6 py-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8 animate-fade-in-up">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<ArrowLeft className="w-5 h-5" />}
                                onClick={onBack}
                            >
                                Back
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                    <Sparkles className="w-7 h-7 text-indigo-400" />
                                    {t('personas.library_title', 'Persona Library')}
                                </h1>
                                <p className="text-slate-400 mt-1">
                                    {selectedPersona
                                        ? `Viewing: ${selectedPersona.name}`
                                        : t('personas.library_subtitle', 'Explore and manage AI scriptwriting personas.')
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="text-sm text-slate-500">
                            {displayPersonas.length} persona{displayPersonas.length !== 1 ? 's' : ''}
                        </div>
                    </div>

                    {/* Content */}
                    {error ? (
                        <Card variant="glass" padding="lg" className="bg-red-900/20 border-red-500/50 text-center">
                            <p className="text-red-400 font-medium">{error}</p>
                        </Card>
                    ) : loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Card key={i} variant="glass" padding="lg" className="animate-pulse h-72">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-16 h-16 rounded-xl bg-slate-700"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                                            <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                    <div className="h-20 bg-slate-700 rounded mb-4"></div>
                                </Card>
                            ))}
                        </div>
                    ) : displayPersonas.length === 0 ? (
                        <Card variant="glass" padding="lg" className="text-center py-12">
                            <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400">No personas found</p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                            {displayPersonas.map(persona => (
                                <Card
                                    key={persona.id}
                                    variant="glass"
                                    padding="lg"
                                    hoverable
                                    className="group flex flex-col h-full"
                                >
                                    {/* Header with Avatar */}
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getAvatarColor(persona.name)} flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0 ring-2 ring-white/10`}>
                                            {getInitials(persona.name)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors mb-1 truncate">
                                                {persona.name}
                                            </h3>
                                            {persona.category && (
                                                <Badge variant="default" size="sm">
                                                    {persona.category}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Badges */}
                                    {(persona.isOfficial || persona.isFeatured || persona.isPremium) && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {persona.isOfficial && (
                                                <Badge variant="primary" size="sm" dot>
                                                    <Star className="w-3 h-3" /> Official
                                                </Badge>
                                            )}
                                            {persona.isFeatured && (
                                                <Badge variant="success" size="sm" dot>
                                                    <Sparkles className="w-3 h-3" /> Featured
                                                </Badge>
                                            )}
                                            {persona.isPremium && (
                                                <Badge variant="warning" size="sm" dot>
                                                    <Crown className="w-3 h-3" /> Premium
                                                </Badge>
                                            )}
                                        </div>
                                    )}

                                    {/* Description */}
                                    <div className="flex-1 mb-4">
                                        {persona.description && (
                                            <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">
                                                {persona.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Tags */}
                                    {persona.tags && persona.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {persona.tags.slice(0, 4).map(tag => (
                                                <span key={tag} className="px-2 py-1 bg-slate-900/50 text-slate-500 text-[11px] rounded-md font-mono">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Stats & Action */}
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-700/50 mt-auto">
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            <div className="flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                <span className="font-medium text-slate-400">{persona.usageCount || 0}</span> uses
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                                <span className="font-mono text-slate-400">{persona.temperature}</span> temp
                                            </div>
                                        </div>

                                        <Button
                                            variant="primary"
                                            size="sm"
                                            leftIcon={<MessageCircle className="w-4 h-4" />}
                                            onClick={(e) => { e.stopPropagation(); setChatPersona(persona); }}
                                        >
                                            Chat
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <CreatePersonaModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={async (data) => { await createPersona(data); }}
            />

            <PersonaChatModal
                isOpen={!!chatPersona}
                onClose={() => setChatPersona(null)}
                persona={chatPersona}
            />
        </div>
    );
};

export default PersonaLibrary;
