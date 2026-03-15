import React from 'react';
import { 
  LayoutDashboard, 
  Bot, 
  Users, 
  Code, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Activity
} from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  activeView: string;
  onViewChange: (view: any) => void;
  workspaces: any[];
  onSelectWorkspace: (ws: any) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  expanded, 
  setExpanded, 
  activeView, 
  onViewChange,
  workspaces,
  onSelectWorkspace
}) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'agents', icon: Bot, label: 'Agents' },
    { id: 'workspaces', icon: Users, label: 'Workspaces' },
    { id: 'ide', icon: Code, label: 'IDE' },
    { id: 'project', icon: LayoutDashboard, label: 'Project' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <motion.div 
      animate={{ width: expanded ? 240 : 64 }}
      className="h-full bg-[#0A0A0A] border-r border-zinc-800 flex flex-col relative transition-all"
    >
      {/* Toggle Button */}
      <button 
        onClick={() => setExpanded(!expanded)}
        className="absolute -right-3 top-12 w-6 h-6 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-500 hover:text-white z-50"
      >
        {expanded ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* Logo Area */}
      <div className="h-16 flex items-center px-4 gap-3 overflow-hidden">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
          <Activity className="w-5 h-5 text-black" />
        </div>
        {expanded && <span className="font-bold text-white tracking-tight truncate">AI Studio</span>}
      </div>

      {/* Main Menu */}
      <div className="flex-1 py-4 px-2 space-y-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <div
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`
              flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all group
              ${activeView === item.id ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}
            `}
          >
            <item.icon className={`w-5 h-5 shrink-0 ${activeView === item.id ? 'text-emerald-500' : 'group-hover:text-emerald-400'}`} />
            {expanded && <span className="text-sm font-medium">{item.label}</span>}
          </div>
        ))}

        {/* Project Workspaces Section */}
        {expanded && workspaces.length > 0 && (
          <div className="mt-8 pt-4 border-t border-zinc-900">
            <p className="px-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4">Project Workspaces</p>
            <div className="space-y-1">
              {workspaces.map((ws) => (
                <div
                  key={ws.id}
                  onClick={() => onSelectWorkspace(ws)}
                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 group"
                >
                  <ChevronRight className="w-3 h-3 group-hover:text-emerald-500" />
                  <span className="text-xs truncate">{ws.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User / Settings */}
      <div className="p-2 border-t border-zinc-900">
        <div className={`flex items-center gap-3 p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50 cursor-pointer hover:bg-zinc-900 transition-all ${!expanded && 'justify-center'}`}>
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
            S
          </div>
          {expanded && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">Local User</p>
              <p className="text-[10px] text-zinc-600 uppercase">Offline Mode</p>
            </div>
          )}
          {expanded && <Settings className="w-4 h-4 text-zinc-600 hover:text-zinc-400" />}
        </div>
      </div>
    </motion.div>
  );
};
