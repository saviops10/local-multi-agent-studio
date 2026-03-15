import db from "../config/database";

export interface Workspace {
  id: string;
  name: string;
  description: string;
  objective: string;
  created_at: string;
}

export const WorkspaceRepository = {
  findAll: (): Workspace[] => {
    return db.prepare("SELECT * FROM workspaces ORDER BY created_at DESC").all() as Workspace[];
  },

  findById: (id: string): Workspace | undefined => {
    return db.prepare("SELECT * FROM workspaces WHERE id = ?").get(id) as Workspace;
  },

  create: (workspace: Partial<Workspace>) => {
    const { id, name, description, objective } = workspace;
    return db.prepare(`
      INSERT INTO workspaces (id, name, description, objective)
      VALUES (?, ?, ?, ?)
    `).run(id, name, description, objective);
  },

  update: (id: string, workspace: Partial<Workspace>) => {
    const { name, description, objective } = workspace;
    return db.prepare(`
      UPDATE workspaces SET name = ?, description = ?, objective = ? WHERE id = ?
    `).run(name, description, objective, id);
  },

  delete: (id: string) => {
    return db.prepare("DELETE FROM workspaces WHERE id = ?").run(id);
  },

  getAgents: (workspaceId: string) => {
    return db.prepare(`
      SELECT a.* FROM agents a
      JOIN workspace_agents wa ON a.id = wa.agent_id
      WHERE wa.workspace_id = ?
    `).all(workspaceId);
  },

  addAgent: (workspaceId: string, agentId: string) => {
    return db.prepare("INSERT INTO workspace_agents (workspace_id, agent_id) VALUES (?, ?)").run(workspaceId, agentId);
  },

  removeAgents: (workspaceId: string) => {
    return db.prepare("DELETE FROM workspace_agents WHERE workspace_id = ?").run(workspaceId);
  }
};
