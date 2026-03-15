import React from 'react';
import { LayoutDashboard, ChevronRight, Trash2 } from 'lucide-react';
import { Workspace } from '../../types';

interface WorkspaceCardProps {
  workspace: Workspace;
  onSelect: (workspace: Workspace) => void;
  onDelete: (id: string) => void;
}

export const WorkspaceCard: React.FC<WorkspaceCardProps> = ({ workspace, onSelect, onDelete }) => {
  return (
    <div 
      onClick={() => onSelect(workspace)}
      className="group bg-zinc-900 border border-zinc-800 p-5 rounded-2xl hover:border-emerald-500/50 transition-all cursor-pointer relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
          <LayoutDashboard className="w-6 h-6" />
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(workspace.id); }}
          className="p-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <h3 className="text-sm font-bold text-zinc-100 mb-1 group-hover:text-emerald-400 transition-colors">{workspace.name}</h3>
      <p className="text-xs text-zinc-500 line-clamp-2 mb-4 leading-relaxed">{workspace.description}</p>
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
        <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">Active Workspace</span>
        <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
};
