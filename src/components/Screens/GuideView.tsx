import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Book, Code, Copy, Check, Terminal, FileJson, MessageSquare, Users } from 'lucide-react';

export const GuideView: React.FC = () => {
    const { t } = useTranslation();
    const [activeSection, setActiveSection] = useState('chatgpt');

    const sections = [
        { id: 'chatgpt', label: t('guides.chatgpt_title', 'ChatGPT Prompts'), icon: MessageSquare },
        { id: 'json-schema', label: t('guides.json_title', 'JSON Schema (Batch)'), icon: FileJson },
        { id: 'characters', label: t('guides.characters_title', 'Character Consistency'), icon: Users },
    ];

    return (
        <div className="flex h-screen bg-[#0f172a] text-slate-200 overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 border-r border-slate-800 flex-shrink-0 flex flex-col pt-4 overflow-y-auto bg-[#0f172a]">
                <div className="px-6 mb-8">
                    <h2 id="guides-header" className="text-lg font-bold text-white flex items-center gap-2">
                        <Book className="w-5 h-5 text-indigo-500" />
                        {t('guides.title', 'Guides & Templates')}
                    </h2>
                </div>
                <nav id="guides-sidebar" className="flex-1 px-4 space-y-1">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === section.id
                                ? 'bg-indigo-500/10 text-indigo-400'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <section.icon className="w-4 h-4" />
                            {section.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 lg:p-12 relative">
                <div className="max-w-3xl mx-auto space-y-12">
                    {activeSection === 'chatgpt' && <ChatGPTGuide />}
                    {activeSection === 'json-schema' && <JsonSchemaGuide />}
                    {activeSection === 'characters' && <CharacterGuide />}
                </div>
            </div>
        </div>
    );
};

const ChatGPTGuide = () => {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    const [mode, setMode] = useState<'single' | 'batch'>('single');

    const singleCode = t('guides.single_prompt_code');

    const batchCode = t('guides.batch_prompt_code');

    const code = mode === 'single' ? singleCode : batchCode;

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <section className="space-y-6">
            <header className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t('guides.chatgpt_title')}</h1>
                    <p className="text-slate-400 text-lg">
                        {mode === 'single' ? t('guides.chatgpt_desc') : t('guides.batch_prompt_desc')}
                    </p>
                </div>

                <div className="bg-slate-800 p-1 rounded-lg flex items-center">
                    <button
                        onClick={() => setMode('single')}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${mode === 'single' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        {t('guides.single_mode', 'Single Video')}
                    </button>
                    <button
                        onClick={() => setMode('batch')}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${mode === 'batch' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        {t('guides.batch_mode', 'Weekly Batch')}
                    </button>
                </div>
            </header>

            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                        <Terminal className="w-4 h-4" />
                        <span>{t('guides.prompt_template')}</span>
                    </div>

                    <button
                        id="btn-copy-prompt"
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? t('guides.copied') : t('guides.copy')}
                    </button>
                </div>
                <div className="p-4 overflow-x-auto">
                    <pre className="font-mono text-sm text-indigo-300 leading-relaxed whitespace-pre-wrap">{code}</pre>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <h3 className="font-bold text-white mb-2">💡 {t('guides.tip')}</h3>
                    <p className="text-sm text-slate-400">
                        <Trans i18nKey="guides.tip_desc">
                            Replace <span className="text-indigo-400 font-mono">[TOPIC]</span> with your specific subject matter (e.g., "The History of Rome" or "SpaceX Starship Launch").
                        </Trans>
                    </p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <h3 className="font-bold text-white mb-2">🚀 {t('guides.batch_title')}</h3>
                    <p className="text-sm text-slate-400">{t('guides.batch_desc')}</p>
                </div>
            </div>
        </section >
    );
};

const JsonSchemaGuide = () => {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    const code = t('guides.json_schema_code');

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <section className="space-y-6">
            <header className="border-b border-slate-800 pb-4">
                <h1 className="text-3xl font-bold text-white mb-2">{t('guides.json_title')}</h1>
                <p className="text-slate-400 text-lg">{t('guides.json_desc')}</p>
            </header>

            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                        <FileJson className="w-4 h-4" />
                        <span>batch_import.json</span>
                    </div>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? t('guides.copied') : t('guides.copy')}
                    </button>
                </div>
                <div className="p-4 overflow-x-auto">
                    <pre className="font-mono text-sm text-emerald-300 leading-relaxed whitespace-pre-wrap">{code}</pre>
                </div>
            </div>
        </section>
    );
};

const CharacterGuide = () => {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    const code = t('guides.char_prompt_code');

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <section className="space-y-6">
            <header className="border-b border-slate-800 pb-4">
                <h1 className="text-3xl font-bold text-white mb-2">{t('guides.characters_title')}</h1>
                <p className="text-slate-400 text-lg">{t('guides.characters_desc')}</p>
            </header>

            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                        <Users className="w-4 h-4" />
                        <span>{t('guides.char_prompt_title')}</span>
                    </div>
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? t('guides.copied') : t('guides.copy')}
                    </button>
                </div>
                <div className="p-4 overflow-x-auto">
                    <pre className="font-mono text-sm text-indigo-300 leading-relaxed whitespace-pre-wrap">{code}</pre>
                </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 mt-8">
                <h3 className="font-bold text-white mb-2">💡 {t('guides.tip')}</h3>
                <p className="text-sm text-slate-400">
                    {t('guides.char_tip')}
                </p>
            </div>
        </section>
    );
};

export default GuideView;
