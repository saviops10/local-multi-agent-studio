import React, { useState, useEffect } from 'react';
import { Plus, Trash2, LayoutDashboard, Code, Search, X, Users, Check, Settings, ToggleLeft, ToggleRight, Bot } from 'lucide-react';
import { Workspace, Agent } from '../../types';
import { motion } from 'motion/react';

interface WorkspacesViewProps {
  workspaces: Workspace[];
  agents: Agent[];
  onOpenWorkspace: (ws: Workspace, mode: 'ide' | 'project') => void;
  onWorkspaceUpdate: () => void;
}

export const WorkspacesView: React.FC<WorkspacesViewProps> = ({ workspaces, agents, onOpenWorkspace, onWorkspaceUpdate }) => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState<Workspace | null>(null);
  const [newWs, setNewWs] = useState({ name: '', description: '', objective: '', agent_ids: [] as string[] });

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workspace? This will also remove all physical files.')) return;
    await fetch(`/api/workspaces/${id}`, { method: 'DELETE' });
    onWorkspaceUpdate();
  };

  const handleToggleActive = async (ws: Workspace) => {
    await fetch(`/api/workspaces/${ws.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...ws, active: !ws.active })
    });
    onWorkspaceUpdate();
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSettingsModal) return;
    await fetch(`/api/workspaces/${showSettingsModal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(showSettingsModal)
    });
    setShowSettingsModal(null);
    onWorkspaceUpdate();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = Math.random().toString(36).substring(2, 11);
      
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newWs, id, active: true })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create workspace');
      }

      setShowModal(false);
      setNewWs({ name: '', description: '', objective: '', agent_ids: [] });
      onWorkspaceUpdate();
    } catch (error) {
      console.error('Error creating workspace:', error);
    }
  };

  const filteredWorkspaces = workspaces.filter(ws => 
    ws.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-[#050505] custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Workspaces</h1>
            <p className="text-zinc-500 text-sm mt-1">Select a workspace to start collaborating or create a new one.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="px-6 py-2.5 bg-emerald-500 text-black rounded-xl text-sm font-bold hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10"
          >
            <Plus className="w-4 h-4" /> New Workspace
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search workspaces..."
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-emerald-500 outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredWorkspaces.map(ws => (
            <div key={ws.id} className={`bg-zinc-900/40 border border-zinc-800 p-8 rounded-2xl hover:border-zinc-700 transition-all group relative ${!ws.active ? 'opacity-50 grayscale' : ''}`}>
              <div className="flex items-start justify-between mb-6">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                  <Users className="w-8 h-8" />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleToggleActive(ws)}
                      className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${ws.active ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}
                    >
                      {ws.active ? 'Active' : 'Inactive'}
                    </button>
                    <button 
                      onClick={() => setShowSettingsModal(ws)}
                      className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(ws.id)}
                      className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{ws.agent_ids?.length || 0} Agents</span>
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">{ws.name}</h3>
              <p className="text-sm text-zinc-500 mb-8">{ws.description}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  disabled={!ws.active}
                  onClick={() => onOpenWorkspace(ws, 'ide')}
                  className="flex flex-col items-center gap-3 p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-emerald-500/50 hover:bg-zinc-900 transition-all group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Code className="w-5 h-5 text-zinc-500 group-hover/btn:text-emerald-500" />
                  <div className="text-center">
                    <p className="text-xs font-bold text-white">IDE</p>
                    <p className="text-[10px] text-zinc-600">File Editor</p>
                  </div>
                </button>
                <button 
                  disabled={!ws.active}
                  onClick={() => onOpenWorkspace(ws, 'project')}
                  className="flex flex-col items-center gap-3 p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-emerald-500/50 hover:bg-zinc-900 transition-all group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LayoutDashboard className="w-5 h-5 text-zinc-500 group-hover/btn:text-emerald-500" />
                  <div className="text-center">
                    <p className="text-xs font-bold text-white">Project</p>
                    <p className="text-[10px] text-zinc-600">Chat-first</p>
                  </div>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0F0F0F] border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-8 border-b border-zinc-800/50 relative">
              <h2 className="text-2xl font-bold text-white tracking-tight">Create Workspace</h2>
              <p className="text-zinc-500 text-sm mt-1">Set up a collaborative workspace for your agents.</p>
              <button 
                onClick={() => setShowModal(false)} 
                className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Workspace Name</label>
                <input 
                  required
                  value={newWs.name} 
                  onChange={e => setNewWs({...newWs, name: e.target.value})} 
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all" 
                  placeholder="My Project"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Description</label>
                <textarea 
                  value={newWs.description} 
                  onChange={e => setNewWs({...newWs, description: e.target.value})} 
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all h-20 resize-none" 
                  placeholder="Brief description"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Objective</label>
                <textarea 
                  value={newWs.objective} 
                  onChange={e => setNewWs({...newWs, objective: e.target.value})} 
                  className="w-full bg-zinc-900/50 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all h-24 resize-none" 
                  placeholder="Main goal of this workspace"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Objective</label>
                <textarea 
                  value={showSettingsModal.objective} 
                  onChange={e => setShowSettingsModal({...showSettingsModal, objective: e.target.value})} 
                  className="w-full bg-zinc-900/50 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all h-24 resize-none" 
                  placeholder="Main goal of this workspace"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Assign Agents</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {agents.map(agent => (
                    <div 
                      key={agent.id}
                      onClick={() => {
                        if (newWs.agent_ids.includes(agent.id)) {
                          setNewWs({...newWs, agent_ids: newWs.agent_ids.filter(id => id !== agent.id)});
                        } else {
                          setNewWs({...newWs, agent_ids: [...newWs.agent_ids, agent.id]});
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        newWs.agent_ids.includes(agent.id) 
                        ? 'bg-emerald-500/10 border-emerald-500/50' 
                        : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                          newWs.agent_ids.includes(agent.id) ? 'bg-emerald-500 text-black' : 'bg-zinc-800 border border-zinc-700'
                        }`}>
                          {newWs.agent_ids.includes(agent.id) && <Check className="w-3 h-3" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white uppercase tracking-widest">{agent.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">{agent.model}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-4 bg-emerald-500 text-black rounded-2xl text-sm font-bold hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 mt-4"
              >
                <Plus className="w-4 h-4" /> Create Workspace
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0F0F0F] border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-8 border-b border-zinc-800/50 relative">
              <h2 className="text-2xl font-bold text-white tracking-tight">Workspace Settings</h2>
              <p className="text-zinc-500 text-sm mt-1">Update workspace details and agents.</p>
              <button 
                onClick={() => setShowSettingsModal(null)} 
                className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSettings} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Workspace Name</label>
                <input 
                  required
                  value={showSettingsModal.name} 
                  onChange={e => setShowSettingsModal({...showSettingsModal, name: e.target.value})} 
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Description</label>
                <textarea 
                  value={showSettingsModal.description} 
                  onChange={e => setShowSettingsModal({...showSettingsModal, description: e.target.value})} 
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all h-20 resize-none" 
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Assign Agents</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {agents.map(agent => (
                    <div 
                      key={agent.id}
                      onClick={() => {
                        const currentIds = showSettingsModal.agent_ids || [];
                        if (currentIds.includes(agent.id)) {
                          setShowSettingsModal({...showSettingsModal, agent_ids: currentIds.filter(id => id !== agent.id)});
                        } else {
                          setShowSettingsModal({...showSettingsModal, agent_ids: [...currentIds, agent.id]});
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        (showSettingsModal.agent_ids || []).includes(agent.id) 
                        ? 'bg-emerald-500/10 border-emerald-500/50' 
                        : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                          (showSettingsModal.agent_ids || []).includes(agent.id) ? 'bg-emerald-500 text-black' : 'bg-zinc-800 border border-zinc-700'
                        }`}>
                          {(showSettingsModal.agent_ids || []).includes(agent.id) && <Check className="w-3 h-3" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white uppercase tracking-widest">{agent.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">{agent.model}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-4 bg-emerald-500 text-black rounded-2xl text-sm font-bold hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 mt-4"
              >
                Save Changes
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
