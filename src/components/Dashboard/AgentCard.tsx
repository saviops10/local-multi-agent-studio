import React from 'react';
import { Bot, Trash2 } from 'lucide-react';
import { Agent } from '../../types';

interface AgentCardProps {
  agent: Agent;
  onDelete: (id: string) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onDelete }) => {
  return (
    <div className="group bg-zinc-900 border border-zinc-800 p-5 rounded-2xl hover:border-emerald-500/50 transition-all relative overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
          <Bot className="w-6 h-6" />
        </div>
        <button 
          onClick={() => onDelete(agent.id)}
          className="p-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <h3 className="text-sm font-bold text-zinc-100 mb-1">{agent.name}</h3>
      <p className="text-[10px] text-emerald-500 uppercase font-bold tracking-widest mb-2">{agent.model}</p>
      <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed">{agent.description}</p>
    </div>
  );
};
