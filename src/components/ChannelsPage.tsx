import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Download } from 'lucide-react';
import ChannelsList from './ChannelsList';
import ImportChannelModal from './ImportChannelModal';

const ChannelsPage: React.FC = () => {
    const { t } = useTranslation();
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Key to force refresh of the list
    const [refreshKey, setRefreshKey] = useState(0);

    // Auto-open import modal if returned from auth with action=import
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('action') === 'import') {
            setIsImportModalOpen(true);
            // Clean URL but keep history state clean
            const url = new URL(window.location.href);
            url.searchParams.delete('action');
            window.history.replaceState({}, '', url);
        }
    }, []);

    const handleConnect = async () => {
        try {
            // 1. Fetch CSRF Token
            const csrfRes = await fetch(`${apiUrl}/auth/csrf`);
            const csrfData = await csrfRes.json();
            const csrfToken = csrfData.csrfToken;

            // 2. Submit Form
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = `${apiUrl}/auth/signin/google`;

            const callbackInput = document.createElement('input');
            callbackInput.type = 'hidden';
            callbackInput.name = 'callbackUrl';
            // Redirect back to this page with a query param to auto-open import modal
            callbackInput.value = window.location.origin + '/channels?action=import';
            form.appendChild(callbackInput);

            if (csrfToken) {
                const csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.name = 'csrfToken';
                csrfInput.value = csrfToken;
                form.appendChild(csrfInput);
            }

            document.body.appendChild(form);
            form.submit();
        } catch (error) {
            console.error('Failed to initialize Google Auth:', error);
            alert('Failed to connect to Google. Please try again.');
        }
    };

    const handleImportSuccess = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div className="flex-1 bg-[#0f172a] p-4 md:p-8 min-h-screen animate-fade-in relative">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">{t('channels.title', 'Channel Manager')}</h1>
                        <p className="text-slate-400">{t('channels.subtitle', 'Manage connected channels & AI personas')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors font-medium"
                        >
                            <Download className="w-5 h-5" />
                            {t('channels.import_existing', 'Import Channel')}
                        </button>
                        <button
                            onClick={handleConnect}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-red-600/20"
                        >
                            <Plus className="w-5 h-5" />
                            {t('channels.connect_new', 'Connect Channel')}
                        </button>
                    </div>
                </div>

                {/* List Component */}
                <ChannelsList key={refreshKey} />

                {/* Import Modal */}
                <ImportChannelModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onImportSuccess={handleImportSuccess}
                />
            </div>
        </div>
    );
};

export default ChannelsPage;
