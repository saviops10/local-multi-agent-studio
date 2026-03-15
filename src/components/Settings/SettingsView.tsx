import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Shield, Globe, Cpu, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<any[]>([]);
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setSettings(data);
        const initial: Record<string, string> = {};
        data.forEach((s: any) => {
          initial[s.key] = s.value;
        });
        setLocalSettings(initial);
      });
  }, []);

  const handleSave = async (key: string) => {
    setSaving(key);
    const value = localSettings[key] || '';
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
    setSaving(null);
    
    if (res.ok) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }

    // Refresh to get masked values
    const r = await fetch('/api/settings');
    const data = await r.json();
    setSettings(data);
  };

  const getSetting = (key: string) => localSettings[key] || '';
  const getEnvStatus = (key: string) => settings.find(s => s.key === key)?.value === 'Configured';

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-[#050505] custom-scrollbar relative">
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-12 right-12 bg-emerald-500 text-black px-6 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-3 z-50"
          >
            <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
            Configurações Salvas!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto w-full space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Governance & Security</h1>
            <p className="text-zinc-500 text-sm mt-1">Manage global rules and environment security protocols.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* General Rules */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg font-bold text-white">System Rules</h2>
              </div>
              <button 
                onClick={() => handleSave('global_rules_prompt')}
                disabled={saving === 'global_rules_prompt'}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-black rounded-xl text-xs font-bold hover:bg-emerald-400 transition-all disabled:opacity-50"
              >
                <Save className="w-3 h-3" />
                {saving === 'global_rules_prompt' ? 'Saving...' : 'Save Rules'}
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Global Rules Prompt</label>
                <p className="text-[10px] text-zinc-600 mb-2">These rules will be applied across all workspaces and agents.</p>
                <textarea 
                  value={getSetting('global_rules_prompt')}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, global_rules_prompt: e.target.value }))}
                  placeholder="e.g. Always respond in Portuguese..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all h-48 resize-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* API Keys Governance */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/5">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-white">Cloud Authentication (Environment)</h2>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2 font-medium">As chaves de API são gerenciadas exclusivamente via variáveis de ambiente (.env) para máxima segurança.</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gemini Status */}
              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Gemini API</h3>
                  <div className="flex items-center gap-2">
                    {getEnvStatus('env_gemini_key') ? (
                      <div className="flex items-center gap-1.5 text-emerald-500">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-[10px] font-bold">CONECTADO (.env)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-zinc-600">
                        <XCircle className="w-4 h-4" />
                        <span className="text-[10px] font-bold">DESCONECTADO</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${getEnvStatus('env_gemini_key') ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-800'}`} />
              </div>

              {/* Groq Status */}
              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Groq API</h3>
                  <div className="flex items-center gap-2">
                    {getEnvStatus('env_groq_key') ? (
                      <div className="flex items-center gap-1.5 text-emerald-500">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-[10px] font-bold">CONECTADO (.env)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-zinc-600">
                        <XCircle className="w-4 h-4" />
                        <span className="text-[10px] font-bold">DESCONECTADO</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${getEnvStatus('env_groq_key') ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-800'}`} />
              </div>
            </div>
            <div className="px-6 pb-6">
              <div className="p-4 bg-zinc-900/40 rounded-xl border border-dashed border-zinc-800">
                <p className="text-[10px] text-zinc-500 leading-relaxed text-center italic">
                  Para ativar modelos Cloud, adicione <code className="text-zinc-300">GEMINI_API_KEY</code> ou <code className="text-zinc-300">GROQ_API_KEY</code> ao seu arquivo <code className="text-zinc-300">.env</code> na raiz do projeto.
                </p>
              </div>
            </div>
          </div>

          {/* Ollama Configuration */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cpu className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-white">Local Engine (Ollama)</h2>
              </div>
              <button 
                onClick={() => handleSave('ollama_url')}
                disabled={saving === 'ollama_url'}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-xl text-xs font-bold hover:bg-zinc-700 transition-all disabled:opacity-50"
              >
                <Save className="w-3 h-3" />
                {saving === 'ollama_url' ? 'Saving...' : 'Save URL'}
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Ollama Base URL</label>
                <input 
                  value={getSetting('ollama_url')}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, ollama_url: e.target.value }))}
                  placeholder="http://localhost:11434"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
