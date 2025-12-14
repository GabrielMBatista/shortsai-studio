import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, Bot, User as UserIcon, Loader2, Trash2 } from 'lucide-react';
import { Persona } from '../../types/personas';
import { personasApi } from '../../api/personas';

interface Message {
    role: 'user' | 'model';
    text: string;
}

interface PersonaChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    persona: Persona | null;
    channelId?: string;
}

export default function PersonaChatModal({ isOpen, onClose, persona, channelId }: PersonaChatModalProps) {
    const { t } = useTranslation();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial greeting when opened
    useEffect(() => {
        if (isOpen && persona && messages.length === 0) {
            setMessages([]);
        }
    }, [isOpen, persona]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !persona) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            const history = messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            const res = await personasApi.chat(persona.id, userMsg, history, channelId);

            // Check if response is a Job Signal
            let jobSignal = null;
            try {
                if (res.response.trim().startsWith('{')) {
                    const parsed = JSON.parse(res.response);
                    if (parsed.type === 'job_started') jobSignal = parsed;
                }
            } catch (e) { /* Not a job signal */ }

            if (jobSignal) {
                // Background Job Started
                setMessages(prev => [...prev, { role: 'model', text: '🔄 ' + t('input.job_started', 'Iniciando pesquisa profunda... Isso pode levar alguns minutos.') }]);
                pollJob(jobSignal.jobId);
                // Note: isLoading stays true or we handle it inside poll?
                // Let's set isLoading false here, but maybe show a different status?
                // Actually, let's keep isLoading=false and let the user wait for the new message.
                // Or better: keep a "polling" state. 
            } else {
                setMessages(prev => [...prev, { role: 'model', text: res.response }]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'model', text: t('input.error_message') }]);
        } finally {
            setIsLoading(false);
        }
    };

    const pollJob = async (jobId: string) => {
        const interval = setInterval(async () => {
            try {
                // Fetch job status
                // We need a way to call the API. Assuming we have a fetch wrapper or use raw fetch.
                // Since this is a specialized endpoint, raw fetch is fine or use a new api method.
                const res = await fetch(`/api/jobs/schedule/${jobId}`);
                const data = await res.json();

                if (data.state === 'completed') {
                    clearInterval(interval);
                    // Job Done!
                    let finalResult = data.result;
                    // If result has unescaped chars, clean it? usually it's fine.
                    // Often result is { result: string }. 
                    // My worker returns { result: resultJson }.
                    if (typeof finalResult === 'object' && finalResult.result) finalResult = finalResult.result;

                    setMessages(prev => [...prev, { role: 'model', text: finalResult }]);
                } else if (data.state === 'failed') {
                    clearInterval(interval);
                    setMessages(prev => [...prev, { role: 'model', text: '❌ Erro ao gerar cronograma: ' + (data.result?.error || 'Unknown error') }]);
                }
                // If active/waiting, continue polling...
            } catch (err) {
                console.error('Polling error', err);
                // Don't clear interval immediately on network error, maybe transient.
            }
        }, 3000);
    };

    const handleClear = () => {
        if (window.confirm(t('input.clear_history_confirm'))) {
            setMessages([]);
        }
    };

    if (!isOpen || !persona) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#0f172a] border border-slate-700 w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                            <Bot className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                {t('input.chat_with', { name: persona.name })}
                            </h2>
                            <p className="text-xs text-slate-400 capitalize">
                                {persona.category || t('personas.default_category')} • {t('personas.temp')}: {persona.temperature}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleClear}
                            title={t('personas.clear_chat_title')}
                            className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/30 scrollbar-thin scrollbar-thumb-slate-700">
                    {messages.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>{t('input.initial_message', { name: persona.name })}</p>
                            <p className="text-xs opacity-70 mt-1">{t('input.initial_tip')}</p>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-br-none'
                                : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                                }`}>
                                <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start w-full animate-fade-in">
                            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-3 shadow-lg">
                                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                                {messages.filter(m => m.role === 'user').pop()?.text.toLowerCase().match(/cronograma|semana|planejamento/i) ? (
                                    <span className="text-sm text-slate-300">
                                        {t('input.generating_weekly', 'Generating weekly schedule (Deep Think)... This may take ~60s.')}
                                    </span>
                                ) : (
                                    <span className="text-sm text-slate-400">Thinking...</span>
                                )}
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                    <form
                        className="flex gap-2"
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={t('input.message_placeholder', { name: persona.name })}
                            className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
