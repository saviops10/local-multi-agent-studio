export interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  system_prompt: string;
  temperature: number;
  top_p?: number;
  max_tokens?: number;
  is_cloud?: boolean;
  created_at?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  objective: string;
  created_at: string;
  view_mode: 'ide' | 'project';
  active?: boolean;
  agent_ids: string[];
  messages?: Message[];
  files?: WorkspaceFile[];
}

export interface Message {
  id: string;
  workspace_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  role: 'user' | 'agent' | 'system';
  created_at: string;
}

export interface WorkspaceFile {
  id: string;
  workspace_id: string;
  name: string;
  path: string;
  type: string;
  category: 'generated' | 'context';
  created_at: string;
}

export interface LocalFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  content?: string;
  isDirty?: boolean;
  children?: LocalFile[];
}
