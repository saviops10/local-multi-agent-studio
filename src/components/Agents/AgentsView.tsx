import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Bot, Search, X, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Agent } from '../../types';

interface AgentsViewProps {
  agents: Agent[];
  onAgentUpdate: () => void;
}

export const AgentsView: React.FC<AgentsViewProps> = ({ agents, onAgentUpdate }) => {
  const [search, setSearch] = useState('');
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [localModels, setLocalModels] = useState<any[]>([]);

  const fetchModels = async () => {
    const res = await fetch('/api/models/local');
    setLocalModels(await res.json());
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    await fetch(`/api/agents/${id}`, { method: 'DELETE' });
    onAgentUpdate();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;

    try {
      const method = editingAgent.id ? 'PUT' : 'POST';
      const url = editingAgent.id ? `/api/agents/${editingAgent.id}` : '/api/agents';

      console.log(`Saving agent: ${method} ${url}`, editingAgent);

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAgent)
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to save agent');
        } else {
          const text = await res.text();
          console.error('Server returned non-JSON error:', text);
          throw new Error(`Server error (${res.status}): ${res.statusText}`);
        }
      }

      setShowModal(false);
      setEditingAgent(null);
      onAgentUpdate();
    } catch (error) {
      console.error('Error saving agent:', error);
      alert('Error saving agent: ' + (error as Error).message);
    }
  };

  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.model.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-[#050505] custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Agent Management</h1>
            <p className="text-zinc-500 text-sm mt-1">Create and configure your AI workforce.</p>
          </div>
          <button 
            onClick={() => {
              const defaultModel = 'gemini-1.5-flash';
              const isCloud = !localModels.some(m => m.name === defaultModel);
              setEditingAgent({ 
                id: '', 
                name: '', 
                description: '', 
                model: defaultModel, 
                system_prompt: '', 
                temperature: 0.7,
                top_p: 1.0,
                max_tokens: 2048,
                is_cloud: isCloud
              });
              setShowModal(true);
            }}
            className="px-6 py-2.5 bg-emerald-500 text-black rounded-xl text-sm font-bold hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10"
          >
            <Sparkles className="w-4 h-4" /> Create Agent
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search agents by name or model..."
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map(agent => (
            <div key={agent.id} className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl hover:border-zinc-700 transition-all group relative">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-500">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => {
                      setEditingAgent(agent);
                      setShowModal(true);
                    }}
                    className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(agent.id)}
                    className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-white">{agent.name}</h3>
              <p className="text-xs text-zinc-500 mt-1 line-clamp-2 h-8">{agent.description}</p>
              
              <div className="mt-6 pt-6 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                  {agent.model}
                </span>
                <button 
                  onClick={() => {
                    setEditingAgent(agent);
                    setShowModal(true);
                  }}
                  className="text-xs font-bold text-emerald-500 hover:text-emerald-400"
                >
                  Edit Config
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && editingAgent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0F0F0F] border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-8 border-b border-zinc-800/50 relative">
              <h2 className="text-2xl font-bold text-white tracking-tight">Create New Agent</h2>
              <p className="text-zinc-500 text-sm mt-1">Configure your AI agent's behavior and capabilities.</p>
              <button 
                onClick={() => setShowModal(false)} 
                className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Agent Name</label>
                <input 
                  required
                  placeholder="e.g. CodeMaster"
                  value={editingAgent.name} 
                  onChange={e => setEditingAgent({...editingAgent, name: e.target.value})} 
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Description</label>
                <textarea 
                  placeholder="Specialized in..."
                  value={editingAgent.description} 
                  onChange={e => setEditingAgent({...editingAgent, description: e.target.value})} 
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all h-24 resize-none" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Model</label>
                <select 
                  value={editingAgent.model} 
                  onChange={e => {
                    const model = e.target.value;
                    const isCloud = !localModels.some(m => m.name === model);
                    setEditingAgent({...editingAgent, model, is_cloud: isCloud});
                  }} 
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <optgroup label="Local Models (Ollama)" className="bg-zinc-900 text-white">
                    {localModels.map(m => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Cloud Models" className="bg-zinc-900 text-white">
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="gpt-oss:20b-cloud">gpt-oss:20b-cloud</option>
                    <option value="qwen3-coder:480b-cloud">qwen3-coder:480b-cloud</option>
                  </optgroup>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">System Prompt</label>
                <textarea 
                  placeholder="You are a..."
                  value={editingAgent.system_prompt} 
                  onChange={e => setEditingAgent({...editingAgent, system_prompt: e.target.value})} 
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all h-32 resize-none" 
                />
              </div>

              {/* Removidos campos de configuração avançada conforme solicitado pelo time de testes */}

              <button 
                type="submit" 
                className="w-full py-4 bg-emerald-500 text-black rounded-2xl text-sm font-bold hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 mt-4"
              >
                <Sparkles className="w-4 h-4" /> {editingAgent.id ? 'Update Agent' : 'Create Agent'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
