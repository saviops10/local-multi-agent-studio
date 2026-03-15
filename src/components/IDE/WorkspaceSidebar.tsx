import React from 'react';
import { FileText, FileCode, Download, Plus, Bot } from 'lucide-react';
import { Workspace, Agent } from '../../types';

interface WorkspaceSidebarProps {
  workspace: Workspace;
  allAgents: Agent[];
  onAddContext: () => void;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({ workspace, allAgents, onAddContext }) => {
  const generatedFiles = workspace.files?.filter(f => f.category === 'generated') || [];
  const contextFiles = workspace.files?.filter(f => f.category === 'context') || [];
  const workspaceAgents = allAgents.filter(a => workspace.agent_ids?.includes(a.id));

  return (
    <div className="w-80 border-l border-zinc-800 bg-[#0A0A0A] hidden lg:flex flex-col">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#0F0F0F]">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Workspace Context</span>
        </div>
        <button 
          onClick={onAddContext}
          className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded transition-colors"
          title="Add Context File"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* Workspace Files (Generated) */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Workspace Files</h4>
          <div className="space-y-2">
            {generatedFiles.map(file => (
              <div key={file.id} className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl group hover:border-zinc-700 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 group-hover:text-emerald-500 transition-colors">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-zinc-300 truncate">{file.name}</div>
                    <div className="text-[10px] text-zinc-600 uppercase">GENERATED</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={`/api/files/download/${file.name}`} download className="p-1.5 text-zinc-500 hover:text-emerald-500 transition-colors">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
            {generatedFiles.length === 0 && (
              <p className="text-[10px] text-zinc-700 italic text-center py-2">No files generated yet.</p>
            )}
          </div>
        </div>

        {/* Workspace Context (Imported) */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Workspace Context</h4>
          <div className="space-y-2">
            {contextFiles.map(file => (
              <div key={file.id} className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl group hover:border-zinc-700 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 group-hover:text-emerald-500 transition-colors">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-zinc-300 truncate">{file.name}</div>
                    <div className="text-[10px] text-zinc-600 uppercase">{file.type.split('/')[1] || 'FILE'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={`/api/files/download/${file.name}`} download className="p-1.5 text-zinc-500 hover:text-emerald-500 transition-colors">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
            {contextFiles.length === 0 && (
              <p className="text-[10px] text-zinc-700 italic text-center py-2">No context files uploaded.</p>
            )}
          </div>
        </div>

        {/* Active Agents */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Active Agents</h4>
          <div className="space-y-2">
            {workspaceAgents.map(agent => (
              <div key={agent.id} className="flex items-center gap-3 p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
                <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-emerald-500">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-zinc-300 truncate">{agent.name}</div>
                  <div className="text-[10px] text-zinc-600 uppercase">{agent.model}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
