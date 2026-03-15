import db from "../config/database";

export interface WorkspaceFile {
  id: string;
  workspace_id: string;
  name: string;
  path: string;
  type: string;
  category: 'generated' | 'context';
  created_at: string;
}

export const FileRepository = {
  findByWorkspace: (workspaceId: string): WorkspaceFile[] => {
    return db.prepare("SELECT * FROM workspace_files WHERE workspace_id = ? ORDER BY created_at DESC").all(workspaceId) as WorkspaceFile[];
  },

  create: (file: Partial<WorkspaceFile>) => {
    const { id, workspace_id, name, path, type, category } = file;
    return db.prepare(`
      INSERT INTO workspace_files (id, workspace_id, name, path, type, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, workspace_id, name, path, type, category || 'generated');
  },

  update: (id: string, file: Partial<WorkspaceFile>) => {
    const { name, path, created_at } = file;
    return db.prepare(`
      UPDATE workspace_files SET name = COALESCE(?, name), path = COALESCE(?, path), created_at = COALESCE(?, created_at)
      WHERE id = ?
    `).run(name, path, created_at, id);
  },

  deleteByWorkspaceAndName: (workspaceId: string, name: string) => {
    return db.prepare("DELETE FROM workspace_files WHERE workspace_id = ? AND name = ?").run(workspaceId, name);
  },
  
  deleteByPath: (workspaceId: string, path: string) => {
    return db.prepare("DELETE FROM workspace_files WHERE workspace_id = ? AND path = ?").run(workspaceId, path);
  },

  findByName: (workspaceId: string, name: string): WorkspaceFile | undefined => {
    return db.prepare("SELECT * FROM workspace_files WHERE workspace_id = ? AND name = ?").get(workspaceId, name) as WorkspaceFile;
  },

  updateByName: (workspaceId: string, name: string, data: Partial<WorkspaceFile>) => {
    const { path, created_at } = data;
    return db.prepare("UPDATE workspace_files SET path = ?, created_at = ? WHERE workspace_id = ? AND name = ?")
      .run(path, created_at, workspaceId, name);
  }
};
