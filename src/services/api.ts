import { Agent, Workspace, LocalFile } from '../types';

export const api = {
  agents: {
    getAll: () => fetch('/api/agents').then(r => r.json()),
    create: (data: any) => fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
    delete: (id: string) => fetch(`/api/agents/${id}`, { method: 'DELETE' })
  },
  workspaces: {
    getAll: () => fetch('/api/workspaces').then(r => r.json()),
    getOne: (id: string) => fetch(`/api/workspaces/${id}`).then(r => r.json()),
    create: (data: any) => fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
    chat: (id: string, data: any) => fetch(`/api/workspaces/${id}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
    uploadFile: (id: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', id);
      formData.append('category', 'context');
      return fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      }).then(r => r.json());
    }
  },
  files: {
    getTree: (workspaceId?: string) => fetch(`/api/files/tree${workspaceId ? `?workspaceId=${workspaceId}` : ''}`).then(r => r.json()),
    getContent: (path: string) => fetch(`/api/files/content?path=${encodeURIComponent(path)}`).then(r => r.json()),
    save: (path: string, content: string) => fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content })
    }).then(r => r.json())
  }
};
