import React, { useEffect, useState } from 'react';
import { subscribeToQuota } from '../services/quotaService';
import { Activity, Minimize2, Maximize2 } from 'lucide-react';

const QuotaHud: React.FC = () => {
    const [stats, setStats] = useState({
        image: 0,
        text: 0,
        audio: 0
    });
    const [isMinimized, setIsMinimized] = useState(false);

    const [dailyVideos, setDailyVideos] = useState<{ current: number, max: number } | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToQuota((data) => {
            setStats(prev => ({
                ...prev,
                [data.type]: data.rpm
            }));
        });

        // Fetch Daily Quota
        const fetchQuota = async () => {
            try {
                const user = localStorage.getItem('shortsai_user_id');
                if (!user) return;
                const res = await fetch(`/api/users/quota?user_id=${user}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.limits && data.used) {
                        setDailyVideos({
                            current: data.used.currentDailyVideos || 0,
                            max: data.limits.maxDailyVideos || 1
                        });
                    }
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

    // Limits based on Flash 2.5
    const LIMITS = {
        image: 500, // RPM
        text: 1000,
        audio: 10   // RPM (Low limit for TTS)
    };

    const getPercentage = (val: number, limit: number) => Math.min((val / limit) * 100, 100);
    const getColor = (pct: number) => pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-emerald-500';

    if (stats.image === 0 && stats.text === 0 && stats.audio === 0 && !dailyVideos) return null;

    return (
        <div className={`fixed bottom-4 left-4 z-50 bg-black/80 backdrop-blur-md border border-slate-700 rounded-lg text-xs font-mono text-slate-300 shadow-xl transition-all duration-300 pointer-events-auto ${isMinimized ? 'w-auto p-2' : 'w-48 p-3'}`}>
            <div
                className="flex items-center justify-between gap-2 cursor-pointer group"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand HUD" : "Minimize HUD"}
            >
                <div className="flex items-center gap-2 text-slate-400 group-hover:text-white transition-colors">
                    <Activity className={`w-3 h-3 ${!isMinimized ? '' : (stats.image > 0 || stats.text > 0 || stats.audio > 0) ? 'text-indigo-400' : ''}`} />
                    {!isMinimized && <span>API Usage</span>}
                </div>
                <button className="text-slate-500 hover:text-white transition-colors">
                    {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                </button>
            </div>

            {!isMinimized && (
                <div className="space-y-2 mt-2 pt-2 border-t border-slate-700">
                    {dailyVideos && (
                        <div>
                            <div className="flex justify-between mb-0.5 text-indigo-300 font-bold">
                                <span>Daily Videos</span>
                                <span>{dailyVideos.current}/{dailyVideos.max}</span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-500 ${dailyVideos.current >= dailyVideos.max ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${getPercentage(dailyVideos.current, dailyVideos.max)}%` }} />
                            </div>
                        </div>
                    )}

                    <div className="pt-2 border-t border-slate-700/50">
                        <div className="flex justify-between mb-0.5">
                            <span>IMG (RPM)</span>
                            <span>{stats.image}/{LIMITS.image}</span>
                        </div>
                        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${getColor(getPercentage(stats.image, LIMITS.image))}`} style={{ width: `${getPercentage(stats.image, LIMITS.image)}%` }} />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between mb-0.5">
                            <span>TXT (RPM)</span>
                            <span>{stats.text}/{LIMITS.text}</span>
                        </div>
                        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${getColor(getPercentage(stats.text, LIMITS.text))}`} style={{ width: `${getPercentage(stats.text, LIMITS.text)}%` }} />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between mb-0.5">
                            <span>TTS (RPM)</span>
                            <span>{stats.audio}/{LIMITS.audio}</span>
                        </div>
                        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${getColor(getPercentage(stats.audio, LIMITS.audio))}`} style={{ width: `${getPercentage(stats.audio, LIMITS.audio)}%` }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuotaHud;