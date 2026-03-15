import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  FileText, 
  History, 
  Terminal as TerminalIcon, 
  Settings, 
  Download, 
  FolderOpen,
  Send,
  Paperclip,
  Bot,
  User,
  ChevronRight,
  ChevronDown,
  Plus,
  Upload,
  Link,
  File,
  Search,
  Layout,
  Activity,
  Trash2,
  X,
  Check,
  AlertTriangle,
  Play
} from 'lucide-react';
import { Workspace, Agent, Message } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Terminal } from '../IDE/Terminal';
import { Explorer } from '../IDE/Explorer';

interface ProjectViewProps {
  workspace: Workspace;
  agents: Agent[];
  onSendMessage: (content: string, agentId: string, mode: 'advisor' | 'agent') => void;
  isThinking: boolean;
  onWorkspaceUpdate: () => void;
  streamingMessage: { sender_id: string; content: string } | null;
}

export const ProjectView: React.FC<ProjectViewProps> = ({ 
  workspace, 
  agents, 
  onSendMessage, 
  isThinking,
  onWorkspaceUpdate,
  streamingMessage
}) => {
  const [input, setInput] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState(workspace.agent_ids?.[0] || '');
  const [mode, setMode] = useState<'advisor' | 'agent'>('advisor');
  const [rightPanel, setRightPanel] = useState<'context' | 'history' | 'terminal'>('context');
  const [showSettings, setShowSettings] = useState(false);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [settingsData, setSettingsData] = useState(workspace);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [workspace.messages, streamingMessage, isThinking]);

  const handleSend = () => {
    if (!input.trim() || !selectedAgentId) return;
    onSendMessage(input, selectedAgentId, mode);
    setInput('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    
    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const lastAt = textBefore.lastIndexOf('@');
    
    if (lastAt !== -1 && !textBefore.slice(lastAt).includes(' ')) {
      setMentionQuery(textBefore.slice(lastAt + 1));
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const selectMention = (agent: Agent) => {
    const lastAt = input.lastIndexOf('@');
    const newInput = input.slice(0, lastAt) + '@' + agent.name.replace(/\s+/g, '') + ' ';
    setInput(newInput);
    setShowMentions(false);
  };

  const handleDownloadChat = () => {
    const chatContent = workspace.messages.map(m => `[${m.role.toUpperCase()}] ${m.content}`).join('\n\n');
    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workspace.name}-chat.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenFolder = async () => {
    try {
      await fetch(`/api/workspaces/${workspace.id}/open`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to open folder', e);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/workspaces/${workspace.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsData)
    });
    setShowSettings(false);
    onWorkspaceUpdate();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspaceId', workspace.id);
    formData.append('category', 'context');

    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        onWorkspaceUpdate();
      }
    } catch (error) {
      console.error('Upload failed', error);
    }
  };

  const handleApproveAction = async (pendingData: any) => {
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/actions/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingData)
      });
      if (res.ok) {
        onWorkspaceUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  const MessageContent = ({ content }: { content: string }) => {
    if (content.startsWith('PENDING_ACTION:')) {
      const actionData = JSON.parse(content.substring(15));
      return (
        <div className="bg-zinc-950 border border-amber-500/30 rounded-xl p-4 space-y-3 my-2 shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Aprovação Necessária</span>
          </div>
          <div className="space-y-1">
            <div className="bg-black/50 p-2 rounded border border-zinc-800 font-mono text-[10px] text-emerald-400 break-all">
              {actionData.action.toUpperCase()}: {actionData.params.name || actionData.params.command || actionData.params.path || "..."}
            </div>
          </div>
          <button 
            onClick={() => handleApproveAction(actionData)}
            className="w-full py-2 bg-emerald-500 text-black rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-3 h-3" />
            Executar Agora
          </button>
        </div>
      );
    }
    return <div className="break-words overflow-hidden max-w-full"><ReactMarkdown>{content}</ReactMarkdown></div>;
  };

  return (
    <div className="flex-1 flex flex-col bg-[#050505] overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

      {/* Top Bar */}
      <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-[#0A0A0A]">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <Layout className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">{workspace.name}</h2>
            <div className="flex items-center gap-3 mt-0.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-zinc-400 font-medium">{workspace.agent_ids?.length || 0} Agents Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FolderOpen className="w-3 h-3 text-amber-500/70" />
                <span className="text-[10px] text-zinc-500 font-medium">{workspace.name.toLowerCase().replace(/\s+/g, '-')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={handleOpenFolder} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-lg transition-all" title="Open Local Folder"><FolderOpen className="w-4 h-4" /></button>
          <button type="button" onClick={() => setRightPanel(rightPanel === 'context' ? 'terminal' : 'context')} className={`p-2 rounded-lg transition-all ${rightPanel === 'context' ? 'text-emerald-500 bg-emerald-500/10' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`} title="Toggle Context/Terminal"><Layout className="w-4 h-4" /></button>
          <button type="button" onClick={handleDownloadChat} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-lg transition-all" title="Download Chat"><Download className="w-4 h-4" /></button>
          <button type="button" onClick={() => setRightPanel('terminal')} className={`p-2 rounded-lg transition-all ${rightPanel === 'terminal' ? 'text-emerald-500 bg-emerald-500/10' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`} title="Terminal"><TerminalIcon className="w-4 h-4" /></button>
          <button type="button" onClick={() => setShowSettings(true)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-lg transition-all" title="Settings"><Settings className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-800">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {workspace.messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role !== 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                    <Bot className="w-5 h-5 text-black" />
                  </div>
                )}
                <div className={`max-w-[80%] space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed break-words ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-tl-none shadow-sm'}`}>
                    <MessageContent content={msg.content} />
                  </div>
                  <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest px-2">
                    {msg.role === 'user' ? 'You' : (agents.find(a => a.id === msg.sender_id)?.name || msg.sender_name || 'Agent')}
                  </span>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                    <User className="w-5 h-5 text-zinc-400" />
                  </div>
                )}
              </div>
            ))}
            
            {streamingMessage && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                  <Bot className="w-5 h-5 text-black" />
                </div>
                <div className="max-w-[80%] space-y-1 items-start">
                  <div className="p-4 rounded-2xl text-sm leading-relaxed bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-tl-none shadow-sm">
                    <ReactMarkdown>{streamingMessage.content}</ReactMarkdown>
                  </div>
                  <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest px-2">
                    {agents.find(a => a.id === streamingMessage.sender_id)?.name || 'Agent'} (streaming...)
                  </span>
                </div>
              </div>
            )}

            {isThinking && !streamingMessage && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center animate-pulse"><Bot className="w-5 h-5 text-black" /></div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl rounded-tl-none shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0s]" />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-6 bg-[#0A0A0A] border-t border-zinc-800">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Chatting with</span>
                  <div className="relative">
                    <button 
                      onClick={() => setShowAgentSelector(!showAgentSelector)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-bold text-emerald-500 uppercase tracking-widest hover:border-emerald-500/30 transition-all shadow-sm"
                    >
                      {selectedAgent?.name || 'Select Agent'}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <AnimatePresence>
                      {showAgentSelector && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full mb-2 left-0 w-48 bg-[#0F0F0F] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50 p-1"
                        >
                          {workspace.agent_ids?.map(id => {
                            const agent = agents.find(a => a.id === id);
                            if (!agent) return null;
                            return (
                              <button 
                                key={id}
                                onClick={() => {
                                  setSelectedAgentId(id);
                                  setShowAgentSelector(false);
                                }}
                                className={`w-full px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all mb-1 last:mb-0 ${selectedAgentId === id ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:bg-zinc-800'}`}
                              >
                                {agent.name}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 shadow-sm">
                  <button onClick={() => setMode('advisor')} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'advisor' ? 'bg-zinc-800 text-emerald-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Advisor</button>
                  <button onClick={() => setMode('agent')} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'agent' ? 'bg-zinc-800 text-emerald-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Agent</button>
                </div>
              </div>

              <div className="relative group">
                {showMentions && (
                  <div className="absolute bottom-full left-0 w-full bg-[#0F0F0F] border border-zinc-800 rounded-xl mb-2 overflow-hidden shadow-2xl z-50 p-1">
                    {agents.filter(a => a.name.toLowerCase().includes(mentionQuery.toLowerCase())).map(agent => (
                      <button 
                        key={agent.id}
                        onClick={() => selectMention(agent)}
                        className="w-full px-4 py-3 text-left text-xs text-zinc-300 hover:bg-emerald-500 hover:text-black transition-all flex items-center gap-3 rounded-lg mb-1 last:mb-0"
                      >
                        <Bot className="w-4 h-4 shadow-sm" />
                        <div>
                          <p className="font-bold uppercase tracking-widest text-[10px]">{agent.name}</p>
                          <p className="text-[10px] opacity-60 font-mono">{agent.model}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <textarea 
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder={`Mandar mensagem para o workspace... (use @ para mencionar agentes)`}
                  className="w-full bg-[#0F0F0F] border border-zinc-800 rounded-2xl px-5 py-5 pr-32 text-sm text-zinc-300 focus:border-emerald-500/50 outline-none transition-all resize-none h-28 custom-scrollbar shadow-lg"
                />
                <div className="absolute right-4 bottom-4 flex items-center gap-3">
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 text-zinc-500 hover:text-emerald-500 transition-all focus:outline-none"><Paperclip className="w-5 h-5" /></button>
                  <button onClick={handleSend} disabled={!input.trim() || isThinking} className="w-10 h-10 bg-emerald-500 text-black rounded-xl flex items-center justify-center hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-emerald-500/20"><Send className="w-5 h-5" /></button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-[400px] bg-[#0A0A0A] flex flex-col border-l border-zinc-800">
          <div className="flex-1 flex flex-col min-h-0">
            {rightPanel === 'terminal' ? (
              <div className="h-full flex flex-col p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <TerminalIcon className="w-4 h-4" />
                    </div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Terminal Integrado</h3>
                  </div>
                  <button onClick={() => setRightPanel('context')} className="text-zinc-600 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl relative">
                  <Terminal workspaceId={workspace.id} />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500">
                          <FileText className="w-4 h-4" />
                        </div>
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Workspace Files</h3>
                      </div>
                    </div>
                    
                    {/* Explorer Component Integrated */}
                    <div className="rounded-2xl border border-zinc-800 bg-[#0F0F0F] overflow-hidden shadow-sm min-h-[400px]">
                      <Explorer 
                        workspaceId={workspace.id}
                        onFileSelect={() => {}} // In Project view, select might not open anything by default
                        activeFilePath={null}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="border-b border-zinc-800 pb-3 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500">
                        <Bot className="w-4 h-4" />
                      </div>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Time de Agentes</h3>
                    </div>
                    <div className="space-y-3">
                      {workspace.agent_ids?.map(id => {
                        const agent = agents.find(a => a.id === id);
                        if (!agent) return null;
                        return (
                          <div 
                            key={id} 
                            className={`p-4 rounded-2xl border flex items-center justify-between group transition-all cursor-pointer shadow-sm ${selectedAgentId === id ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#0F0F0F] border-zinc-800 hover:border-zinc-700'}`} 
                            onClick={() => setSelectedAgentId(id)}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner ${selectedAgentId === id ? 'text-emerald-400 border-emerald-500/20' : 'text-zinc-500'}`}>
                                <Bot className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-widest">{agent.name}</h4>
                                <p className="text-[10px] text-zinc-600 font-mono mt-0.5">{agent.model}</p>
                              </div>
                            </div>
                            {selectedAgentId === id && (
                              <div className="relative">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0F0F0F] border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-zinc-800/50 relative">
              <h2 className="text-2xl font-bold text-white tracking-tight">Workspace Settings</h2>
              <p className="text-zinc-500 text-sm mt-1">Update workspace details and agents.</p>
              <button onClick={() => setShowSettings(false)} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdateSettings} className="p-8 space-y-6">
              <div className="space-y-2"><label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Workspace Name</label><input required value={settingsData.name} onChange={e => setSettingsData({...settingsData, name: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all" /></div>
              <div className="space-y-2"><label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Description</label><textarea value={settingsData.description} onChange={e => setSettingsData({...settingsData, description: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all h-20 resize-none" /></div>
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Assign Agents</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {agents.map(agent => (
                    <div key={agent.id} onClick={() => { const currentIds = settingsData.agent_ids || []; if (currentIds.includes(agent.id)) { setSettingsData({...settingsData, agent_ids: currentIds.filter(id => id !== agent.id)}); } else { setSettingsData({...settingsData, agent_ids: [...currentIds, agent.id]}); } }} className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${(settingsData.agent_ids || []).includes(agent.id) ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'}`}>
                      <div className="flex items-center gap-3"><div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${(settingsData.agent_ids || []).includes(agent.id) ? 'bg-emerald-500 text-black' : 'bg-zinc-800 border border-zinc-700'}`}>{(settingsData.agent_ids || []).includes(agent.id) && <Check className="w-3 h-3" />}</div><div><p className="text-xs font-bold text-white uppercase tracking-widest">{agent.name}</p><p className="text-[10px] text-zinc-500 font-mono">{agent.model}</p></div></div>
                    </div>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-emerald-500 text-black rounded-2xl text-sm font-bold hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 mt-4">Save Changes</button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
