import React, { useState, useEffect } from 'react';
import ChannelsList from './ChannelsList';
import ImportChannelModal from './ImportChannelModal';

const ChannelsPage: React.FC = () => {
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

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
            alert('Failed to connect to Google. Please try again.');
        }
    };

    const handleImportSuccess = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <>
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

