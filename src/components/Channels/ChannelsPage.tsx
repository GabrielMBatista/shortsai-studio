import React, { useState, useEffect } from 'react';
import ChannelsList from './ChannelsList';
import ImportChannelModal from './ImportChannelModal';
import { AlertTriangle } from 'lucide-react';

const ChannelsPage: React.FC = () => {
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Auto-dismiss error after 5s
    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => setErrorMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage]);

    // Auto-open import modal if returned from auth with action=import
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('action') === 'import') {
            setIsImportModalOpen(true);
            const url = new URL(window.location.href);
            url.searchParams.delete('action');
            window.history.replaceState({}, '', url);
        }
    }, []);

    const handleConnect = async () => {
        try {
            const csrfRes = await fetch(`${apiUrl}/auth/csrf`);
            const csrfData = await csrfRes.json();
            const csrfToken = csrfData.csrfToken;

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = `${apiUrl}/auth/signin/google-channels`;

            // Força seleção de conta (ignora cache do Google)
            const promptInput = document.createElement('input');
            promptInput.type = 'hidden';
            promptInput.name = 'prompt';
            promptInput.value = 'select_account consent';
            form.appendChild(promptInput);

            const callbackInput = document.createElement('input');
            callbackInput.type = 'hidden';
            callbackInput.name = 'callbackUrl';
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
            setErrorMessage('Failed to connect to Google. Please try again.');
        }
    };

    const handleImportSuccess = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <>
            {/* Error Toast */}
            {errorMessage && (
                <div className="fixed top-4 right-4 z-50 max-w-md animate-fade-in-up">
                    <div className="bg-red-900/90 backdrop-blur-sm border border-red-500/50 rounded-xl p-4 shadow-2xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-white font-semibold text-sm mb-1">Connection Error</h3>
                            <p className="text-red-200 text-sm">{errorMessage}</p>
                        </div>
                        <button
                            onClick={() => setErrorMessage(null)}
                            className="text-red-400 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* ChannelsList has its own complete layout with header */}
            <ChannelsList
                key={refreshKey}
                onConnect={handleConnect}
                onImport={() => setIsImportModalOpen(true)}
            />

            {/* Import Modal */}
            <ImportChannelModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportSuccess={handleImportSuccess}
            />
        </>
    );
};

export default ChannelsPage;

