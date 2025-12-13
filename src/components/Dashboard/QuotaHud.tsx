import React, { useEffect, useState } from 'react';
import { subscribeToQuota } from '../services/quotaService';
import { Activity, Minimize2, Maximize2, Zap, Image as ImageIcon, Video, Mic } from 'lucide-react';
import { VideoProject } from '../types';

interface QuotaHudProps {
    project?: VideoProject | null;
}

const QuotaHud: React.FC<QuotaHudProps> = ({ project }) => {
    const [stats, setStats] = useState({
        image: 0,
        text: 0,
        audio: 0
    });
    const [isMinimized, setIsMinimized] = useState(false);

    const [quota, setQuota] = useState<{
        limits: { maxVideos: number, maxTTSMinutes: number, maxImages: number, maxDailyVideos: number },
        used: { currentVideos: number, currentTTSMinutes: number, currentImages: number, currentDailyVideos: number }
    } | null>(null);

    const [estimate, setEstimate] = useState<{
        estimatedImages: number,
        estimatedAudioMinutes: number,
        estimatedVideo: number
    } | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToQuota((data) => {
            setStats(prev => ({
                ...prev,
                [data.type]: data.rpm
            }));
        });

        // Fetch Quota
        const fetchQuota = async () => {
            try {
                const user = localStorage.getItem('shortsai_user_id');
                if (!user) return;
                const apiUrl = import.meta.env.VITE_API_URL || '/api';
                const res = await fetch(`${apiUrl}/users/quota?user_id=${user}`);
                if (res.ok) {
                    const data = await res.json();
                    setQuota(data);
                }
            } catch (e) { console.error(e); }
        };

        fetchQuota();
        const interval = setInterval(fetchQuota, 30000); // Poll every 30s

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    // Fetch Estimate when project changes
    useEffect(() => {
        const fetchEstimate = async () => {
            if (!project) {
                setEstimate(null);
                return;
            }
            try {
                const apiUrl = import.meta.env.VITE_API_URL || '/api';
                const res = await fetch(`${apiUrl}/workflow/estimate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId: project.id })
                });
                if (res.ok) {
                    const data = await res.json();
                    setEstimate(data);
                }
            } catch (e) { console.error(e); }
        };

        if (project) {
            fetchEstimate();
            // Poll estimate occasionally or when project updates?
            // For now, just on mount/project change.
        }
    }, [project]); // We might want to trigger this on scene updates too, but project object updates should trigger it.

    const getPercentage = (val: number, limit: number) => Math.min((val / limit) * 100, 100);
    const getColor = (pct: number) => pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-yellow-500' : 'bg-emerald-500';

    if (!quota) return null;

    return (
        <div className={`fixed bottom-4 left-4 z-50 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl text-xs font-sans text-slate-300 shadow-2xl transition-all duration-300 pointer-events-auto max-w-[calc(100vw-2rem)] ${isMinimized ? 'w-auto p-2' : 'w-64 p-4'}`}>
            <div
                className="flex items-center justify-between gap-2 cursor-pointer group mb-2"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand HUD" : "Minimize HUD"}
            >
                <div className="flex items-center gap-2 text-slate-100 font-bold">
                    <Activity className={`w-4 h-4 ${!isMinimized ? '' : 'text-indigo-400'}`} />
                    {!isMinimized && <span>Usage & Quota</span>}
                </div>
                <button className="text-slate-500 hover:text-white transition-colors">
                    {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                </button>
            </div>

            {!isMinimized && (
                <div className="space-y-4">
                    {/* Monthly Limits */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Monthly Limits</h4>

                        {/* Videos */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="flex items-center gap-1.5"><Video className="w-3 h-3 text-indigo-400" /> Videos</span>
                                <span className="font-mono text-indigo-300">{quota.used.currentVideos}/{quota.limits.maxVideos}</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-500 ${getColor(getPercentage(quota.used.currentVideos, quota.limits.maxVideos))}`} style={{ width: `${getPercentage(quota.used.currentVideos, quota.limits.maxVideos)}%` }} />
                            </div>
                        </div>

                        {/* TTS */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="flex items-center gap-1.5"><Mic className="w-3 h-3 text-pink-400" /> Audio (Min)</span>
                                <span className="font-mono text-pink-300">{quota.used.currentTTSMinutes.toFixed(1)}/{quota.limits.maxTTSMinutes}</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-500 ${getColor(getPercentage(quota.used.currentTTSMinutes, quota.limits.maxTTSMinutes))}`} style={{ width: `${getPercentage(quota.used.currentTTSMinutes, quota.limits.maxTTSMinutes)}%` }} />
                            </div>
                        </div>

                        {/* Images */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="flex items-center gap-1.5"><ImageIcon className="w-3 h-3 text-emerald-400" /> Images</span>
                                <span className="font-mono text-emerald-300">{quota.used.currentImages}/{quota.limits.maxImages}</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-500 ${getColor(getPercentage(quota.used.currentImages, quota.limits.maxImages))}`} style={{ width: `${getPercentage(quota.used.currentImages, quota.limits.maxImages)}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* Project Estimate */}
                    {estimate && (
                        <div className="pt-3 border-t border-slate-700/50 space-y-2">
                            <h4 className="text-[10px] uppercase tracking-wider font-bold text-slate-500 flex items-center gap-2">
                                <Zap className="w-3 h-3 text-yellow-500" /> Est. Cost (This Project)
                            </h4>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-slate-800/50 rounded p-1.5">
                                    <div className="text-[10px] text-slate-500">Images</div>
                                    <div className="font-mono font-bold text-emerald-400">+{estimate.estimatedImages}</div>
                                </div>
                                <div className="bg-slate-800/50 rounded p-1.5">
                                    <div className="text-[10px] text-slate-500">Audio</div>
                                    <div className="font-mono font-bold text-pink-400">+{estimate.estimatedAudioMinutes}m</div>
                                </div>
                                <div className="bg-slate-800/50 rounded p-1.5">
                                    <div className="text-[10px] text-slate-500">Video</div>
                                    <div className="font-mono font-bold text-indigo-400">+{estimate.estimatedVideo}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default QuotaHud;