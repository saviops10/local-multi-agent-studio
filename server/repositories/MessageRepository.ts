import db from "../config/database";

export interface Message {
  id: string;
  workspace_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  role: 'user' | 'agent' | 'system';
  created_at: string;
}

export const MessageRepository = {
  findByWorkspace: (workspaceId: string): Message[] => {
    return db.prepare("SELECT * FROM messages WHERE workspace_id = ? ORDER BY created_at ASC").all(workspaceId) as Message[];
  },

  create: (message: Partial<Message>) => {
    const { id, workspace_id, sender_id, sender_name, content, role } = message;
    return db.prepare(`
      INSERT INTO messages (id, workspace_id, sender_id, sender_name, content, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, workspace_id, sender_id, sender_name, content, role);
  }
};
