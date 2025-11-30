import React, { useEffect, useState } from 'react';
import { Terminal, Search, Filter, AlertCircle, CheckCircle, Clock, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Loader from './Loader';

interface LogEntry {
    id: string;
    action_type: string;
    status: 'success' | 'failed';
    error_message?: string;
    duration_seconds: number;
    created_at: string;
    user?: {
        name: string;
        email: string;
        avatar_url?: string;
    };
    project?: {
        topic: string;
        id: string;
    };
}

const LogConsole: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        status: 'failed', // Default to failed as per user request
        action: 'ALL',
        search: ''
    });

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const query = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                status: filters.status,
                action: filters.action,
                search: filters.search
            });

            const res = await fetch(`/api/admin/logs?${query}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
                setTotalPages(data.pagination.pages);
            }
        } catch (e) {
            console.error("Failed to fetch logs", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, filters]);

    const formatTime = (iso: string) => {
        return new Date(iso).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    return (
        <div className="bg-[#0d1117] rounded-xl border border-slate-800 overflow-hidden font-mono text-sm shadow-2xl">
            {/* Console Header / Toolbar */}
            <div className="bg-slate-900/50 p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-slate-400">
                    <Terminal className="w-4 h-4" />
                    <span className="font-bold text-slate-200">System Logs</span>
                </div>

                <div className="flex items-center gap-2 flex-1 justify-end">
                    {/* Search */}
                    <div className="relative group">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search logs (User, ID, Error)..."
                            value={filters.search}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFilters(prev => ({
                                    ...prev,
                                    search: val,
                                    page: 1,
                                    status: (val && prev.status === 'failed') ? 'ALL' : prev.status
                                }));
                            }}
                            className="bg-slate-950 border border-slate-800 rounded px-2.5 pl-8 py-1 text-xs text-slate-300 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none w-48 transition-all"
                        />
                    </div>

                    {/* Filters */}
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 outline-none focus:border-indigo-500/50"
                    >
                        <option value="ALL">All Status</option>
                        <option value="failed">Failed Only</option>
                        <option value="success">Success Only</option>
                    </select>

                    <select
                        value={filters.action}
                        onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value, page: 1 }))}
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 outline-none focus:border-indigo-500/50"
                    >
                        <option value="ALL">All Actions</option>
                        <option value="GENERATE_SCRIPT">Script</option>
                        <option value="GENERATE_IMAGE">Image</option>
                        <option value="GENERATE_TTS">TTS</option>
                        <option value="GENERATE_MUSIC">Music</option>
                    </select>

                    <button
                        onClick={fetchLogs}
                        className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Console Body */}
            <div className="h-[400px] overflow-y-auto custom-scrollbar bg-[#0d1117] p-2">
                {isLoading && logs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 gap-2">
                        <Loader text="Fetching logs..." />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                        <Terminal className="w-8 h-8 opacity-20" />
                        <p>No logs found matching filters.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-[#0d1117] z-10 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                            <tr>
                                <th className="pb-2 pl-2 w-24">Time</th>
                                <th className="pb-2 w-20">Status</th>
                                <th className="pb-2 w-32">Action</th>
                                <th className="pb-2 w-20">Duration</th>
                                <th className="pb-2">Details / Error</th>
                                <th className="pb-2 w-32 text-right pr-2">User</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs font-mono">
                            {logs.map((log) => (
                                <tr key={log.id} className="group hover:bg-slate-800/30 transition-colors border-b border-slate-800/30 last:border-0">
                                    <td className="py-2 pl-2 text-slate-500 whitespace-nowrap align-top">
                                        {formatTime(log.created_at)}
                                    </td>
                                    <td className="py-2 align-top">
                                        {log.status === 'success' ? (
                                            <span className="text-emerald-500 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> OK
                                            </span>
                                        ) : (
                                            <span className="text-red-500 flex items-center gap-1 font-bold">
                                                <AlertCircle className="w-3 h-3" /> ERR
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-2 text-slate-300 align-top">
                                        {log.action_type.replace('GENERATE_', '')}
                                    </td>
                                    <td className="py-2 text-slate-500 align-top">
                                        {log.duration_seconds}s
                                    </td>
                                    <td className="py-2 pr-4 align-top">
                                        {log.status === 'failed' ? (
                                            <span className="text-red-400 break-all block">
                                                {log.error_message || 'Unknown Error'}
                                            </span>
                                        ) : (
                                            <span className="text-slate-600 truncate block max-w-md">
                                                Completed successfully
                                            </span>
                                        )}
                                        {log.project && (
                                            <div className="text-slate-600 text-[10px] mt-0.5">
                                                Project: {log.project.topic.substring(0, 30)}...
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-2 pr-2 text-right align-top text-slate-500">
                                        {log.user?.email.split('@')[0]}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination Footer */}
            <div className="bg-slate-900/30 p-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Page {page} of {totalPages}</span>
                <div className="flex gap-1">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1 hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-1 hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogConsole;
