import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import ChannelsList from './ChannelsList';

const ChannelsPage: React.FC = () => {
    const { t } = useTranslation();
    const apiUrl = import.meta.env.VITE_API_URL || '/api';

    const handleConnect = () => {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `${apiUrl}/auth/signin/google`;
        const callbackInput = document.createElement('input');
        callbackInput.type = 'hidden';
        callbackInput.name = 'callbackUrl';
        callbackInput.value = window.location.origin;
        form.appendChild(callbackInput);
        document.body.appendChild(form);
        form.submit();
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
                    <button
                        onClick={handleConnect}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-red-600/20"
                    >
                        <Plus className="w-5 h-5" />
                        {t('channels.connect_new', 'Connect Channel')}
                    </button>
                </div>

                {/* List Component */}
                <ChannelsList />
            </div>
        </div>
    );
};

export default ChannelsPage;
