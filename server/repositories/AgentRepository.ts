import db from "../config/database";

export interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  created_at: string;
}

export const AgentRepository = {
  findAll: (): Agent[] => {
    return db.prepare("SELECT * FROM agents ORDER BY created_at DESC").all() as Agent[];
  },

  findById: (id: string): Agent | undefined => {
    return db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as Agent;
  },

  create: (agent: Partial<Agent>) => {
    const { id, name, description, model, system_prompt, temperature, max_tokens, top_p } = agent;
    return db.prepare(`
      INSERT INTO agents (id, name, description, model, system_prompt, temperature, max_tokens, top_p)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, description, model, system_prompt, temperature, max_tokens, top_p);
  },

  update: (id: string, agent: Partial<Agent>) => {
    const { name, description, model, system_prompt, temperature, max_tokens, top_p } = agent;
    return db.prepare(`
      UPDATE agents 
      SET name = ?, description = ?, model = ?, system_prompt = ?, temperature = ?, max_tokens = ?, top_p = ?
      WHERE id = ?
    `).run(name, description, model, system_prompt, temperature, max_tokens, top_p, id);
  },

  delete: (id: string) => {
    return db.prepare("DELETE FROM agents WHERE id = ?").run(id);
  }
};
