import { useState, useCallback } from 'react';
import { Workspace, LocalFile, Message } from '../types';
import { api } from '../services/api';

export const useWorkspace = () => {
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [fileTree, setFileTree] = useState<LocalFile[]>([]);
  const [openFiles, setOpenFiles] = useState<LocalFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [isCopilotThinking, setIsCopilotThinking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchWorkspace = useCallback(async (id: string) => {
    const data = await api.workspaces.getOne(id);
    setSelectedWorkspace(data);
  }, []);

  const fetchFileTree = useCallback(async (workspaceId?: string) => {
    const data = await api.files.getTree(workspaceId);
    setFileTree(data);
  }, []);

  const openFile = async (item: LocalFile) => {
    if (item.type === 'directory') return;
    
    const existing = openFiles.find(f => f.path === item.path);
    if (!existing) {
      const { content } = await api.files.getContent(item.path);
      const newFile = { ...item, content, isDirty: false };
      setOpenFiles(prev => [...prev, newFile]);
    }
    setActiveFilePath(item.path);
  };

  const closeFile = (path: string) => {
    setOpenFiles(prev => prev.filter(f => f.path !== path));
    if (activeFilePath === path) {
      setActiveFilePath(openFiles.find(f => f.path !== path)?.path || null);
    }
  };

  const handleContentChange = (path: string, content: string) => {
    setOpenFiles(prev => prev.map(f => f.path === path ? { ...f, content, isDirty: true } : f));
  };

  const saveActiveFile = async () => {
    const file = openFiles.find(f => f.path === activeFilePath);
    if (!file || !file.content) return;

    setIsSaving(true);
    try {
      await api.files.save(file.path, file.content);
      setOpenFiles(prev => prev.map(f => f.path === file.path ? { ...f, isDirty: false } : f));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendMessage = async (message: string, agentId: string, mode: 'advisor' | 'agent') => {
    if (!selectedWorkspace) return;
    
    setIsCopilotThinking(true);
    try {
      const res = await api.workspaces.chat(selectedWorkspace.id, { content: message, agentId, mode });
      await fetchWorkspace(selectedWorkspace.id);
      if (mode === 'agent') fetchFileTree(selectedWorkspace.id);
    } finally {
      setIsCopilotThinking(false);
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!selectedWorkspace) return;
    
    setIsUploading(true);
    try {
      await api.workspaces.uploadFile(selectedWorkspace.id, file);
      await fetchWorkspace(selectedWorkspace.id);
      fetchFileTree(selectedWorkspace.id);
    } finally {
      setIsUploading(false);
    }
  };

  return {
    selectedWorkspace,
    setSelectedWorkspace,
    fileTree,
    openFiles,
    activeFilePath,
    setActiveFilePath,
    isCopilotThinking,
    isUploading,
    isSaving,
    fetchWorkspace,
    fetchFileTree,
    openFile,
    closeFile,
    handleContentChange,
    saveActiveFile,
    handleSendMessage,
    handleUploadFile
  };
};
