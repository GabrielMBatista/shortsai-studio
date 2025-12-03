import React, { useState, useEffect } from 'react';
import { User, ApiKeys, IS_SUNO_ENABLED } from '../types';
import Tutorial from './Tutorial';
import { Step } from 'react-joyride';
import { Save, Key, User as UserIcon, ShieldAlert, Music, Loader2, Globe, HelpCircle } from 'lucide-react';
import { updateUserApiKeys } from '../services/storageService';
import { useTranslation } from 'react-i18next';

interface SettingsScreenProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ user, onUpdateUser }) => {
  const { t, i18n } = useTranslation();
  const [geminiKey, setGeminiKey] = useState('');
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [sunoKey, setSunoKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [runTutorial, setRunTutorial] = useState(false);

  const tutorialSteps: Step[] = [
    {
      target: 'body',
      content: 'Bem-vindo às configurações! Aqui você pode gerenciar seu perfil e chaves de API.',
      placement: 'center',
    },
    {
      target: '#geminiKey',
      content: 'A chave do Google Gemini é obrigatória para gerar roteiros e inteligência do vídeo. Obtenha no Google AI Studio.',
    },
    {
      target: '#elevenLabsKey',
      content: 'Opcional: Adicione sua chave ElevenLabs para narrações ultra-realistas.',
    },
    {
      target: 'button[type="submit"]',
      content: 'Não esqueça de salvar suas alterações aqui!',
    }
  ];

  useEffect(() => {
    if (user.apiKeys?.gemini) setGeminiKey(user.apiKeys.gemini);
    if (user.apiKeys?.elevenlabs) setElevenLabsKey(user.apiKeys.elevenlabs);
    if (user.apiKeys?.suno) setSunoKey(user.apiKeys.suno);
    if (user.apiKeys?.groq) setGroqKey(user.apiKeys.groq);
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const newKeys: ApiKeys = {
        gemini: geminiKey.trim(),
        elevenlabs: elevenLabsKey.trim(),
        suno: sunoKey.trim(),
        groq: groqKey.trim()
      };
      const updatedUser = await updateUserApiKeys(user.id, newKeys);
      if (updatedUser) {
        onUpdateUser(updatedUser);
        setMessage({ text: t('common.success'), type: 'success' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ text: t('common.error'), type: 'error' });
      }
    } catch (err) {
      setMessage({ text: t('common.error'), type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng); // Force persist
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-8">
      <Tutorial run={runTutorial} steps={tutorialSteps} onFinish={() => setRunTutorial(false)} />
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <UserIcon className="w-8 h-8 text-indigo-400" />
          {t('settings.title')}
        </h1>
        <button
          onClick={() => setRunTutorial(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500/20 transition-colors text-sm font-medium"
        >
          <HelpCircle className="w-4 h-4" />
          Tour
        </button>
      </div>

      <div className="grid gap-8">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
          <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full border-2 border-indigo-500" />
          <div className="text-center md:text-left flex-1">
            <h2 className="text-xl font-bold text-white">{user.name}</h2>
            <p className="text-slate-400">{user.email}</p>
            <span className={`inline-block mt-2 px-2 py-1 text-xs rounded border ${user.subscriptionPlan === 'PRO' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-slate-500/20 text-slate-300 border-slate-500/30'}`}>
              {user.subscriptionPlan === 'PRO' ? 'Pro Plan' : 'Free Plan'}
            </span>
          </div>
        </div>

        {/* Language Selector */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2"><Globe className="w-5 h-5 text-indigo-400" />{t('settings.language')}</h3>
          <div className="flex gap-4">
            <button
              onClick={() => changeLanguage('en')}
              className={`px-4 py-2 rounded-lg border transition-all ${i18n.language === 'en' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}
            >
              English
            </button>
            <button
              onClick={() => changeLanguage('pt-BR')}
              className={`px-4 py-2 rounded-lg border transition-all ${i18n.language === 'pt-BR' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}
            >
              Português (Brasil)
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2"><Key className="w-5 h-5 text-indigo-400" />{t('settings.api_config')}</h3>
          {message && <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30' : 'bg-red-500/20 text-red-200 border border-red-500/30'}`}>{message.text}</div>}
          <div className="space-y-6">

            <div>
              <label htmlFor="geminiKey" className="block text-sm font-medium text-slate-300 mb-2">{t('settings.gemini_label')}</label>
              <input id="geminiKey" name="geminiKey" type="password" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="AIzaSy..." className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              <p className="text-xs text-slate-500 mt-2">{t('settings.gemini_help')}</p>
            </div>

            <div>
              <label htmlFor="elevenLabsKey" className="block text-sm font-medium text-slate-300 mb-2">{t('settings.elevenlabs_label')}</label>
              <input id="elevenLabsKey" name="elevenLabsKey" type="password" value={elevenLabsKey} onChange={(e) => setElevenLabsKey(e.target.value)} placeholder="sk_..." className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              <p className="text-xs text-slate-500 mt-2">{t('settings.elevenlabs_help')}</p>
            </div>
            {IS_SUNO_ENABLED && (
              <>
                <div className="w-full h-px bg-slate-700/50"></div>
                <div>
                  <label htmlFor="sunoKey" className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2"><Music className="w-4 h-4 text-pink-400" />{t('settings.suno_label')}</label>
                  <input id="sunoKey" name="sunoKey" type="password" value={sunoKey} onChange={(e) => setSunoKey(e.target.value)} placeholder="Key from Suno API (sunoapi.org)..." className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                  <p className="text-xs text-slate-500 mt-2">{t('settings.suno_help')}</p>
                </div>
              </>
            )}

            <div className="w-full h-px bg-slate-700/50"></div>
            <div>
              <label htmlFor="groqKey" className="block text-sm font-medium text-slate-300 mb-2">{t('settings.groq_label')}</label>
              <input id="groqKey" name="groqKey" type="password" value={groqKey} onChange={(e) => setGroqKey(e.target.value)} placeholder="gsk_..." className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              <p className="text-xs text-slate-500 mt-2">{t('settings.groq_help')}</p>
            </div>
            <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mt-8"><ShieldAlert className="w-5 h-5 text-yellow-500 flex-shrink-0" /><p className="text-sm text-yellow-200/80">{t('settings.security_note')}</p></div>
            <div className="flex justify-end pt-4">
              <button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-wait text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
export default SettingsScreen;
