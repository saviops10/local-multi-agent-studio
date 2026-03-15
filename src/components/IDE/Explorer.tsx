import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText, FileCode, Trash2, FolderPlus, FilePlus, Activity, Upload, Edit2 } from 'lucide-react';
import { LocalFile } from '../../types';
import { io } from 'socket.io-client';
import { ConfirmModal } from '../Common/ConfirmModal';

interface ExplorerProps {
  workspaceId: string;
  onFileSelect: (path: string) => void;
  activeFilePath: string | null;
}

export const Explorer: React.FC<ExplorerProps> = ({ workspaceId, onFileSelect, activeFilePath }) => {
  const [tree, setTree] = useState<LocalFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['/']));
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; path: string | null }>({ isOpen: false, path: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTree = async () => {
    // We don't want to show loading spinner on every background refresh
    try {
      const res = await fetch(`/api/files/tree?workspaceId=${workspaceId}`);
      const data = await res.json();
      setTree(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchTree();

    const socket = io({
      query: { workspaceId }
    });

    socket.on('file_change', () => {
      console.log('File change detected, refreshing tree...');
      fetchTree();
    });

    return () => {
      socket.disconnect();
    };
  }, [workspaceId]);

  const toggleDir = (path: string) => {
    const next = new Set(expandedDirs);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpandedDirs(next);
  };

  const handleNewFile = async () => {
    const tempName = `untitled-${Date.now()}.txt`;
    await fetch('/api/files/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, path: tempName, type: 'file', content: '// New file' })
    });
    // fetchTree will be triggered by watcher
    setEditingPath(tempName);
    setEditValue('untitled.txt');
  };

  const handleNewFolder = async () => {
    const tempName = `untitled-folder-${Date.now()}`;
    await fetch('/api/files/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, path: tempName, type: 'directory' })
    });
    // fetchTree will be triggered by watcher
    setEditingPath(tempName);
    setEditValue('untitled-folder');
  };

  const handleDelete = async (path: string) => {
    setDeleteModal({ isOpen: true, path });
  };

  const confirmDelete = async () => {
    if (!deleteModal.path) return;
    const res = await fetch(`/api/files/delete?workspaceId=${workspaceId}&path=${encodeURIComponent(deleteModal.path)}`, { method: 'DELETE' });
    setDeleteModal({ isOpen: false, path: null });
  };

  const submitRename = async () => {
    if (!editingPath || !editValue.trim()) {
      setEditingPath(null);
      return;
    }
    
    const parts = editingPath.split('/');
    parts[parts.length - 1] = editValue.trim();
    const newPath = parts.join('/');

    if (newPath !== editingPath) {
      await fetch('/api/files/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, oldPath: editingPath, newPath })
      });
    }
    
    setEditingPath(null);
    // fetchTree will be triggered by watcher
  };

  const handleDragStart = (e: React.DragEvent, path: string) => {
    e.dataTransfer.setData('text/plain', path);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetPath: string, isDirectory: boolean) => {
    e.preventDefault();
    const sourcePath = e.dataTransfer.getData('text/plain');
    if (sourcePath === targetPath) return;

    const fileName = sourcePath.split('/').pop();
    const newPath = isDirectory ? `${targetPath}/${fileName}` : `${targetPath.split('/').slice(0, -1).join('/')}/${fileName}`;

    if (newPath === sourcePath) return;

    await fetch('/api/files/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, oldPath: sourcePath, newPath })
    });
    // fetchTree will be triggered by watcher
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      const content = await new Promise<string>((resolve) => {
        reader.onload = (event) => resolve(event.target?.result as string || '');
        reader.readAsText(file);
      });

      await fetch('/api/files/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workspaceId, 
          path: file.name, 
          type: 'file', 
          content 
        })
      });
    }
    // fetchTree will be triggered by watcher
  };

  const renderItem = (item: LocalFile, depth = 0) => {
    const isDirectory = item.type === 'directory';
    const isActive = activeFilePath === item.path;
    const isExpanded = expandedDirs.has(item.path);
    const isEditing = editingPath === item.path;

    return (
      <div 
        key={item.path}
        draggable
        onDragStart={(e) => handleDragStart(e, item.path)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, item.path, isDirectory)}
      >
        <div 
          onClick={() => isDirectory ? toggleDir(item.path) : onFileSelect(item.path)}
          className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-zinc-800/50 transition-colors group ${isActive ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400'}`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isDirectory ? (
            isExpanded ? <ChevronDown className="w-3 h-3 text-zinc-600" /> : <ChevronRight className="w-3 h-3 text-zinc-600" />
          ) : (
            <FileCode className="w-3 h-3 text-zinc-500" />
          )}
          
          {isEditing ? (
            <input 
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => e.key === 'Enter' && submitRename()}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-emerald-500 rounded px-1 text-xs text-white outline-none w-full"
            />
          ) : (
            <span className="text-xs truncate flex-1">{item.name}</span>
          )}

          {!isEditing && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); setEditingPath(item.path); setEditValue(item.name); }}
                className="p-1 hover:text-emerald-500 transition-all"
                title="Rename"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDelete(item.path); }}
                className="p-1 hover:text-red-400 transition-all"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        {isDirectory && isExpanded && item.children && (
          <div>{item.children.map(child => renderItem(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#0F0F0F]">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Explorer</span>
        <div className="flex items-center gap-1">
          <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="p-1 text-zinc-500 hover:text-emerald-500" title="Upload Files"><Upload className="w-3.5 h-3.5" /></button>
          <button onClick={handleNewFile} className="p-1 text-zinc-500 hover:text-emerald-500" title="New File"><FilePlus className="w-3.5 h-3.5" /></button>
          <button onClick={handleNewFolder} className="p-1 text-zinc-500 hover:text-emerald-500" title="New Folder"><FolderPlus className="w-3.5 h-3.5" /></button>
          <button onClick={fetchTree} className="p-1 text-zinc-500 hover:text-emerald-500" title="Refresh"><Activity className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {loading && tree.length === 0 ? (
          <div className="flex justify-center py-4"><Activity className="w-4 h-4 animate-spin text-zinc-700" /></div>
        ) : (
          tree.map(item => renderItem(item))
        )}
      </div>
      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, path: null })}
        onConfirm={confirmDelete}
        title="Excluir Arquivo"
        message={`Tem certeza que deseja excluir "${deleteModal.path?.split('/').pop()}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Manter Arquivo"
      />
    </div>
  );
};
