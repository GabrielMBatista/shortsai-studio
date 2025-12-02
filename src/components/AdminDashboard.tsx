import React, { useEffect, useState } from 'react';
import { User, Role, SubscriptionPlan, Plan } from '../types';
import Loader from './Loader';
import { Shield, Users, Film, Layers, Ban, TrendingUp, Loader2, Search, Filter, ArrowUp, ArrowDown, CheckCircle2, Save, X, Edit2, CreditCard, Plus, Trash2 } from 'lucide-react';
import LogConsole from './LogConsole';
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
    usageStats?: Record<string, { success: number, failed: number, total: number, errors: { message: string, count: number }[] }>;
}

interface AdminUser extends User {
    _count: { projects: number };
    created_at: string;
}

const AdminDashboard: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [isCreatingPlan, setIsCreatingPlan] = useState(false);

    // Edit Form State
    const [editForm, setEditForm] = useState<{ role: Role, plan: SubscriptionPlan, isBlocked: boolean }>({
        role: 'USER', plan: 'FREE', isBlocked: false
    });

    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'plans'>('overview');
    const [dateRange, setDateRange] = useState<number>(30);

    // Filter & Sort State
    const [filters, setFilters] = useState({
        search: '',
        role: 'ALL',
        plan: 'ALL',
        status: 'ALL'
    });
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({
        key: 'created_at',
        direction: 'desc'
    });

    useEffect(() => {
        if (activeTab === 'users' || activeTab === 'plans') {
            fetchData();
        }
    }, [filters, sortConfig, activeTab]);

    useEffect(() => {
        if (activeTab === 'overview') {
            fetchData();
        }
    }, [dateRange, activeTab]);

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
            const query = new URLSearchParams({
                search: filters.search,
                role: filters.role,
                plan: filters.plan,
                status: filters.status,
                sort: sortConfig.key,
                order: sortConfig.direction
            }).toString();

            const [statsRes, usersRes, plansRes] = await Promise.all([
                activeTab === 'overview' ? fetch(`/api/admin/stats?days=${dateRange}`) : Promise.resolve({ ok: true, json: async () => stats }),
                activeTab === 'users' ? fetch(`/api/admin/users?${query}`) : Promise.resolve({ ok: true, json: async () => users }),
                activeTab === 'plans' ? fetch(`/api/admin/plans`) : Promise.resolve({ ok: true, json: async () => plans })
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
            if (plansRes.ok) setPlans(await plansRes.json());
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

    const handleSavePlan = async (plan: Partial<Plan>) => {
        try {
            const url = plan.id ? `/api/admin/plans/${plan.id}` : '/api/admin/plans';
            const method = plan.id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(plan)
            });

            if (res.ok) {
                setEditingPlan(null);
                setIsCreatingPlan(false);
                fetchData();
            } else {
                const err = await res.json();
                alert(`Error saving plan: ${err.error}`);
            }
        } catch (e) {
            console.error("Failed to save plan", e);
            alert("Failed to save plan");
        }
    };

    const handleDeletePlan = async (id: string) => {
        if (!confirm("Are you sure you want to delete this plan? This might affect users assigned to it.")) return;
        try {
            const res = await fetch(`/api/admin/plans/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchData();
            } else {
                alert("Failed to delete plan");
            }
        } catch (e) {
            console.error("Failed to delete plan", e);
        }
    };

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    if (isLoading && !stats && !users.length) return <Loader text="Loading Admin Dashboard..." />;

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
                    <button
                        onClick={() => setActiveTab('plans')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'plans' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Plans & Limits
                    </button>
                </div>
            </div>

            {activeTab === 'overview' && stats && (
                <div className="animate-fade-in">
                    {/* Date Range Filter */}
                    <div className="flex justify-end mb-6 items-center gap-3">
                        {isLoading && (
                            <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50 animate-pulse">
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                                <span>Updating...</span>
                            </div>
                        )}
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(Number(e.target.value))}
                            className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading}
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
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                            <div className="lg:col-span-1 bg-slate-800 p-6 rounded-2xl border border-slate-700">
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <Ban className="w-5 h-5 text-red-400" /> System Health
                                </h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={Object.entries(stats.usageStats).map(([action, data]) => ({
                                                name: action.replace('GENERATE_', ''),
                                                success: data.success,
                                                failed: data.failed
                                            }))}
                                            layout="vertical"
                                            margin={{ left: 0, right: 10, top: 0, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                            <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                                            <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={70} tick={{ fill: '#94a3b8' }} />
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

                            <div className="lg:col-span-2">
                                <LogConsole />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'users' && (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden animate-fade-in">
                    <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">User Management</h2>
                        <span className="text-sm text-slate-400">{users.length} users found</span>
                    </div>

                    {/* Filters Toolbar */}
                    <div className="p-4 bg-slate-900/30 border-b border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={filters.search}
                                onChange={e => setFilters({ ...filters, search: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <select
                            value={filters.role}
                            onChange={e => setFilters({ ...filters, role: e.target.value })}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="ALL">All Roles</option>
                            <option value="USER">User</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                        <select
                            value={filters.plan}
                            onChange={e => setFilters({ ...filters, plan: e.target.value })}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="ALL">All Plans</option>
                            <option value="FREE">Free</option>
                            <option value="PRO">Pro</option>
                        </select>
                        <select
                            value={filters.status}
                            onChange={e => setFilters({ ...filters, status: e.target.value })}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="ALL">All Status</option>
                            <option value="active">Active</option>
                            <option value="blocked">Blocked</option>
                        </select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-400">
                            <thead className="bg-slate-900/50 text-xs uppercase font-semibold text-slate-500">
                                <tr>
                                    <th onClick={() => handleSort('name')} className="px-6 py-4 cursor-pointer hover:text-indigo-400 transition-colors">
                                        <div className="flex items-center gap-1">User {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th onClick={() => handleSort('role')} className="px-6 py-4 cursor-pointer hover:text-indigo-400 transition-colors">
                                        <div className="flex items-center gap-1">Role {sortConfig.key === 'role' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th onClick={() => handleSort('subscription_plan')} className="px-6 py-4 cursor-pointer hover:text-indigo-400 transition-colors">
                                        <div className="flex items-center gap-1">Plan {sortConfig.key === 'subscription_plan' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th onClick={() => handleSort('is_blocked')} className="px-6 py-4 cursor-pointer hover:text-indigo-400 transition-colors">
                                        <div className="flex items-center gap-1">Status {sortConfig.key === 'is_blocked' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</div>
                                    </th>
                                    <th onClick={() => handleSort('projects')} className="px-6 py-4 cursor-pointer hover:text-indigo-400 transition-colors">
                                        <div className="flex items-center gap-1">Projects {sortConfig.key === 'projects' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</div>
                                    </th>
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
            {activeTab === 'plans' && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white">Subscription Plans</h2>
                        <button
                            onClick={() => {
                                setEditingPlan({
                                    id: '',
                                    name: '',
                                    slug: '',
                                    description: '',
                                    price: 0,
                                    monthly_images_limit: 10,
                                    monthly_videos_limit: 5,
                                    monthly_minutes_tts: 10,
                                    daily_requests_limit: 50,
                                    daily_videos_limit: 2,
                                    features: {},
                                    created_at: '',
                                    updated_at: ''
                                });
                                setIsCreatingPlan(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-indigo-500/20"
                        >
                            <Plus className="w-4 h-4" /> Create Plan
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plans.map(plan => (
                            <div key={plan.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-6 flex flex-col relative group hover:border-indigo-500/50 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                        <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded mt-1 inline-block">{plan.slug}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-bold text-white">${Number(plan.price).toFixed(2)}</span>
                                        <span className="text-slate-500 text-sm">/mo</span>
                                    </div>
                                </div>

                                <p className="text-slate-400 text-sm mb-6 flex-grow">{plan.description || "No description"}</p>

                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Monthly Videos</span>
                                        <span className="text-white font-medium">{plan.monthly_videos_limit}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Monthly Images</span>
                                        <span className="text-white font-medium">{plan.monthly_images_limit}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">TTS Minutes</span>
                                        <span className="text-white font-medium">{plan.monthly_minutes_tts}</span>
                                    </div>
                                    <div className="h-px bg-slate-700/50 my-2"></div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Daily Videos</span>
                                        <span className="text-white font-medium">{plan.daily_videos_limit}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-auto pt-4 border-t border-slate-700">
                                    <button
                                        onClick={() => { setEditingPlan(plan); setIsCreatingPlan(false); }}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
                                    >
                                        <Edit2 className="w-4 h-4" /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeletePlan(plan.id)}
                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Delete Plan"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Plan Edit Modal */}
            {editingPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-indigo-500" />
                                {isCreatingPlan ? 'Create New Plan' : 'Edit Plan'}
                            </h3>
                            <button onClick={() => setEditingPlan(null)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Plan Name</label>
                                    <input
                                        type="text"
                                        value={editingPlan.name}
                                        onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="e.g. Pro"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Slug (Unique ID)</label>
                                    <input
                                        type="text"
                                        value={editingPlan.slug}
                                        onChange={e => setEditingPlan({ ...editingPlan, slug: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                        placeholder="e.g. pro"
                                        disabled={!isCreatingPlan}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                                <textarea
                                    value={editingPlan.description || ''}
                                    onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
                                    placeholder="Plan description..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Price ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingPlan.price}
                                    onChange={e => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-400" /> Limits Configuration</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Monthly Videos</label>
                                        <input
                                            type="number"
                                            value={editingPlan.monthly_videos_limit}
                                            onChange={e => setEditingPlan({ ...editingPlan, monthly_videos_limit: parseInt(e.target.value) })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Monthly Images</label>
                                        <input
                                            type="number"
                                            value={editingPlan.monthly_images_limit}
                                            onChange={e => setEditingPlan({ ...editingPlan, monthly_images_limit: parseInt(e.target.value) })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Monthly TTS Minutes</label>
                                        <input
                                            type="number"
                                            value={editingPlan.monthly_minutes_tts}
                                            onChange={e => setEditingPlan({ ...editingPlan, monthly_minutes_tts: parseInt(e.target.value) })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Daily Videos (Rate Limit)</label>
                                        <input
                                            type="number"
                                            value={editingPlan.daily_videos_limit}
                                            onChange={e => setEditingPlan({ ...editingPlan, daily_videos_limit: parseInt(e.target.value) })}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900 sticky bottom-0 z-10 rounded-b-2xl">
                            <button onClick={() => setEditingPlan(null)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                            <button onClick={() => handleSavePlan(editingPlan)} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/20 transition-colors">
                                {isCreatingPlan ? 'Create Plan' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
