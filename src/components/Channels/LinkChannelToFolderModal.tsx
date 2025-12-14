import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Link, Youtube, Unlink } from 'lucide-react';
import { Channel } from '../../types/personas';
import { Button, Card } from '../ui';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../ui/Modal';

interface LinkChannelToFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    folderName: string;
    currentChannelId?: string | null;
    channels: Channel[];
    onLink: (channelId: string | null) => Promise<void>;
}

export default function LinkChannelToFolderModal({
    isOpen,
    onClose,
    folderName,
    currentChannelId,
    channels,
    onLink
}: LinkChannelToFolderModalProps) {
    const { t } = useTranslation();
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(currentChannelId || null);
    const [isLinking, setIsLinking] = useState(false);

    const handleLink = async () => {
        setIsLinking(true);
        try {
            await onLink(selectedChannelId);
            onClose();
        } catch (error) {
            console.error('Failed to link channel:', error);
        } finally {
            setIsLinking(false);
        }
    };

    const handleUnlink = async () => {
        setIsLinking(true);
        try {
            await onLink(null);
            setSelectedChannelId(null);
            onClose();
        } catch (error) {
            console.error('Failed to unlink channel:', error);
        } finally {
            setIsLinking(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitle>
                    <div className="flex items-center gap-2">
                        <Link className="w-5 h-5" />
                        {t('link_modal.title')}
                    </div>
                </ModalTitle>
            </ModalHeader>

            <ModalBody>
                <div className="space-y-4">
                    {/* Folder Info */}
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                        <p className="text-sm text-slate-400 mb-1">{t('link_modal.linking_folder')}</p>
                        <p className="text-white font-semibold">{folderName}</p>
                    </div>

                    {/* Current Link Status */}
                    {currentChannelId && (
                        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-indigo-400 mb-1">{t('link_modal.currently_linked')}</p>
                                    <p className="text-white font-medium">
                                        {channels.find(ch => ch.id === currentChannelId)?.name || t('link_modal.unknown_channel')}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleUnlink}
                                    disabled={isLinking}
                                    isLoading={isLinking}
                                    leftIcon={<Unlink className="w-4 h-4" />}
                                >
                                    {t('link_modal.unlink')}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Channel Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">
                            {currentChannelId ? t('link_modal.change_channel') : t('link_modal.select_channel')}
                        </label>

                        <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                            {channels.length === 0 ? (
                                <p className="text-center py-8 text-slate-500 text-sm">
                                    {t('link_modal.no_channels')}
                                </p>
                            ) : (
                                channels.map(channel => (
                                    <button
                                        key={channel.id}
                                        onClick={() => setSelectedChannelId(channel.id)}
                                        className={`w-full p-4 rounded-lg border transition-all text-left ${selectedChannelId === channel.id
                                            ? 'bg-indigo-500/20 border-indigo-500 shadow-lg shadow-indigo-500/20'
                                            : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {channel.thumbnail ? (
                                                <img
                                                    src={channel.thumbnail}
                                                    alt={channel.name}
                                                    className="w-12 h-12 rounded-full border-2 border-slate-700"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                                                    <Youtube className="w-6 h-6 text-white" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-white truncate">{channel.name}</h4>
                                                {channel.description && (
                                                    <p className="text-xs text-slate-400 truncate">{channel.description}</p>
                                                )}
                                            </div>
                                            {selectedChannelId === channel.id && (
                                                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </ModalBody>

            <ModalFooter>
                <Button variant="ghost" onClick={onClose} disabled={isLinking}>
                    {t('common.cancel')}
                </Button>
                <Button
                    variant="primary"
                    onClick={handleLink}
                    disabled={!selectedChannelId || selectedChannelId === currentChannelId || isLinking}
                    isLoading={isLinking}
                    leftIcon={<Link className="w-4 h-4" />}
                >
                    {currentChannelId ? t('link_modal.update_link') : t('link_modal.create_link')}
                </Button>
            </ModalFooter>
        </Modal>
    );
}
