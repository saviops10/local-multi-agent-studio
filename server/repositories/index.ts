import db from "../config/database";

export const AgentRepository = {
  getAll: () => db.prepare("SELECT * FROM agents ORDER BY created_at DESC").all(),
  getById: (id: string) => db.prepare("SELECT * FROM agents WHERE id = ?").get(id),
  create: (agent: any) => {
    const stmt = db.prepare(`
      INSERT INTO agents (id, name, description, model, system_prompt, temperature, top_p, max_tokens, is_cloud)
      VALUES (@id, @name, @description, @model, @system_prompt, @temperature, @top_p, @max_tokens, @is_cloud)
    `);
    return stmt.run({ 
      ...agent, 
      top_p: agent.top_p ?? 1.0,
      max_tokens: agent.max_tokens ?? 2048,
      is_cloud: agent.is_cloud ? 1 : 0 
    });
  },
  update: (id: string, agent: any) => {
    const stmt = db.prepare(`
      UPDATE agents SET name = @name, description = @description, model = @model, 
      system_prompt = @system_prompt, temperature = @temperature, 
      top_p = @top_p, max_tokens = @max_tokens, is_cloud = @is_cloud
      WHERE id = @id
    `);
    return stmt.run({ 
      ...agent, 
      id, 
      top_p: agent.top_p ?? 1.0,
      max_tokens: agent.max_tokens ?? 2048,
      is_cloud: agent.is_cloud ? 1 : 0 
    });
  },
  delete: (id: string) => db.prepare("DELETE FROM agents WHERE id = ?").run(id)
};

export const WorkspaceRepository = {
  getAll: () => {
    const workspaces = db.prepare("SELECT * FROM workspaces ORDER BY created_at DESC").all();
    return workspaces.map((ws: any) => {
      const agentIds = db.prepare("SELECT agent_id FROM workspace_agents WHERE workspace_id = ?").all(ws.id).map((a: any) => a.agent_id);
      return { ...ws, agent_ids: agentIds, active: ws.active === 1 };
    });
  },
  getById: (id: string) => {
    const workspace = db.prepare("SELECT * FROM workspaces WHERE id = ?").get(id);
    if (!workspace) return null;
    
    const agents = db.prepare(`
      SELECT a.* FROM agents a
      JOIN workspace_agents wa ON wa.agent_id = a.id
      WHERE wa.workspace_id = ?
    `).all(id);

    const agentIds = agents.map((a: any) => a.id);
    const messages = db.prepare("SELECT * FROM messages WHERE workspace_id = ? ORDER BY created_at ASC").all(id);
    const files = db.prepare("SELECT * FROM workspace_files WHERE workspace_id = ?").all(id);

    return { ...workspace, agents, agent_ids: agentIds, messages, files };
  },
  create: (workspace: any) => {
    const stmt = db.prepare(`
      INSERT INTO workspaces (id, name, description, objective, view_mode, active)
      VALUES (@id, @name, @description, @objective, @view_mode, @active)
    `);
    const result = stmt.run({ 
      ...workspace, 
      view_mode: workspace.view_mode || 'ide',
      active: workspace.active === false ? 0 : 1
    });
    
    if (workspace.agent_ids && Array.isArray(workspace.agent_ids)) {
      for (const agentId of workspace.agent_ids) {
        const agentExists = db.prepare("SELECT id FROM agents WHERE id = ?").get(agentId);
        if (agentExists) {
          db.prepare("INSERT INTO workspace_agents (workspace_id, agent_id) VALUES (?, ?)").run(workspace.id, agentId);
        }
      }
    }
    return result;
  },
  update: (id: string, workspace: any) => {
    const stmt = db.prepare(`
      UPDATE workspaces SET name = @name, description = @description, 
      objective = @objective, view_mode = @view_mode, active = @active
      WHERE id = @id
    `);
    const result = stmt.run({ 
      objective: '',
      view_mode: 'ide',
      ...workspace, 
      id,
      active: workspace.active === false ? 0 : 1
    });

    if (workspace.agent_ids && Array.isArray(workspace.agent_ids)) {
      db.prepare("DELETE FROM workspace_agents WHERE workspace_id = ?").run(id);
      for (const agentId of workspace.agent_ids) {
        const agentExists = db.prepare("SELECT id FROM agents WHERE id = ?").get(agentId);
        if (agentExists) {
          db.prepare("INSERT INTO workspace_agents (workspace_id, agent_id) VALUES (?, ?)").run(id, agentId);
        }
      }
    }
    return result;
  },
  addAgent: (workspaceId: string, agentId: string) => {
    const agentExists = db.prepare("SELECT id FROM agents WHERE id = ?").get(agentId);
    if (!agentExists) throw new Error(`Agent ${agentId} does not exist`);
    return db.prepare("INSERT OR IGNORE INTO workspace_agents (workspace_id, agent_id) VALUES (?, ?)").run(workspaceId, agentId);
  },
  removeAgent: (workspaceId: string, agentId: string) => {
    return db.prepare("DELETE FROM workspace_agents WHERE workspace_id = ? AND agent_id = ?").run(workspaceId, agentId);
  },
  delete: (id: string) => db.prepare("DELETE FROM workspaces WHERE id = ?").run(id)
};

export const SettingsRepository = {
  get: (key: string) => db.prepare("SELECT value FROM settings WHERE key = ?").get(key),
  set: (key: string, value: string) => db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value),
  getAll: () => db.prepare("SELECT * FROM settings").all()
};
