import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Bot, Activity, AlertTriangle, Play } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Agent, Workspace } from '../../types';

interface CopilotProps {
  workspace: Workspace;
  agents: Agent[];
  onSendMessage: (content: string, agentId: string, mode: 'advisor' | 'agent') => void;
  isThinking: boolean;
  onWorkspaceUpdate: () => void;
  streamingMessage: { sender_id: string; content: string } | null;
  onFileSelect?: (path: string) => void;
}

export const Copilot: React.FC<CopilotProps> = ({ 
  workspace, 
  agents, 
  onSendMessage, 
  isThinking,
  onWorkspaceUpdate,
  streamingMessage,
  onFileSelect
}) => {
  const [input, setInput] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState(workspace.agent_ids?.[0] || '');
  const [mode, setMode] = useState<'advisor' | 'agent'>('advisor');
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUploadContext = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    } catch (err) {
      console.error('Upload failed:', err);
    }
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
    <div className="flex flex-col h-full bg-[#0A0A0A]">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#0F0F0F]">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Agent Copilot</span>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleUploadContext} className="hidden" />
          <select 
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 rounded px-2 py-1 outline-none focus:border-emerald-500"
          >
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      <div className="p-2 border-b border-zinc-800 flex gap-1 bg-[#0F0F0F]">
        <button 
          onClick={() => setMode('advisor')}
          className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-tighter rounded transition-all ${mode === 'advisor' ? 'bg-emerald-500 text-black' : 'text-zinc-500 hover:bg-zinc-800'}`}
        >
          Advisor
        </button>
        <button 
          onClick={() => setMode('agent')}
          className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-tighter rounded transition-all ${mode === 'agent' ? 'bg-emerald-500 text-black' : 'text-zinc-500 hover:bg-zinc-800'}`}
        >
          Agent
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {workspace.messages?.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed break-words ${msg.role === 'user' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-900 border border-zinc-800 text-zinc-300'}`}>
              <MessageContent content={msg.content} />
            </div>
          </div>
        ))}
        {streamingMessage && (
          <div className="flex flex-col items-start max-w-full overflow-hidden">
            <div className="max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed bg-zinc-900 border border-zinc-800 text-zinc-300 break-words">
              <ReactMarkdown>{streamingMessage.content}</ReactMarkdown>
            </div>
            <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest px-2 mt-1">
              {agents.find(a => a.id === streamingMessage.sender_id)?.name || 'Agent'} (streaming...)
            </span>
          </div>
        )}
        {isThinking && !streamingMessage && (
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 italic animate-pulse">
            <Activity className="w-3 h-3" /> Agent is analyzing code...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t border-zinc-800 bg-zinc-900/20">
        <div className="relative">
          {showMentions && (
            <div className="absolute bottom-full left-0 w-full bg-zinc-900 border border-zinc-800 rounded-xl mb-2 overflow-hidden shadow-2xl z-50">
              {agents.filter(a => a.name.toLowerCase().includes(mentionQuery.toLowerCase())).map(agent => (
                <button 
                  key={agent.id}
                  onClick={() => selectMention(agent)}
                  className="w-full px-4 py-2 text-left text-xs text-zinc-300 hover:bg-emerald-500 hover:text-black transition-colors flex items-center gap-2"
                >
                  <Bot className="w-3 h-3" />
                  {agent.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-2 focus-within:border-emerald-500 transition-all">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-zinc-500 hover:text-emerald-500 transition-all mb-1" 
              title="Upload Context"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea 
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Ask Copilot about your code..."
              className="flex-1 bg-transparent border-none text-xs focus:outline-none transition-all resize-none h-20 py-1"
            />
            <button 
              onClick={handleSend}
              className="p-2 bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 transition-all mb-1"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
