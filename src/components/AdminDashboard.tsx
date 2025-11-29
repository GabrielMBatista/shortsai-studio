import React, { useEffect, useState } from 'react';
import { User, Role, SubscriptionPlan } from '../types';
import Loader from './Loader';
import { Shield, Users, Film, Layers, Ban, CheckCircle2, Edit2, Save, X, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface AnalyticsData {
    date: string;
    users: number;
    projects: number;
}

interface AdminStats {
    totalUsers: number;
    totalProjects: number;
    totalScenes: number;
    analytics: AnalyticsData[];
    usageStats?: Record<string, { success: number, failed: number, total: number }>;
}

interface AdminUser extends User {
    _count: { projects: number };
    created_at: string;
}

const AdminDashboard: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<string | null>(null);

    // Edit Form State
    const [editForm, setEditForm] = useState<{ role: Role, plan: SubscriptionPlan, isBlocked: boolean }>({
        role: 'USER', plan: 'FREE', isBlocked: false
    });

    const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');
    const [dateRange, setDateRange] = useState<number>(30);

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    // Real-time updates via SSE
    useEffect(() => {
        const eventSource = new EventSource('/api/events/admin');

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'connected') {
                    console.log('[AdminSSE] Connected');
                } else if (data.type === 'USER_REGISTERED') {
                    console.log('[AdminSSE] New User Registered');
                    fetchData(); // Refresh all data to keep sync
                } else if (data.type === 'PROJECT_CREATED') {
                    console.log('[AdminSSE] New Project Created');
                    fetchData(); // Refresh all data
                }
            } catch (e) {
                console.error("[AdminSSE] Parse Error", e);
            }
        };

        eventSource.onerror = (err) => {
            console.error('[AdminSSE] Connection Error', err);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [dateRange]); // Re-connect if dateRange changes (optional, but keeps fetch logic consistent)

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [statsRes, usersRes] = await Promise.all([
                fetch(`/api/admin/stats?days=${dateRange}`),
                fetch('/api/admin/users')
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (usersRes.ok) {
                const data = await usersRes.json();
                const mappedUsers = data.map((u: any) => ({
                    ...u,
                    subscriptionPlan: u.subscription_plan,
                    isBlocked: u.is_blocked,
                    role: u.role as Role
                }));
                setUsers(mappedUsers);
            }
        } catch (e) {
            console.error("Failed to fetch admin data", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = (user: AdminUser) => {
        setEditingUser(user.id);
        setEditForm({
            role: user.role || 'USER',
            plan: user.subscriptionPlan || 'FREE',
            isBlocked: user.isBlocked || false
        });
    };

    const handleSave = async (userId: string) => {
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    role: editForm.role,
                    subscription_plan: editForm.plan,
                    is_blocked: editForm.isBlocked
                })
            });

            if (res.ok) {
                setEditingUser(null);
                fetchData(); // Refresh
            }
        } catch (e) {
            console.error("Failed to update user", e);
        }
    };

    if (isLoading) return <Loader text="Loading Admin Dashboard..." />;

    return (
        <div className="w-full max-w-[1800px] mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Shield className="w-8 h-8 text-indigo-500" /> Admin Dashboard
                </h1>

                {/* Tabs */}
                <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        User Management
                    </button>
                </div>
            </div>

            {activeTab === 'overview' && stats && (
                <div className="animate-fade-in">
                    {/* Date Range Filter */}
                    <div className="flex justify-end mb-6">
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(Number(e.target.value))}
                            className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
                        >
                            <option value={7}>Last 7 Days</option>
                            <option value={30}>Last 30 Days</option>
                            <option value={90}>Last 90 Days</option>
                        </select>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400"><Users className="w-6 h-6" /></div>
                                <div>
                                    <p className="text-slate-400 text-sm">Total Users</p>
                                    <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400"><Film className="w-6 h-6" /></div>
                                <div>
                                    <p className="text-slate-400 text-sm">Total Projects</p>
                                    <p className="text-2xl font-bold text-white">{stats.totalProjects}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-pink-500/10 rounded-xl text-pink-400"><Layers className="w-6 h-6" /></div>
                                <div>
                                    <p className="text-slate-400 text-sm">Total Scenes</p>
                                    <p className="text-2xl font-bold text-white">{stats.totalScenes}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Analytics Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-400" /> User Growth ({dateRange} Days)
                            </h3>
                            <div className="h-64 lg:h-96 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.analytics}>
                                        <defs>
                                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickFormatter={(val) => val.slice(5)} />
                                        <YAxis stroke="#94a3b8" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                            itemStyle={{ color: '#818cf8' }}
                                        />
                                        <Area type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <Film className="w-5 h-5 text-purple-400" /> Project Creation ({dateRange} Days)
                            </h3>
                            <div className="h-64 lg:h-96 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.analytics}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickFormatter={(val) => val.slice(5)} />
                                        <YAxis stroke="#94a3b8" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                            cursor={{ fill: '#334155', opacity: 0.2 }}
                                        />
                                        <Bar dataKey="projects" fill="#a855f7" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* System Health / Failure Rates */}
                    {stats.usageStats && Object.keys(stats.usageStats).length > 0 && (
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-12">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <Ban className="w-5 h-5 text-red-400" /> System Health (Failures vs Success)
                            </h3>
                            <div className="h-64 lg:h-96 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={Object.entries(stats.usageStats).map(([action, data]) => ({
                                            name: action.replace('GENERATE_', ''),
                                            success: data.success,
                                            failed: data.failed
                                        }))}
                                        layout="vertical"
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                        <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={100} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                            cursor={{ fill: '#334155', opacity: 0.2 }}
                                        />
                                        <Bar dataKey="success" name="Success" fill="#10b981" stackId="a" radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="failed" name="Failed" fill="#ef4444" stackId="a" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'users' && (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden animate-fade-in">
                    <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">User Management</h2>
                        <span className="text-sm text-slate-400">{users.length} registered users</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-400">
                            <thead className="bg-slate-900/50 text-xs uppercase font-semibold text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Plan</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Projects</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} className="w-8 h-8 rounded-full" />
                                                <div>
                                                    <p className="font-medium text-white">{user.name}</p>
                                                    <p className="text-xs">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {editingUser === user.id ? (
                                                <select
                                                    value={editForm.role}
                                                    onChange={e => setEditForm({ ...editForm, role: e.target.value as Role })}
                                                    className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white"
                                                >
                                                    <option value="USER">USER</option>
                                                    <option value="ADMIN">ADMIN</option>
                                                </select>
                                            ) : (
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'ADMIN' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-700 text-slate-300'}`}>
                                                    {user.role || 'USER'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {editingUser === user.id ? (
                                                <select
                                                    value={editForm.plan}
                                                    onChange={e => setEditForm({ ...editForm, plan: e.target.value as SubscriptionPlan })}
                                                    className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white"
                                                >
                                                    <option value="FREE">FREE</option>
                                                    <option value="PRO">PRO</option>
                                                </select>
                                            ) : (
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${user.subscriptionPlan === 'PRO' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                                    {user.subscriptionPlan || 'FREE'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {editingUser === user.id ? (
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={editForm.isBlocked}
                                                        onChange={e => setEditForm({ ...editForm, isBlocked: e.target.checked })}
                                                        className="rounded bg-slate-900 border-slate-600 text-red-500 focus:ring-red-500"
                                                    />
                                                    <span className="text-xs">Blocked</span>
                                                </label>
                                            ) : (
                                                user.isBlocked ? (
                                                    <span className="flex items-center gap-1 text-red-400 text-xs font-bold"><Ban className="w-3 h-3" /> Blocked</span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold"><CheckCircle2 className="w-3 h-3" /> Active</span>
                                                )
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user._count?.projects || 0}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {editingUser === user.id ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleSave(user.id)} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30"><Save className="w-4 h-4" /></button>
                                                    <button onClick={() => setEditingUser(null)} className="p-1.5 bg-slate-700 text-slate-400 rounded hover:bg-slate-600"><X className="w-4 h-4" /></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleEditClick(user)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
