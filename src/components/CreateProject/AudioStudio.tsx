import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, CheckCircle2, ChevronDown, Music, Zap, Loader2, Play, Square } from 'lucide-react';
import { TTSProvider, Voice, AVAILABLE_VOICES, AVAILABLE_LANGUAGES, IS_SUNO_ENABLED } from '../../types';
import { getVoices, generatePreviewAudio } from '../../services/geminiService';

const VoicePreviewButton = ({ voice, provider, voices }: { voice: string, provider: TTSProvider, voices: Voice[] }) => {
    const { t } = useTranslation();
    const [status, setStatus] = useState<'idle' | 'loading' | 'playing'>('idle');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handlePlay = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (status === 'playing') {
            audioRef.current?.pause();
            setStatus('idle');
            return;
        }

        setStatus('loading');
        try {
            const vObj = voices.find(v => v.name === voice);
            if (!vObj) throw new Error(t('input.voice_not_found'));

            let url = vObj.previewUrl;
            if (!url) {
                url = await generatePreviewAudio(`Hello! I am ${vObj.label}.`, vObj.name, provider);
            }

            if (!url) throw new Error(t('input.no_preview'));

            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => setStatus('idle');
            await audio.play();
            setStatus('playing');
        } catch (e) {
            console.error(e);
            setStatus('idle');
        }
    };

    return (
        <button type="button" onClick={handlePlay} className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-700/50 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-all border border-slate-600 hover:border-indigo-500">
            {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : status === 'playing' ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
        </button>
    );
};

interface AudioStudioProps {
    ttsProvider: TTSProvider;
    setTtsProvider: (p: TTSProvider) => void;
    voice: string;
    setVoice: (v: string) => void;
    audioModel: string;
    setAudioModel: (m: string) => void;
    language: string;
    includeMusic: boolean;
    setIncludeMusic: (v: boolean) => void;
    isBusy: boolean;
}

