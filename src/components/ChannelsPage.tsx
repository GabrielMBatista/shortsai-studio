import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Youtube, RefreshCw, CheckCircle, Clock, AlertTriangle, ExternalLink } from 'lucide-react';

interface Channel {
    id: string;
    name: string;
    provider: string;
    lastSync: string;
    status: 'active' | 'inactive';
}

interface TransferJob {
    id: string;
    driveFileName: string;
    status: 'QUEUED' | 'PROCESSING' | 'WAITING_QUOTA' | 'COMPLETED' | 'FAILED';
    progress: number;
    youtubeVideoId: string | null;
    createdAt: string;
    completedAt?: string;
    lastError?: string;
}

const ChannelsPage: React.FC = () => {
    const { t } = useTranslation();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [jobs, setJobs] = useState<TransferJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL || '/api';

    const fetchData = async () => {
        try {
            const [channelsRes, jobsRes] = await Promise.all([
                fetch(`${apiUrl}/channels`),
                fetch(`${apiUrl}/channels/jobs`)
            ]);

            if (channelsRes.ok) setChannels(await channelsRes.json());
            if (jobsRes.ok) setJobs(await jobsRes.json());
        } catch (error) {
            console.error("Failed to fetch channel data", error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Poll for job updates every 10 seconds
        const interval = setInterval(() => {
            fetch(`${apiUrl}/channels/jobs`)
                .then(res => res.ok ? res.json() : [])
                .then(data => setJobs(data))
                .catch(e => console.error(e));
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleConnect = () => {
        // Redirect to Google Sign In with forced consent to ensure we get refresh token
        // and necessary scopes.
        window.location.href = `${apiUrl}/auth/signin/google?callbackUrl=${window.location.origin}`;
    };

    const stats = {
        connected: channels.length,
        activeSyncs: jobs.filter(j => ['processing', 'queued'].includes(j.status.toLowerCase())).length,
        completedToday: jobs.filter(j => j.status === 'COMPLETED' && new Date(j.createdAt).toDateString() === new Date().toDateString()).length
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-500/10 text-green-400';
            case 'PROCESSING': return 'bg-blue-500/10 text-blue-400';
            case 'FAILED': return 'bg-red-500/10 text-red-400';
            case 'WAITING_QUOTA': return 'bg-yellow-500/10 text-yellow-400';
            default: return 'bg-slate-700 text-slate-400';
        }
    };

    return (
        <div className="flex-1 bg-[#0f172a] p-4 md:p-8 min-h-screen animate-fade-in">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">{t('channels.title', 'Channel Manager')}</h1>
                        <p className="text-slate-400">{t('channels.subtitle', 'Automate your uploads from Drive to YouTube')}</p>
                    </div>
                    <button
                        onClick={handleConnect}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-red-600/20"
                    >
                        <Plus className="w-5 h-5" />
                        {t('channels.connect_new', 'Connect Channel')}
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-500/20 rounded-lg">
                                <Youtube className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">Connected Channels</p>
                                <p className="text-2xl font-bold text-white">{stats.connected}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/20 rounded-lg">
                                <RefreshCw className={`w-6 h-6 text-blue-400 ${stats.activeSyncs > 0 ? 'animate-spin' : ''}`} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">Active Syncs</p>
                                <p className="text-2xl font-bold text-white">{stats.activeSyncs}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-500/20 rounded-lg">
                                <CheckCircle className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">Uploads Today</p>
                                <p className="text-2xl font-bold text-white">{stats.completedToday}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity Table */}
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden shadow-xl">
                    <div className="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            Activity Log
                            {isRefreshing && <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />}
                        </h3>
                        <button onClick={() => { setIsRefreshing(true); fetchData(); }} className="text-sm text-slate-400 hover:text-white transition-colors">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="p-8 text-center text-slate-500">Loading activity...</div>
                    ) : jobs.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
                                <Clock className="w-8 h-8 text-slate-600" />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-1">No activity yet</h3>
                            <p className="text-slate-400">Connect a channel and upload videos to Drive to start.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-400">
                                <thead className="bg-slate-800/80 text-slate-300 uppercase text-xs font-semibold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">File Name</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Progress</th>
                                        <th className="px-6 py-4">YouTube</th>
                                        <th className="px-6 py-4">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {jobs.map((job) => (
                                        <tr key={job.id} className="hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-white max-w-[200px] truncate" title={job.driveFileName}>
                                                {job.driveFileName}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border border-white/5 ${getStatusColor(job.status)}`}>
                                                    {job.status === 'COMPLETED' && <CheckCircle className="w-3 h-3" />}
                                                    {job.status === 'FAILED' && <AlertTriangle className="w-3 h-3" />}
                                                    {(job.status === 'PROCESSING' || job.status === 'QUEUED') && <RefreshCw className="w-3 h-3 animate-spin" />}
                                                    {job.status}
                                                </span>
                                                {job.lastError && (
                                                    <div className="text-xs text-red-400 mt-1 max-w-[200px] truncate" title={job.lastError}>
                                                        {job.lastError}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 w-48">
                                                <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className={`h-1.5 rounded-full transition-all duration-500 ${job.status === 'FAILED' ? 'bg-red-500' : 'bg-indigo-500'}`}
                                                        style={{ width: `${job.progress}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs text-slate-500 mt-1 block text-right">{job.progress}%</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {job.youtubeVideoId ? (
                                                    <a
                                                        href={`https://youtu.be/${job.youtubeVideoId}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:underline"
                                                    >
                                                        <Youtube className="w-4 h-4" />
                                                        View
                                                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-600">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 flex items-center gap-2 whitespace-nowrap">
                                                <Clock className="w-3 h-3" />
                                                {new Date(job.createdAt).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChannelsPage;
