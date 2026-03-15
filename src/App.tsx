import React, { useState, useEffect } from 'react';
import { 
  Users, 
  LayoutDashboard, 
  Plus, 
  Terminal as TerminalIcon,
  Code,
  Search,
  Settings,
  X,
  Bot,
  Activity,
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Components
import { Explorer } from './components/IDE/Explorer';
import { IDEEditor } from './components/IDE/Editor';
import { Terminal } from './components/IDE/Terminal';
import { Copilot } from './components/IDE/Copilot';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Sidebar } from './components/Sidebar/Sidebar';
import { AgentsView } from './components/Agents/AgentsView';
import { WorkspacesView } from './components/Workspaces/WorkspacesView';
import { ProjectView } from './components/Project/ProjectView';
import { SettingsView } from './components/Settings/SettingsView';
import { Agent, Workspace, LocalFile, Message } from './types';
import { GoogleGenAI } from "@google/genai";
import { io } from 'socket.io-client';

export default function App() {
  const [view, setView] = useState<'dashboard' | 'agents' | 'workspaces' | 'ide' | 'project' | 'settings'>('dashboard');
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<{ path: string; content: string; name: string } | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [streamingMessage, setStreamingMessage] = useState<{ sender_id: string; content: string } | null>(null);

  // IDE Panel Sizes
  const [explorerWidth, setExplorerWidth] = useState(260);
  const [chatWidth, setChatWidth] = useState(320);
  const [logs, setLogs] = useState<{ time: string; level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR'; message: string }[]>([
    { time: new Date().toLocaleTimeString(), level: 'INFO', message: 'Plataforma iniciada com sucesso. Aguardando comandos...' },
    { time: new Date().toLocaleTimeString(), level: 'DEBUG', message: 'Ollama conectado em http://localhost:11434' },
    { time: new Date().toLocaleTimeString(), level: 'WARN', message: 'Nenhuma GEMINI_API_KEY detectada. Modelos Cloud desativados.' }
  ]);

  const addLog = (level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR', message: string) => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), level, message }].slice(-50));
  };

  const fetchData = async () => {
    const [agRes, wsRes] = await Promise.all([
      fetch('/api/agents'),
      fetch('/api/workspaces')
    ]);
    setAgents(await agRes.json());
    setWorkspaces(await wsRes.json());
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedWorkspace) return;

    const socket = io({
      query: { workspaceId: selectedWorkspace.id }
    });

    socket.on('agent_chat_chunk', (data: { agentId: string; chunk: string }) => {
      setStreamingMessage(prev => {
        if (!prev) return { sender_id: data.agentId, content: data.chunk };
        if (prev.sender_id !== data.agentId) return { sender_id: data.agentId, content: data.chunk };
        return { ...prev, content: prev.content + data.chunk };
      });
    });

    socket.on('message_added', (msg: Message) => {
      setSelectedWorkspace(prev => {
        if (!prev || prev.id !== msg.workspace_id) return prev;
        
        // Remove optimistic user message or streaming placeholder if it matches
        const filtered = prev.messages.filter(m => m.id !== msg.id && !(m.role === 'user' && m.content === msg.content && m.sender_id === 'user'));
        
        return {
          ...prev,
          messages: [...filtered, msg]
        };
      });
      
      // Clear streaming if this message belongs to the current streaming agent
      setStreamingMessage(prev => {
        if (prev?.sender_id === msg.sender_id) return null;
        return prev;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedWorkspace?.id]);

  const handleSelectWorkspace = async (ws: Workspace, mode: 'ide' | 'project' = 'ide') => {
    setActiveFile(null);
    setActiveFilePath(null);
    const res = await fetch(`/api/workspaces/${ws.id}`);
    const fullWs = await res.json();
    setSelectedWorkspace(fullWs);
    setView(mode);
  };

  const handleFileSelect = async (path: string) => {
    if (!selectedWorkspace) return;
    
    // Normalize path just in case
    const normalizedPath = path.replace(/\\/g, '/');
    setActiveFilePath(normalizedPath);
    
    try {
      const res = await fetch(`/api/files/content?workspaceId=${selectedWorkspace.id}&path=${encodeURIComponent(normalizedPath)}`);
      if (!res.ok) throw new Error('Failed to load file');
      
      const data = await res.json();
      setActiveFile({
        path: normalizedPath,
        content: data.content,
        name: normalizedPath.split('/').pop() || ''
      });
    } catch (err) {
      console.error(err);
      addLog('ERROR', `Failed to load file: ${normalizedPath}`);
      setActiveFile(null);
    }
  };

  const handleSave = async () => {
    if (!activeFile || !selectedWorkspace) return;
    try {
      await fetch('/api/files/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: selectedWorkspace.id,
          path: activeFile.path,
          content: activeFile.content
        })
      });
      addLog('INFO', `File saved: ${activeFile.name}`);
    } catch (e) {
      console.error('Failed to save file', e);
      addLog('ERROR', `Failed to save file: ${(e as Error).message}`);
    }
  };

  const handleSendMessage = async (content: string, agentId: string, mode: 'advisor' | 'agent') => {
    if (!selectedWorkspace) return;
    
    // Optimistic UI: Add user message immediately
    const userMsg: Message = {
      id: Math.random().toString(36).substring(2, 11),
      workspace_id: selectedWorkspace.id,
      sender_id: 'user',
      sender_name: 'User',
      content: content,
      role: 'user',
      created_at: new Date().toISOString()
    };

    setSelectedWorkspace(prev => prev ? {
      ...prev,
      messages: [...(prev.messages || []), userMsg]
    } : null);

    setIsThinking(true);
    setStreamingMessage(null);

    try {
      const res = await fetch(`/api/workspaces/${selectedWorkspace.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, agentId, mode })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send message');
      }

      // No longer adding agentMsg manually here, relying on message_added socket event
      // for real-time sequential updates.
      
      fetchData();
    } catch (e) {
      console.error(e);
      addLog('ERROR', `Chat error: ${(e as Error).message}`);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-emerald-500/30 overflow-hidden">
      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          expanded={isSidebarExpanded}
          setExpanded={setIsSidebarExpanded}
          activeView={view}
          onViewChange={setView}
          workspaces={workspaces}
          onSelectWorkspace={(ws) => handleSelectWorkspace(ws, 'ide')}
        />

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {view === 'dashboard' && <Dashboard workspaces={workspaces} agents={agents} onSelectWorkspace={handleSelectWorkspace} onSelectView={setView} onUpdate={fetchData} />}
          {view === 'agents' && <AgentsView agents={agents} onAgentUpdate={fetchData} />}
          {view === 'workspaces' && <WorkspacesView workspaces={workspaces} agents={agents} onOpenWorkspace={handleSelectWorkspace} onWorkspaceUpdate={fetchData} />}
          {view === 'settings' && <SettingsView />}
          
          {(view === 'project' || view === 'ide') && !selectedWorkspace && (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#050505] text-zinc-500 space-y-4">
              <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800">
                <LayoutDashboard className="w-12 h-12 text-zinc-700 mb-4 mx-auto" />
                <h2 className="text-xl font-bold text-white text-center">Nenhum Workspace Selecionado</h2>
                <p className="text-sm text-zinc-500 text-center mt-2 max-w-xs">
                  Selecione um workspace na aba "Workspaces" ou no Dashboard para acessar o ambiente de {view === 'ide' ? 'IDE' : 'Projetos'}.
                </p>
                <button 
                  onClick={() => setView('workspaces')}
                  className="w-full mt-6 py-3 bg-emerald-500 text-black rounded-xl text-sm font-bold hover:bg-emerald-400 transition-all"
                >
                  Ir para Workspaces
                </button>
              </div>
            </div>
          )}

          {view === 'project' && selectedWorkspace && (
            <ProjectView 
              workspace={selectedWorkspace}
              agents={agents}
              onSendMessage={handleSendMessage}
              isThinking={isThinking}
              onWorkspaceUpdate={fetchData}
              streamingMessage={streamingMessage}
            />
          )}

          {view === 'ide' && selectedWorkspace && (
            <div className="flex-1 flex overflow-hidden">
              {/* Explorer */}
              <div style={{ width: explorerWidth }} className="border-r border-zinc-800 flex flex-col bg-[#0F0F0F] shrink-0 relative">
                <Explorer 
                  workspaceId={selectedWorkspace.id}
                  onFileSelect={handleFileSelect}
                  activeFilePath={activeFilePath}
                />
                {/* Resize Handle */}
                <div 
                  className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-emerald-500/30 transition-colors z-50"
                  onMouseDown={(e) => {
                    const startX = e.clientX;
                    const startWidth = explorerWidth;
                    const onMouseMove = (moveEvent: MouseEvent) => {
                      setExplorerWidth(Math.max(150, Math.min(500, startWidth + (moveEvent.clientX - startX))));
                    };
                    const onMouseUp = () => {
                      document.removeEventListener('mousemove', onMouseMove);
                      document.removeEventListener('mouseup', onMouseUp);
                    };
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                  }}
                />
              </div>

              {/* Editor + Terminal */}
              <div className="flex-1 flex flex-col min-w-0 bg-[#1E1E1E]">
                <div className="flex-1 flex flex-col min-h-0 relative">
                  <IDEEditor 
                    activeFile={activeFile}
                    onContentChange={(content) => setActiveFile(prev => prev ? { ...prev, content } : null)}
                    onSave={handleSave}
                    onClose={() => setActiveFile(null)}
                  />
                  
                  {/* Terminal Toggle Button (Floating) */}
                  <button 
                    onClick={() => setIsTerminalOpen(!isTerminalOpen)}
                    className={`absolute bottom-4 right-4 p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-emerald-500 transition-all z-40 ${isTerminalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    title="Open Terminal"
                  >
                    <TerminalIcon className="w-4 h-4" />
                  </button>
                </div>
                
                {isTerminalOpen && (
                  <div className="h-64 border-t border-zinc-800 bg-[#0A0A0A] flex flex-col relative">
                    <div className="flex items-center justify-between px-4 h-9 border-b border-zinc-800 bg-[#0F0F0F]">
                      <div className="flex items-center gap-4 h-full">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 border-b border-emerald-500 h-full flex items-center">Terminal</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 h-full flex items-center cursor-pointer hover:text-zinc-400">Output</span>
                      </div>
                      <button 
                        onClick={() => setIsTerminalOpen(false)}
                        className="p-1 text-zinc-600 hover:text-white transition-colors"
                        title="Minimize Terminal"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex-1 p-2 overflow-hidden">
                      <Terminal workspaceId={selectedWorkspace.id} />
                    </div>
                  </div>
                )}
              </div>

              {/* Copilot */}
              <div style={{ width: chatWidth }} className="border-l border-zinc-800 flex flex-col bg-[#0A0A0A] shrink-0 relative">
                {/* Resize Handle */}
                <div 
                  className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-emerald-500/30 transition-colors z-50"
                  onMouseDown={(e) => {
                    const startX = e.clientX;
                    const startWidth = chatWidth;
                    const onMouseMove = (moveEvent: MouseEvent) => {
                      setChatWidth(Math.max(250, Math.min(600, startWidth - (moveEvent.clientX - startX))));
                    };
                    const onMouseUp = () => {
                      document.removeEventListener('mousemove', onMouseMove);
                      document.removeEventListener('mouseup', onMouseUp);
                    };
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                  }}
                />
                <Copilot 
                  workspace={selectedWorkspace}
                  agents={agents}
                  onSendMessage={handleSendMessage}
                  isThinking={isThinking}
                  onWorkspaceUpdate={fetchData}
                  streamingMessage={streamingMessage}
                  onFileSelect={handleFileSelect}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. Log Footer (Diagnostics) */}
      <div className="h-24 bg-[#050505] border-t border-zinc-800 flex flex-col overflow-hidden shrink-0">
        <div className="flex items-center justify-between px-4 h-8 border-b border-zinc-800 bg-[#0A0A0A]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">System Logs & Diagnostics</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-zinc-600 font-bold uppercase">Live</span>
          </div>
        </div>
        <div className="flex-1 p-2 font-mono text-[10px] text-zinc-600 overflow-y-auto custom-scrollbar">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-zinc-800">[{log.time}]</span>
              <span className={
                log.level === 'INFO' ? 'text-emerald-500/50' :
                log.level === 'DEBUG' ? 'text-blue-500/50' :
                log.level === 'WARN' ? 'text-amber-500/50' :
                'text-red-500/50'
              }>{log.level}:</span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Status Bar (Bottom) */}
      <div className="h-6 bg-emerald-600 flex items-center justify-between px-3 text-[10px] text-black font-medium shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Code className="w-3 h-3" />
            <span>Main Branch</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3" />
            <span>0 Errors</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>TypeScript JSX</span>
          <div className="flex items-center gap-1">
            <Bot className="w-3 h-3" />
            <span>Ollama Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