export const AudioStudio: React.FC<AudioStudioProps> = ({
    ttsProvider, setTtsProvider,
    voice, setVoice,
    audioModel, setAudioModel,
    language,
    includeMusic, setIncludeMusic,
    isBusy
}) => {
    const { t } = useTranslation();
    const [dynamicVoices, setDynamicVoices] = useState<Voice[]>(AVAILABLE_VOICES);
    const [isLoadingVoices, setIsLoadingVoices] = useState(false);

    // Load Voices
    useEffect(() => {
        const fetchVoices = async () => {
            setIsLoadingVoices(true);
            if (ttsProvider === 'elevenlabs') {
                try {
                    const v = await getVoices();
                    setDynamicVoices(v);
                } catch (e) {
                    console.error("Failed to load voices", e);
                }
            } else if (ttsProvider === 'groq') {
                const { GROQ_VOICES } = await import('../../types');
                setDynamicVoices(GROQ_VOICES);
            } else {
                setDynamicVoices(AVAILABLE_VOICES);
            }
            setIsLoadingVoices(false);
        };
        fetchVoices();
    }, [ttsProvider]);

    // Filter voices
    const filteredVoices = dynamicVoices.filter(v => {
        if (!language) return true;
        const langObj = AVAILABLE_LANGUAGES.find(l => l.code === language);
        if (!langObj) return true;

        if (v.supportedLanguages && v.supportedLanguages.length > 0) {
            return v.supportedLanguages.includes(langObj.code) || v.supportedLanguages.includes('multilingual');
        }
        return true;
    });

    // Validate/Reset Voice
    useEffect(() => {
        if (isLoadingVoices) return;
        if (filteredVoices.length > 0) {
            if (!filteredVoices.find(v => v.name === voice)) {
                setVoice(filteredVoices[0].name);
            }
        } else {
            if (!isLoadingVoices && dynamicVoices.length > 0) {
                setVoice('');
            }
        }
    }, [language, ttsProvider, filteredVoices, isLoadingVoices, dynamicVoices.length, voice, setVoice]);

    return (
        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl h-full flex flex-col">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <Mic className="w-4 h-4 text-indigo-400" />
                    </div>
                    {t('input.audio_studio')}
                </h3>
                <p className="text-sm text-slate-500 ml-9">{t('input.audio_subtitle')}</p>
            </div>

            {/* Provider Selector */}
            <div id="audio-controls-group" className="grid grid-cols-3 gap-1 bg-slate-900 p-1.5 rounded-xl mb-6">
                <button type="button" onClick={() => setTtsProvider('gemini')} disabled={isBusy} className={`py-2.5 rounded-lg text-xs font-bold transition-all ${ttsProvider === 'gemini' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>Google Gemini</button>
                <button type="button" onClick={() => setTtsProvider('elevenlabs')} disabled={isBusy} className={`py-2.5 rounded-lg text-xs font-bold transition-all ${ttsProvider === 'elevenlabs' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>ElevenLabs</button>
                <button type="button" onClick={() => setTtsProvider('groq')} disabled={isBusy} className={`py-2.5 rounded-lg text-xs font-bold transition-all ${ttsProvider === 'groq' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>Groq (PlayAI)</button>
            </div>

            {/* ElevenLabs Model Selector */}
            {ttsProvider === 'elevenlabs' && (
                <div className="mb-6 animate-fade-in-up">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('input.model_label')}</label>
                    <div className="grid grid-cols-1 gap-2">
                        <button
                            type="button"
                            onClick={() => setAudioModel('eleven_turbo_v2_5')}
                            disabled={isBusy}
                            className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${audioModel === 'eleven_turbo_v2_5' ? 'bg-indigo-500/20 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                        >
                            <div>
                                <div className="font-bold text-sm mb-0.5">Turbo v2.5</div>
                                <div className="text-[10px] opacity-70">{t('input.model_turbo_desc')}</div>
                            </div>
                            {audioModel === 'eleven_turbo_v2_5' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                        </button>

                        <button
                            type="button"
                            onClick={() => setAudioModel('eleven_multilingual_v2')}
                            disabled={isBusy}
                            className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${audioModel === 'eleven_multilingual_v2' ? 'bg-indigo-500/20 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                        >
                            <div>
                                <div className="font-bold text-sm mb-0.5">Multilingual v2</div>
                                <div className="text-[10px] opacity-70">{t('input.model_multilingual_desc')}</div>
                            </div>
                            {audioModel === 'eleven_multilingual_v2' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                        </button>

                        <button
                            type="button"
                            onClick={() => setAudioModel('eleven_flash_v2_5')}
                            disabled={isBusy}
                            className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${audioModel === 'eleven_flash_v2_5' ? 'bg-indigo-500/20 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                        >
                            <div>
                                <div className="font-bold text-sm mb-0.5">Flash v2.5</div>
                                <div className="text-[10px] opacity-70">{t('input.model_flash_desc')}</div>
                            </div>
                            {audioModel === 'eleven_flash_v2_5' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                        </button>
                    </div>
                </div>
            )}

            <label htmlFor="voice" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('input.voice_model')}</label>
            <div className="flex gap-3 mb-8">
                <div className="relative flex-1">
                    <select id="voice" name="voice" value={voice} onChange={(e) => setVoice(e.target.value)} disabled={isBusy || filteredVoices.length === 0} className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-10 py-3 text-white appearance-none cursor-pointer hover:border-slate-500 transition-colors h-12">
                        {filteredVoices.length > 0 ? (
                            filteredVoices.map(v => <option key={v.name} value={v.name}>{v.label} ({v.gender})</option>)
                        ) : (
                            <option value="" disabled>{t('input.no_voices')}</option>
                        )}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
                </div>
                <VoicePreviewButton voice={voice} provider={ttsProvider} voices={filteredVoices} />
            </div>

            {IS_SUNO_ENABLED && (
                <div
                    onClick={() => !isBusy && setIncludeMusic(!includeMusic)}
                    className={`mt-auto relative overflow-hidden p-5 rounded-2xl border cursor-pointer flex items-center gap-4 transition-all duration-300 group ${includeMusic ? 'bg-gradient-to-br from-pink-500/20 to-purple-600/20 border-pink-500/50' : 'bg-slate-900 border-slate-700 hover:border-pink-500/30'
                        } ${isBusy ? 'opacity-50 pointer-events-none' : ''}`}
                >
                    <div className={`p-3 rounded-full transition-colors ${includeMusic ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/40' : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700 group-hover:text-pink-400'}`}>
                        <Music className="w-6 h-6" />
                    </div>
                    <div className="flex-1 z-10">
                        <h4 className={`font-bold text-base ${includeMusic ? 'text-pink-100' : 'text-slate-300'}`}>{t('input.background_music')}</h4>
                        <p className="text-xs text-slate-500 mt-1">{t('input.music_subtitle')}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${includeMusic ? 'bg-pink-500 border-pink-500' : 'border-slate-600'}`}>
                        {includeMusic && <Zap className="w-3 h-3 text-white" />}
                    </div>
                </div>
            )}
        </div>
    );
};
