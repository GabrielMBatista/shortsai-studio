
import React, { useState, useEffect } from 'react';
import { User, ApiKeys, IS_SUNO_ENABLED } from '../types';
import { Save, Key, User as UserIcon, ShieldAlert, Music, Loader2 } from 'lucide-react';
import { updateUserApiKeys } from '../services/storageService';

interface SettingsScreenProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ user, onUpdateUser }) => {
  const [geminiKey, setGeminiKey] = useState('');
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [sunoKey, setSunoKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
        setMessage({ text: "Settings saved successfully (Synced to Cloud)", type: 'success' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ text: "Failed to save settings.", type: 'error' });
      }
    } catch (err) {
      setMessage({ text: "Failed to save settings.", type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-8">
      <div className="flex items-center justify-between mb-8"><h1 className="text-3xl font-bold text-white flex items-center gap-3"><UserIcon className="w-8 h-8 text-indigo-400" />User Settings</h1></div>
      <div className="grid gap-8">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
          <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full border-2 border-indigo-500" />
          <div className="text-center md:text-left flex-1"><h2 className="text-xl font-bold text-white">{user.name}</h2><p className="text-slate-400">{user.email}</p><span className="inline-block mt-2 px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded border border-indigo-500/30">Pro Plan</span></div>
        </div>
        <form onSubmit={handleSave} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2"><Key className="w-5 h-5 text-indigo-400" />API Configuration</h3>
          {message && <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30' : 'bg-red-500/20 text-red-200 border border-red-500/30'}`}>{message.text}</div>}
          <div className="space-y-6">

            <div>
              <label htmlFor="geminiKey" className="block text-sm font-medium text-slate-300 mb-2">Google Gemini API Key (Required)</label>
              <input id="geminiKey" name="geminiKey" type="password" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="AIzaSy..." className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              <p className="text-xs text-slate-500 mt-2">Get your key from <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-indigo-400 hover:underline">Google AI Studio</a>.</p>
            </div>

            <div>
              <label htmlFor="elevenLabsKey" className="block text-sm font-medium text-slate-300 mb-2">ElevenLabs API Key (Optional)</label>
              <input id="elevenLabsKey" name="elevenLabsKey" type="password" value={elevenLabsKey} onChange={(e) => setElevenLabsKey(e.target.value)} placeholder="sk_..." className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              <p className="text-xs text-slate-500 mt-2">Used for ultra-realistic voice cloning.</p>
            </div>
            {IS_SUNO_ENABLED && (
              <>
                <div className="w-full h-px bg-slate-700/50"></div>
                <div>
                  <label htmlFor="sunoKey" className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2"><Music className="w-4 h-4 text-pink-400" />Suno API Key (Optional)</label>
                  <input id="sunoKey" name="sunoKey" type="password" value={sunoKey} onChange={(e) => setSunoKey(e.target.value)} placeholder="Key from Suno API (sunoapi.org)..." className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                  <p className="text-xs text-slate-500 mt-2">Uses <a href="https://sunoapi.org" target="_blank" className="text-indigo-400 hover:underline">SunoAPI.org</a> structure.</p>
                </div>
              </>
            )}

            <div className="w-full h-px bg-slate-700/50"></div>
            <div>
              <label htmlFor="groqKey" className="block text-sm font-medium text-slate-300 mb-2">Groq API Key (Optional)</label>
              <input id="groqKey" name="groqKey" type="password" value={groqKey} onChange={(e) => setGroqKey(e.target.value)} placeholder="gsk_..." className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
              <p className="text-xs text-slate-500 mt-2">Used for fast TTS via PlayAI models.</p>
            </div>
            <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mt-8"><ShieldAlert className="w-5 h-5 text-yellow-500 flex-shrink-0" /><p className="text-sm text-yellow-200/80">Keys are encrypted client-side and stored securely. They are only decrypted for API calls.</p></div>
            <div className="flex justify-end pt-4">
              <button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-wait text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsScreen;
