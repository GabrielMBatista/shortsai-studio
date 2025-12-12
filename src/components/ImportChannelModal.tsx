import React, { useState, useEffect } from 'react';
import { X, Youtube, Search, Download, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Account {
    id: string;
    provider: string;
}

interface DiscoveredChannel {
    youtubeChannelId: string;
    name: string;
    description: string;
    thumbnail: string;
    email: string;
    statistics: {
        subscriberCount: number;
        videoCount: number;
        viewCount: string;
    };
}

interface ImportChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportSuccess: () => void;
}

export default function ImportChannelModal({ isOpen, onClose, onImportSuccess }: ImportChannelModalProps) {
    const { t } = useTranslation();
    const [step, setStep] = useState<'accounts' | 'channels'>('accounts');
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [discoveredChannels, setDiscoveredChannels] = useState<DiscoveredChannel[]>([]);

    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [loadingDiscovery, setLoadingDiscovery] = useState(false);
    const [importingId, setImportingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const apiUrl = import.meta.env.VITE_API_URL || '/api';

    useEffect(() => {
        if (isOpen) {
            fetchAccounts();
            setStep('accounts');
            setDiscoveredChannels([]);
            setSelectedAccountId(null);
            setError(null);
        }
    }, [isOpen]);

    const fetchAccounts = async () => {
        try {
            setLoadingAccounts(true);
            const res = await fetch(`${apiUrl}/accounts`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch accounts');
            const data = await res.json();
            setAccounts(data.accounts || []);
        } catch (err) {
            console.error(err);
            setError('Could not load connected accounts.');
        } finally {
            setLoadingAccounts(false);
        }
    };

    const handleDiscover = async (accountId: string) => {
        try {
            setSelectedAccountId(accountId);
            setLoadingDiscovery(true);
            setError(null);

            const res = await fetch(`${apiUrl}/channels/discover`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId }),
                credentials: 'include'
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to discover channels');
            }

            const data = await res.json();
            setDiscoveredChannels(data.channels || []);
            setStep('channels');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to discover channels');
            setSelectedAccountId(null);
        } finally {
            setLoadingDiscovery(false);
        }
    };

    const handleImport = async (channel: DiscoveredChannel) => {
        if (!selectedAccountId) return;

        try {
            setImportingId(channel.youtubeChannelId);
            const res = await fetch(`${apiUrl}/channels/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountId: selectedAccountId,
                    youtubeChannelId: channel.youtubeChannelId
                }),
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Failed to import channel');

            onImportSuccess();
            // Optional: Close modal or show success state
            onClose();
        } catch (err) {
            console.error(err);
            alert('Failed to import channel');
        } finally {
            setImportingId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#0f172a] border border-slate-700 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Youtube className="w-5 h-5 text-red-500" />
                            Import YouTube Channel
                        </h2>
                        <p className="text-sm text-slate-400">
                            {step === 'accounts' ? 'Select a connected Google Account' : 'Choose a channel to import'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {error && (
                        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-200">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    {step === 'accounts' ? (
                        <div className="space-y-4">
                            {loadingAccounts ? (
                                <div className="text-center py-12 text-slate-500">
                                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                                    Loading accounts...
                                </div>
                            ) : accounts.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    No connected accounts found. Please connect a Google Account first.
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {accounts.map(account => (
                                        <button
                                            key={account.id}
                                            onClick={() => handleDiscover(account.id)}
                                            disabled={loadingDiscovery}
                                            className="flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 rounded-xl transition-all group disabled:opacity-50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                                    <Youtube className="w-5 h-5 text-slate-400" />
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-medium text-white">Google Account</div>
                                                    <div className="text-xs text-slate-500 font-mono">{account.id.substring(0, 8)}...</div>
                                                </div>
                                            </div>
                                            {loadingDiscovery && selectedAccountId === account.id ? (
                                                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                                            ) : (
                                                <Search className="w-5 h-5 text-slate-600 group-hover:text-indigo-400" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <button
                                onClick={() => setStep('accounts')}
                                className="text-xs text-indigo-400 hover:text-indigo-300 mb-2 flex items-center gap-1"
                            >
                                ← Back to accounts
                            </button>

                            <div className="grid gap-4">
                                {discoveredChannels.map(channel => (
                                    <div key={channel.youtubeChannelId} className="flex items-center gap-4 p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                                        <img src={channel.thumbnail} alt={channel.name} className="w-12 h-12 rounded-full" />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-white font-medium truncate">{channel.name}</h3>
                                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                                <span>{channel.email}</span>
                                                <span>•</span>
                                                <span>{channel.statistics.subscriberCount} subs</span>
                                                <span>•</span>
                                                <span>{channel.statistics.videoCount} videos</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleImport(channel)}
                                            disabled={!!importingId}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                        >
                                            {importingId === channel.youtubeChannelId ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Download className="w-4 h-4" />
                                            )}
                                            Import
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
