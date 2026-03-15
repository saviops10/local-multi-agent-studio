import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Bot, LayoutDashboard, Code, Activity, Search, Settings, FileCode, ChevronRight } from 'lucide-react';
import { Agent, Workspace } from '../../types';
import { UsageMonitor } from './UsageMonitor';

interface DashboardProps {
  workspaces: Workspace[];
  agents: Agent[];
  onSelectWorkspace: (ws: Workspace, mode: 'ide' | 'project') => void;
  onSelectView: (view: 'dashboard' | 'agents' | 'workspaces' | 'ide' | 'project' | 'settings') => void;
  onUpdate: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ workspaces, agents, onSelectWorkspace, onSelectView, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  
  // Modal States
  const [showWsModal, setShowWsModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  
  // Form States
  const [newWs, setNewWs] = useState({ name: '', description: '', objective: '' });
  const [newAgent, setNewAgent] = useState({ name: '', description: '', model: 'llama3', system_prompt: 'You are a helpful assistant.', temperature: 0.7 });
  const [localModels, setLocalModels] = useState<any[]>([]);

  const fetchModels = async () => {
    try {
      const modRes = await fetch('/api/models/local');
      setLocalModels(await modRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWs.name) return;
    await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWs)
    });
    setShowWsModal(false);
    setNewWs({ name: '', description: '', objective: '' });
    onUpdate();
  };

  const handleCreateAgent = async () => {
    if (!newAgent.name) return;
    await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAgent)
    });
    setShowAgentModal(false);
    setNewAgent({ name: '', description: '', model: 'llama3', system_prompt: 'You are a helpful assistant.', temperature: 0.7 });
    onUpdate();
  };

  useEffect(() => {
    fetchModels();
  }, []);

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-[#050505] custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full space-y-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">System Overview</h1>
            <p className="text-zinc-500 text-sm mt-1">Manage your local multi-agent environment.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowAgentModal(true)}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium hover:bg-zinc-800 transition-all flex items-center gap-2"
            >
              <Plus className="w-3 h-3" /> New Agent
            </button>
            <button className="px-4 py-2 bg-emerald-500 text-black rounded-lg text-xs font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10">
              System Health
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Agents', value: agents.length, icon: Bot, color: 'text-emerald-500' },
            { label: 'Workspaces', value: workspaces.length, icon: LayoutDashboard, color: 'text-blue-500' },
            { label: 'System Status', value: 'Online', icon: Activity, color: 'text-amber-500' }
          ].map((stat, i) => (
            <div key={i} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl hover:border-zinc-700 transition-all group">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl bg-zinc-900 border border-zinc-800 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-2xl font-bold text-white">{stat.value}</span>
              </div>
              <div className="mt-4">
                <p className="text-zinc-400 font-medium">{stat.label}</p>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1">Configured and ready</p>
              </div>
            </div>
          ))}
        </div>

        {/* AI Consumption Monitor */}
        <UsageMonitor />

        {/* Recent Workspaces */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Recent Workspaces</h2>
            <button 
              onClick={() => setShowWsModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-black rounded-lg text-xs font-bold hover:bg-emerald-400 transition-all"
            >
              <Plus className="w-4 h-4" /> New Workspace
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workspaces.map(ws => (
              <div 
                key={ws.id}
                onClick={() => onSelectWorkspace(ws, 'ide')}
                className="bg-zinc-900/30 border border-zinc-800 p-5 rounded-xl hover:border-emerald-500/50 cursor-pointer transition-all group flex items-center justify-between"
              >
                <div>
                  <h3 className="text-emerald-500 font-bold group-hover:text-emerald-400 transition-colors">{ws.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1">{ws.description}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onSelectWorkspace(ws, 'ide'); }}
                    className="px-3 py-1 bg-zinc-800 rounded-lg text-[10px] font-bold uppercase hover:bg-emerald-500 hover:text-black transition-all"
                  >
                    IDE
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onSelectWorkspace(ws, 'project'); }}
                    className="px-3 py-1 bg-zinc-800 rounded-lg text-[10px] font-bold uppercase hover:bg-emerald-500 hover:text-black transition-all"
                  >
                    Project
                  </button>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-emerald-500 transition-all" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showWsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-white">Create Workspace</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Name</label>
                <input value={newWs.name} onChange={e => setNewWs({...newWs, name: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none" placeholder="Workspace name" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Description</label>
                <input value={newWs.description} onChange={e => setNewWs({...newWs, description: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none" placeholder="Workspace description" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowWsModal(false)} className="flex-1 py-2 bg-zinc-800 rounded-lg text-xs font-bold">Cancel</button>
              <button onClick={handleCreateWorkspace} className="flex-1 py-2 bg-emerald-500 text-black rounded-lg text-xs font-bold">Create</button>
            </div>
          </div>
        </div>
      )}

      {showAgentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-white">Create Agent</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Name</label>
                <input value={newAgent.name} onChange={e => setNewAgent({...newAgent, name: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none" placeholder="Code Reviewer" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Model (Detected in .ollama/models)</label>
                <select 
                  value={newAgent.model} 
                  onChange={e => setNewAgent({...newAgent, model: e.target.value})} 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                >
                  <optgroup label="Local Models (Ollama)">
                    {localModels.length > 0 ? (
                      localModels.map(m => (
                        <option key={m.name} value={m.name}>{m.name} ({(m.size / 1024 / 1024 / 1024).toFixed(2)} GB)</option>
                      ))
                    ) : (
                      <option disabled>No local models found</option>
                    )}
                  </optgroup>
                  <optgroup label="Cloud Models (Requires API Key)">
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="llama3-8b-8192">GROQ: Llama3 8B</option>
                    <option value="llama3-70b-8192">GROQ: Llama3 70B</option>
                    <option value="mixtral-8x7b-32768">GROQ: Mixtral 8x7B</option>
                  </optgroup>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500">System Prompt</label>
                <textarea value={newAgent.system_prompt} onChange={e => setNewAgent({...newAgent, system_prompt: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none h-24 resize-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAgentModal(false)} className="flex-1 py-2 bg-zinc-800 rounded-lg text-xs font-bold">Cancel</button>
              <button onClick={handleCreateAgent} className="flex-1 py-2 bg-emerald-500 text-black rounded-lg text-xs font-bold">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

