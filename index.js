// server.ts
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path4 from "path";
import fs4 from "fs";
import os from "os";
import { spawn as childSpawn } from "child_process";
import pty from "node-pty";
import multer from "multer";
import chokidar from "chokidar";

// server/config/database.ts
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
var dbPath = path.join(process.cwd(), "data", "database.sqlite");
var dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
var db = new Database(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    model TEXT NOT NULL,
    system_prompt TEXT,
    temperature REAL DEFAULT 0.7,
    top_p REAL DEFAULT 1.0,
    max_tokens INTEGER DEFAULT 2048,
    is_cloud INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    objective TEXT,
    view_mode TEXT DEFAULT 'ide',
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS workspace_agents (
    workspace_id TEXT,
    agent_id TEXT,
    PRIMARY KEY (workspace_id, agent_id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    sender_id TEXT,
    sender_name TEXT,
    content TEXT,
    role TEXT, -- 'user', 'agent', 'system'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workspace_files (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    name TEXT,
    path TEXT,
    type TEXT,
    category TEXT, -- 'generated', 'context'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );
`);
try {
  db.exec("ALTER TABLE agents ADD COLUMN top_p REAL DEFAULT 1.0");
} catch (e) {
}
try {
  db.exec("ALTER TABLE agents ADD COLUMN max_tokens INTEGER DEFAULT 2048");
} catch (e) {
}
try {
  db.exec("ALTER TABLE agents ADD COLUMN is_cloud INTEGER DEFAULT 0");
} catch (e) {
}
try {
  db.exec("ALTER TABLE workspaces ADD COLUMN view_mode TEXT DEFAULT 'ide'");
} catch (e) {
}
try {
  db.exec("ALTER TABLE workspaces ADD COLUMN active INTEGER DEFAULT 1");
} catch (e) {
}
var database_default = db;

// server/repositories/index.ts
var AgentRepository = {
  getAll: () => database_default.prepare("SELECT * FROM agents ORDER BY created_at DESC").all(),
  getById: (id) => database_default.prepare("SELECT * FROM agents WHERE id = ?").get(id),
  create: (agent) => {
    const stmt = database_default.prepare(`
      INSERT INTO agents (id, name, description, model, system_prompt, temperature, top_p, max_tokens, is_cloud)
      VALUES (@id, @name, @description, @model, @system_prompt, @temperature, @top_p, @max_tokens, @is_cloud)
    `);
    return stmt.run({
      ...agent,
      top_p: agent.top_p ?? 1,
      max_tokens: agent.max_tokens ?? 2048,
      is_cloud: agent.is_cloud ? 1 : 0
    });
  },
  update: (id, agent) => {
    const stmt = database_default.prepare(`
      UPDATE agents SET name = @name, description = @description, model = @model, 
      system_prompt = @system_prompt, temperature = @temperature, 
      top_p = @top_p, max_tokens = @max_tokens, is_cloud = @is_cloud
      WHERE id = @id
    `);
    return stmt.run({
      ...agent,
      id,
      top_p: agent.top_p ?? 1,
      max_tokens: agent.max_tokens ?? 2048,
      is_cloud: agent.is_cloud ? 1 : 0
    });
  },
  delete: (id) => database_default.prepare("DELETE FROM agents WHERE id = ?").run(id)
};
var WorkspaceRepository = {
  getAll: () => {
    const workspaces = database_default.prepare("SELECT * FROM workspaces ORDER BY created_at DESC").all();
    return workspaces.map((ws) => {
      const agentIds = database_default.prepare("SELECT agent_id FROM workspace_agents WHERE workspace_id = ?").all(ws.id).map((a) => a.agent_id);
      return { ...ws, agent_ids: agentIds, active: ws.active === 1 };
    });
  },
  getById: (id) => {
    const workspace = database_default.prepare("SELECT * FROM workspaces WHERE id = ?").get(id);
    if (!workspace) return null;
    const agents = database_default.prepare(`
      SELECT a.* FROM agents a
      JOIN workspace_agents wa ON wa.agent_id = a.id
      WHERE wa.workspace_id = ?
    `).all(id);
    const agentIds = agents.map((a) => a.id);
    const messages = database_default.prepare("SELECT * FROM messages WHERE workspace_id = ? ORDER BY created_at ASC").all(id);
    const files = database_default.prepare("SELECT * FROM workspace_files WHERE workspace_id = ?").all(id);
    return { ...workspace, agents, agent_ids: agentIds, messages, files };
  },
  create: (workspace) => {
    const stmt = database_default.prepare(`
      INSERT INTO workspaces (id, name, description, objective, view_mode, active)
      VALUES (@id, @name, @description, @objective, @view_mode, @active)
    `);
    const result = stmt.run({
      ...workspace,
      view_mode: workspace.view_mode || "ide",
      active: workspace.active === false ? 0 : 1
    });
    if (workspace.agent_ids && Array.isArray(workspace.agent_ids)) {
      for (const agentId of workspace.agent_ids) {
        const agentExists = database_default.prepare("SELECT id FROM agents WHERE id = ?").get(agentId);
        if (agentExists) {
          database_default.prepare("INSERT INTO workspace_agents (workspace_id, agent_id) VALUES (?, ?)").run(workspace.id, agentId);
        }
      }
    }
    return result;
  },
  update: (id, workspace) => {
    const stmt = database_default.prepare(`
      UPDATE workspaces SET name = @name, description = @description, 
      objective = @objective, view_mode = @view_mode, active = @active
      WHERE id = @id
    `);
    const result = stmt.run({
      objective: "",
      view_mode: "ide",
      ...workspace,
      id,
      active: workspace.active === false ? 0 : 1
    });
    if (workspace.agent_ids && Array.isArray(workspace.agent_ids)) {
      database_default.prepare("DELETE FROM workspace_agents WHERE workspace_id = ?").run(id);
      for (const agentId of workspace.agent_ids) {
        const agentExists = database_default.prepare("SELECT id FROM agents WHERE id = ?").get(agentId);
        if (agentExists) {
          database_default.prepare("INSERT INTO workspace_agents (workspace_id, agent_id) VALUES (?, ?)").run(id, agentId);
        }
      }
    }
    return result;
  },
  addAgent: (workspaceId, agentId) => {
    const agentExists = database_default.prepare("SELECT id FROM agents WHERE id = ?").get(agentId);
    if (!agentExists) throw new Error(`Agent ${agentId} does not exist`);
    return database_default.prepare("INSERT OR IGNORE INTO workspace_agents (workspace_id, agent_id) VALUES (?, ?)").run(workspaceId, agentId);
  },
  removeAgent: (workspaceId, agentId) => {
    return database_default.prepare("DELETE FROM workspace_agents WHERE workspace_id = ? AND agent_id = ?").run(workspaceId, agentId);
  },
  delete: (id) => database_default.prepare("DELETE FROM workspaces WHERE id = ?").run(id)
};
var SettingsRepository = {
  get: (key) => database_default.prepare("SELECT value FROM settings WHERE key = ?").get(key),
  set: (key, value) => database_default.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value),
  getAll: () => database_default.prepare("SELECT * FROM settings").all()
};

// server/services/FileService.ts
import fs2 from "fs";
import path2 from "path";

// server/repositories/FileRepository.ts
var FileRepository = {
  findByWorkspace: (workspaceId) => {
    return database_default.prepare("SELECT * FROM workspace_files WHERE workspace_id = ? ORDER BY created_at DESC").all(workspaceId);
  },
  create: (file) => {
    const { id, workspace_id, name, path: path5, type, category } = file;
    return database_default.prepare(`
      INSERT INTO workspace_files (id, workspace_id, name, path, type, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, workspace_id, name, path5, type, category || "generated");
  },
  update: (id, file) => {
    const { name, path: path5, created_at } = file;
    return database_default.prepare(`
      UPDATE workspace_files SET name = COALESCE(?, name), path = COALESCE(?, path), created_at = COALESCE(?, created_at)
      WHERE id = ?
    `).run(name, path5, created_at, id);
  },
  deleteByWorkspaceAndName: (workspaceId, name) => {
    return database_default.prepare("DELETE FROM workspace_files WHERE workspace_id = ? AND name = ?").run(workspaceId, name);
  },
  deleteByPath: (workspaceId, path5) => {
    return database_default.prepare("DELETE FROM workspace_files WHERE workspace_id = ? AND path = ?").run(workspaceId, path5);
  },
  findByName: (workspaceId, name) => {
    return database_default.prepare("SELECT * FROM workspace_files WHERE workspace_id = ? AND name = ?").get(workspaceId, name);
  },
  updateByName: (workspaceId, name, data) => {
    const { path: path5, created_at } = data;
    return database_default.prepare("UPDATE workspace_files SET path = ?, created_at = ? WHERE workspace_id = ? AND name = ?").run(path5, created_at, workspaceId, name);
  }
};

// server/services/FileService.ts
var FileService = {
  getWorkspaceDir: (workspaceId) => {
    const dir = path2.join(process.cwd(), "data", "workspaces", workspaceId);
    if (!fs2.existsSync(dir)) {
      fs2.mkdirSync(dir, { recursive: true });
    }
    return dir;
  },
  createItem: (workspaceId, relativePath, type, content = "") => {
    const dir = FileService.getWorkspaceDir(workspaceId);
    const fullPath = path2.join(dir, relativePath);
    if (type === "directory") {
      fs2.mkdirSync(fullPath, { recursive: true });
    } else {
      fs2.mkdirSync(path2.dirname(fullPath), { recursive: true });
      fs2.writeFileSync(fullPath, content);
    }
    return fullPath;
  },
  deleteItem: (workspaceId, relativePath) => {
    const dir = FileService.getWorkspaceDir(workspaceId);
    const fullPath = path2.join(dir, relativePath);
    if (fs2.existsSync(fullPath)) {
      fs2.rmSync(fullPath, { recursive: true, force: true });
    }
    FileRepository.deleteByPath(workspaceId, relativePath);
  },
  saveFile: (workspaceId, fileName, content) => {
    const dir = FileService.getWorkspaceDir(workspaceId);
    const filePath = path2.join(dir, fileName);
    fs2.writeFileSync(filePath, content);
    return filePath;
  },
  deleteFile: (workspaceId, fileName) => {
    const dir = FileService.getWorkspaceDir(workspaceId);
    const filePath = path2.join(dir, fileName);
    if (fs2.existsSync(filePath)) {
      fs2.unlinkSync(filePath);
    }
  },
  deleteWorkspaceDir: (workspaceId) => {
    const dir = path2.join(process.cwd(), "data", "workspaces", workspaceId);
    if (fs2.existsSync(dir)) {
      fs2.rmSync(dir, { recursive: true, force: true });
    }
    const uploadDir = path2.join(process.cwd(), "data", workspaceId);
    if (fs2.existsSync(uploadDir)) {
      fs2.rmSync(uploadDir, { recursive: true, force: true });
    }
  },
  renameItem: (workspaceId, oldPath, newPath) => {
    const dir = FileService.getWorkspaceDir(workspaceId);
    const oldFullPath = path2.join(dir, oldPath);
    const newFullPath = path2.join(dir, newPath);
    if (fs2.existsSync(oldFullPath)) {
      fs2.mkdirSync(path2.dirname(newFullPath), { recursive: true });
      fs2.renameSync(oldFullPath, newFullPath);
    }
    return newFullPath;
  },
  moveItem: (workspaceId, oldPath, newParentPath) => {
    const dir = FileService.getWorkspaceDir(workspaceId);
    const oldFullPath = path2.join(dir, oldPath);
    const newFullPath = path2.join(dir, newParentPath, path2.basename(oldPath));
    if (fs2.existsSync(oldFullPath)) {
      fs2.renameSync(oldFullPath, newFullPath);
    }
    return newFullPath;
  },
  getFileTree: (dir, baseDir = "") => {
    const items = fs2.readdirSync(dir, { withFileTypes: true });
    return items.map((item) => {
      const relativePath = path2.join(baseDir, item.name).replace(/\\/g, "/");
      const fullPath = path2.join(dir, item.name);
      if (item.isDirectory()) {
        return {
          name: item.name,
          path: relativePath,
          type: "directory",
          children: FileService.getFileTree(fullPath, relativePath)
        };
      }
      return {
        name: item.name,
        path: relativePath,
        type: "file",
        size: fs2.statSync(fullPath).size,
        mtime: fs2.statSync(fullPath).mtime
      };
    });
  }
};

// server/services/AgentService.ts
import path3 from "path";
import fs3 from "fs";
import { exec } from "child_process";
import { GoogleGenAI } from "@google/genai";
var AgentService = {
  async chat(model, messages, systemPrompt, onChunk) {
    const settings = SettingsRepository.getAll();
    const getSetting = (key) => settings.find((s) => s.key === key)?.value || "";
    const globalRules = getSetting("global_rules_prompt");
    const fullSystemPrompt = globalRules ? `${globalRules}

${systemPrompt}` : systemPrompt;
    const geminiKey = getSetting("gemini_api_key") && getSetting("gemini_api_key") !== "********" ? getSetting("gemini_api_key") : process.env.GEMINI_API_KEY;
    const groqKey = getSetting("groq_api_key") && getSetting("groq_api_key") !== "********" ? getSetting("groq_api_key") : process.env.GROQ_API_KEY;
    const ollamaUrl = getSetting("ollama_url") || "http://localhost:11434";
    if (model.startsWith("gemini-") && geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const geminiHistory = messages.map((m) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }]
        }));
        const result = await ai.models.generateContentStream({
          model,
          contents: geminiHistory,
          config: { systemInstruction: fullSystemPrompt }
        });
        let fullText = "";
        for await (const chunk of result) {
          const chunkText = chunk.text;
          if (chunkText) {
            fullText += chunkText;
            if (onChunk) onChunk(chunkText);
          }
        }
        return fullText || "No response from Gemini";
      } catch (e) {
        console.error("Gemini Error:", e);
        return `Erro no modelo Gemini: ${e.message}`;
      }
    }
    const groqModels = ["llama3-8b-8192", "llama3-70b-8192", "mixtral-8x7b-32768", "gemma-7b-it"];
    if ((model.startsWith("groq/") || groqModels.includes(model)) && groqKey) {
      try {
        const groqModel = model.replace("groq/", "");
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: groqModel,
            messages: [
              { role: "system", content: fullSystemPrompt },
              ...messages
            ],
            stream: true
          })
        });
        if (!response.ok) throw new Error(`GROQ API failed: ${response.statusText}`);
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.substring(6));
                const content = data.choices[0].delta?.content || "";
                if (content) {
                  fullText += content;
                  if (onChunk) onChunk(content);
                }
              } catch (e) {
              }
            }
          }
        }
        return fullText;
      } catch (e) {
        console.error("GROQ Model Error:", e);
        return `Erro no modelo GROQ: ${e.message}`;
      }
    }
    try {
      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: fullSystemPrompt },
            ...messages
          ],
          stream: true
        })
      });
      if (!response.ok) {
        throw new Error(`Ollama Error: ${response.statusText}`);
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const segments = chunk.split("\n").filter((s) => s.trim());
        for (const segment of segments) {
          try {
            const data = JSON.parse(segment);
            if (data.message?.content) {
              fullText += data.message.content;
              if (onChunk) onChunk(data.message.content);
            }
            if (data.done) break;
          } catch (e) {
          }
        }
      }
      return fullText;
    } catch (error) {
      console.error("Ollama Connection Error:", error);
      const isRefused = error.code === "ECONNREFUSED" || error.message.includes("fetch failed");
      if (isRefused) {
        return `Erro de Conex\xE3o: O sistema n\xE3o conseguiu falar com o Ollama em ${ollamaUrl}. Por favor, certifique-se de que o aplicativo Ollama est\xE1 aberto e rodando no seu computador.`;
      }
      return `Erro ao processar com Ollama: ${error.message}`;
    }
  },
  // Tools for the 'Agent' mode
  async executeAgentAction(workspaceId, action, params) {
    const workspaceDir = FileService.getWorkspaceDir(workspaceId);
    if ((action === "create_file" || action === "edit_file") && (!params.content || params.content.trim() === "")) {
      return "Erro: O conte\xFAdo do arquivo n\xE3o pode estar vazio (Protocol Violation).";
    }
    if (!params.name && (action === "create_file" || action === "edit_file" || action === "delete_file")) {
      params.name = params.path;
    }
    if (!params.name && action !== "read_workspace" && action !== "run_command" && action !== "mkdir" && action !== "rename" && action !== "delete") {
      return "Erro: Nome do arquivo ou caminho \xE9 obrigat\xF3rio.";
    }
    switch (action) {
      case "create_file":
      case "mkdir":
        if (action === "mkdir") {
          FileService.createItem(workspaceId, params.path || params.name, "directory");
          return `Diret\xF3rio ${params.path || params.name} criado.`;
        }
        FileService.saveFile(workspaceId, params.name, params.content);
        return `Arquivo ${params.name} criado com sucesso.`;
      case "edit_file":
        const filePath = path3.join(workspaceDir, params.name);
        if (fs3.existsSync(filePath)) {
          fs3.writeFileSync(filePath, params.content);
          return `Arquivo ${params.name} editado com sucesso.`;
        }
        return `Erro: Arquivo ${params.name} n\xE3o encontrado.`;
      case "rename":
        FileService.renameItem(workspaceId, params.oldPath, params.newPath);
        return `Renomeado de ${params.oldPath} para ${params.newPath}.`;
      case "delete_file":
      case "delete":
        FileService.deleteItem(workspaceId, params.path || params.name);
        return `Item ${params.path || params.name} exclu\xEDdo.`;
      case "read_workspace":
        const tree = FileService.getFileTree(workspaceDir);
        return JSON.stringify(tree, null, 2);
      case "run_command":
        return new Promise((resolve) => {
          exec(params.command, { cwd: workspaceDir }, (error, stdout, stderr) => {
            if (error) {
              resolve(`Erro ao executar comando: ${error.message}
${stderr}`);
              return;
            }
            resolve(stdout || "Comando executado com sucesso (sem sa\xEDda).");
          });
        });
      default:
        return "A\xE7\xE3o desconhecida ou n\xE3o suportada pelo protocolo.";
    }
  }
};

// server/controllers/index.ts
var workspaceLocks = /* @__PURE__ */ new Set();
var AgentController = {
  getAll: (req, res) => {
    try {
      res.json(AgentRepository.getAll());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  create: (req, res) => {
    try {
      const id = Math.random().toString(36).substring(2, 11);
      AgentRepository.create({ ...req.body, id });
      res.json({ id });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  update: (req, res) => {
    try {
      AgentRepository.update(req.params.id, req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  delete: (req, res) => {
    try {
      AgentRepository.delete(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
var WorkspaceController = {
  getAll: (req, res) => {
    try {
      res.json(WorkspaceRepository.getAll());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  getOne: (req, res) => {
    try {
      res.json(WorkspaceRepository.getById(req.params.id));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  create: (req, res) => {
    try {
      const id = req.body.id || Math.random().toString(36).substring(2, 11);
      WorkspaceRepository.create({ ...req.body, id });
      res.json({ id });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  update: (req, res) => {
    try {
      WorkspaceRepository.update(req.params.id, req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  delete: (req, res) => {
    try {
      const { id } = req.params;
      WorkspaceRepository.delete(id);
      FileService.deleteWorkspaceDir(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  addAgent: (req, res) => {
    try {
      const { id } = req.params;
      const { agentId } = req.body;
      WorkspaceRepository.addAgent(id, agentId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  removeAgent: (req, res) => {
    try {
      const { id, agentId } = req.params;
      WorkspaceRepository.removeAgent(id, agentId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  executeAction: async (req, res) => {
    try {
      const { id } = req.params;
      const { action, params, agentId } = req.body;
      const result = await AgentService.executeAgentAction(id, action, params);
      const agent = AgentRepository.getById(agentId);
      const agentName = agent ? agent.name : "Agent";
      const msgId = Math.random().toString(36).substring(2, 11);
      database_default.prepare("INSERT INTO messages (id, workspace_id, sender_id, sender_name, content, role) VALUES (?, ?, ?, ?, ?, ?)").run(msgId, id, agentId || "system", agentName, `[SISTEMA]: ${result}`, "agent");
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  chat: async (req, res) => {
    const { id } = req.params;
    if (workspaceLocks.has(id)) {
      return res.status(429).json({ error: "The agent is already busy in this workspace." });
    }
    workspaceLocks.add(id);
    try {
      const { content, agentId, mode } = req.body;
      const workspace = WorkspaceRepository.getById(id);
      const agent = AgentRepository.getById(agentId);
      if (!workspace || !agent) return res.status(404).json({ error: "Not found" });
      const userMsgId = Math.random().toString(36).substring(2, 11);
      const userMsg = { id: userMsgId, workspace_id: id, sender_id: "user", sender_name: "User", content, role: "user", created_at: (/* @__PURE__ */ new Date()).toISOString() };
      database_default.prepare("INSERT INTO messages (id, workspace_id, sender_id, sender_name, content, role) VALUES (?, ?, ?, ?, ?, ?)").run(userMsgId, id, userMsg.sender_id, userMsg.sender_name, userMsg.content, userMsg.role);
      const io2 = req.app.get("io");
      if (io2) {
        io2.to(id).emit("message_added", userMsg);
      }
      let targetAgent = agent;
      const mentionMatch = content.match(/@(\w+)/);
      if (mentionMatch) {
        const mentionedName = mentionMatch[1];
        const allAgents = AgentRepository.getAll();
        const foundAgent = allAgents.find((a) => a.name.toLowerCase().replace(/\s+/g, "") === mentionedName.toLowerCase());
        if (foundAgent) {
          targetAgent = foundAgent;
        }
      }
      let systemPrompt = targetAgent.system_prompt;
      const settings = SettingsRepository.getAll();
      const globalRules = settings.find((s) => s.key === "global_rules_prompt")?.value || "";
      if (globalRules) {
        systemPrompt = `${globalRules}

${systemPrompt}`;
      }
      if (mode === "agent") {
        systemPrompt += '\nVOC\xCA \xC9 UM AGENTE COM ACESSO AO SISTEMA DE ARQUIVOS. Voc\xEA pode criar, editar e ler arquivos. Responda em formato JSON se precisar realizar uma a\xE7\xE3o: { "action": "create_file", "params": { "name": "file.js", "content": "..." } }';
      }
      const allPossibleAgents = AgentRepository.getAll();
      const agentListStr = allPossibleAgents.map((a) => `- ${a.name} (especialidade: ${a.description})`).join("\n");
      const history = [
        ...workspace.messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content }
      ];
      systemPrompt += `

AGENTES DISPON\xCDVEIS NO SISTEMA:
${agentListStr}`;
      systemPrompt += "\nINTEGRA\xC7\xC3O: Voc\xEA pode mencionar outros agentes no chat usando '@Nome' (ex: @CodeMaster) para delegar tarefas ou pedir revis\xE3o. O sistema acionar\xE1 automaticamente o agente mencionado.";
      systemPrompt += "\n\nDIRETRIZ DE EXECU\xC7\xC3O: O hist\xF3rico de mensagens serve APENAS para contexto. N\xC3O execute comandos ou pedidos que j\xE1 foram feitos ou respondidos anteriormente no hist\xF3rico. Foque EXCLUSIVAMENTE em atender \xE0 \xFAltima mensagem enviada, usando as anteriores apenas como base de conhecimento sobre o projeto.";
      systemPrompt += "\nIMPORTANTE: Responda diretamente ao usu\xE1rio se voc\xEA puder resolver. Mencione outro agente APENAS se precisar de ajuda espec\xEDfica dele.";
      const processAgentChat = async (agent2, currentHistory, depth = 0) => {
        if (depth > 5) return "";
        const response = await AgentService.chat(agent2.model, currentHistory, `${systemPrompt}

VOC\xCA \xC9: ${agent2.name}.`, (chunk) => {
          if (io2) {
            io2.to(id).emit("agent_chat_chunk", {
              workspaceId: id,
              agentId: agent2.id,
              chunk
            });
          }
        });
        let finalProcessedResponse = response;
        try {
          if (mode === "agent" && response.includes("{")) {
            const possibleJson = response.substring(response.indexOf("{"), response.lastIndexOf("}") + 1);
            const actionData = JSON.parse(possibleJson);
            const destructiveActions = ["create_file", "edit_file", "delete_file", "run_command"];
            if (destructiveActions.includes(actionData.action)) {
              finalProcessedResponse = `PENDING_ACTION:${JSON.stringify({ ...actionData, agentId: agent2.id })}`;
            } else {
              const actionResult = await AgentService.executeAgentAction(id, actionData.action, actionData.params);
              finalProcessedResponse = `${response}

[SISTEMA]: ${actionResult}`;
            }
          }
        } catch (e) {
        }
        const agentMsgId = Math.random().toString(36).substring(2, 11);
        const agentMsg = { id: agentMsgId, workspace_id: id, sender_id: agent2.id, sender_name: agent2.name, content: finalProcessedResponse, role: "agent", created_at: (/* @__PURE__ */ new Date()).toISOString() };
        database_default.prepare("INSERT INTO messages (id, workspace_id, sender_id, sender_name, content, role) VALUES (?, ?, ?, ?, ?, ?)").run(agentMsgId, id, agent2.id, agent2.name, finalProcessedResponse, "agent");
        if (io2) {
          io2.to(id).emit("message_added", agentMsg);
        }
        const allAgents = AgentRepository.getAll();
        const mentionMatch2 = response.match(/@(\w+)/g);
        if (mentionMatch2) {
          for (const mention of mentionMatch2) {
            const agentName = mention.substring(1).toLowerCase();
            const mentionedAgent = allAgents.find((a) => a.name.toLowerCase().replace(/\s+/g, "") === agentName);
            if (mentionedAgent && mentionedAgent.id !== agent2.id) {
              const nextHistory = [
                ...currentHistory,
                { role: "user", content: `[MESSAGE FROM ${agent2.name.toUpperCase()}]: ${response}` }
              ];
              await processAgentChat(mentionedAgent, nextHistory, depth + 1);
            }
          }
        }
        return finalProcessedResponse;
      };
      const finalResponse = await processAgentChat(targetAgent, history);
      res.json({ content: finalResponse });
    } catch (error) {
      console.error("Chat Error:", error);
      res.status(500).json({ error: error.message });
    } finally {
      workspaceLocks.delete(id);
    }
  }
};

// server.ts
var upload = multer({ dest: "uploads/" });
async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });
  app.use(express.json());
  app.set("io", io);
  app.get("/api/settings", (req, res) => {
    const settings = SettingsRepository.getAll();
    const maskedSettings = settings.map((s) => {
      if (s.key.includes("api_key") && s.value && s.value !== "Configured") {
        return { ...s, value: "********" };
      }
      return s;
    });
    const envKeys = [
      { key: "env_gemini_key", value: process.env.GEMINI_API_KEY ? "Configured" : "" },
      { key: "env_groq_key", value: process.env.GROQ_API_KEY ? "Configured" : "" }
    ];
    res.json([...maskedSettings, ...envKeys]);
  });
  app.post("/api/settings", (req, res) => {
    const { key, value } = req.body;
    SettingsRepository.set(key, value);
    if (key === "global_rules_prompt") {
      console.log("Global Rules Updated in studio.db");
    }
    res.json({ success: true });
  });
  app.get("/api/agents", AgentController.getAll);
  app.post("/api/agents", AgentController.create);
  app.put("/api/agents/:id", AgentController.update);
  app.delete("/api/agents/:id", AgentController.delete);
  app.get("/api/workspaces", WorkspaceController.getAll);
  app.get("/api/workspaces/:id", WorkspaceController.getOne);
  app.post("/api/workspaces", WorkspaceController.create);
  app.put("/api/workspaces/:id", WorkspaceController.update);
  app.delete("/api/workspaces/:id", WorkspaceController.delete);
  app.post("/api/workspaces/:id/agents", WorkspaceController.addAgent);
  app.delete("/api/workspaces/:id/agents/:agentId", WorkspaceController.removeAgent);
  app.post("/api/workspaces/:id/chat", WorkspaceController.chat);
  app.post("/api/workspaces/:id/actions/execute", WorkspaceController.executeAction);
  app.post("/api/workspaces/:id/open", (req, res) => {
    const { id } = req.params;
    const workspaceDir = FileService.getWorkspaceDir(id);
    const command = os.platform() === "win32" ? `explorer "${workspaceDir}"` : os.platform() === "darwin" ? `open "${workspaceDir}"` : `xdg-open "${workspaceDir}"`;
    childSpawn(command, { shell: true });
    res.json({ success: true });
  });
  app.get("/api/models/local", async (req, res) => {
    try {
      const response = await fetch("http://localhost:11434/api/tags");
      if (!response.ok) throw new Error("Ollama not running");
      const data = await response.json();
      res.json(data.models || []);
    } catch (e) {
      res.json([]);
    }
  });
  app.get("/api/files/tree", (req, res) => {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ error: "Workspace ID required" });
    const dir = FileService.getWorkspaceDir(workspaceId);
    res.json(FileService.getFileTree(dir));
  });
  app.post("/api/files/upload", upload.single("file"), (req, res) => {
    const { workspaceId, category } = req.body;
    const file = req.file;
    if (!file || !workspaceId) return res.status(400).json({ error: "File and Workspace ID required" });
    const id = Math.random().toString(36).substring(2, 11);
    const workspaceDir = FileService.getWorkspaceDir(workspaceId);
    const targetDir = path4.join(workspaceDir, category || "context");
    if (!fs4.existsSync(targetDir)) fs4.mkdirSync(targetDir, { recursive: true });
    const targetPath = path4.join(targetDir, file.originalname);
    fs4.renameSync(file.path, targetPath);
    database_default.prepare("INSERT INTO workspace_files (id, workspace_id, name, path, type, category) VALUES (?, ?, ?, ?, ?, ?)").run(id, workspaceId, file.originalname, targetPath.replace(workspaceDir, "").replace(/^\//, ""), file.mimetype, category || "context");
    res.json({ success: true, id });
  });
  app.get("/api/files/content", (req, res) => {
    const { workspaceId, path: filePath } = req.query;
    if (!workspaceId || !filePath) return res.status(400).json({ error: "Workspace ID and Path required" });
    const workspaceDir = FileService.getWorkspaceDir(workspaceId);
    const fullPath = path4.join(workspaceDir, filePath);
    if (fs4.existsSync(fullPath)) {
      res.json({ content: fs4.readFileSync(fullPath, "utf-8") });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });
  app.post("/api/files/save", express.json(), (req, res) => {
    const { workspaceId, path: filePath, content } = req.body;
    if (!workspaceId || !filePath) return res.status(400).json({ error: "Workspace ID and Path required" });
    const workspaceDir = FileService.getWorkspaceDir(workspaceId);
    const fullPath = path4.join(workspaceDir, filePath);
    try {
      fs4.mkdirSync(path4.dirname(fullPath), { recursive: true });
      fs4.writeFileSync(fullPath, content, "utf-8");
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/files/new", (req, res) => {
    const { workspaceId, path: filePath, type, content } = req.body;
    try {
      if (type === "file" && (!content || content.length < 1)) {
        return res.status(400).json({ error: "File content cannot be empty." });
      }
      FileService.createItem(workspaceId, filePath, type, content);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/files/rename", (req, res) => {
    const { workspaceId, oldPath, newPath } = req.body;
    try {
      FileService.renameItem(workspaceId, oldPath, newPath);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/files/move", (req, res) => {
    const { workspaceId, oldPath, newParentPath } = req.body;
    try {
      FileService.moveItem(workspaceId, oldPath, newParentPath);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/files/delete", (req, res) => {
    const { workspaceId, path: filePath } = req.query;
    try {
      FileService.deleteItem(workspaceId, filePath);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  const watcher = chokidar.watch(path4.join(process.cwd(), "data", "workspaces"), {
    persistent: true,
    ignoreInitial: true,
    depth: 99
  });
  watcher.on("all", (event, filePath) => {
    const relative = path4.relative(path4.join(process.cwd(), "data", "workspaces"), filePath);
    const parts = relative.split(path4.sep);
    const workspaceId = parts[0];
    if (workspaceId) {
      io.to(workspaceId).emit("file_change", { event, path: relative });
    }
  });
  io.on("connection", (socket) => {
    const workspaceId = socket.handshake.query.workspaceId;
    if (workspaceId) {
      socket.join(workspaceId);
    }
    console.log("Client connected:", socket.id, "Workspace:", workspaceId);
    const isWin = os.platform() === "win32";
    const shellCommand = isWin ? "powershell.exe" : "bash";
    const workspacePath = workspaceId ? path4.join(process.cwd(), "data", "workspaces", workspaceId) : process.cwd();
    if (!fs4.existsSync(workspacePath)) {
      fs4.mkdirSync(workspacePath, { recursive: true });
    }
    const ptyProcess = pty.spawn(shellCommand, [], {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd: workspacePath,
      env: { ...process.env, TERM: "xterm-256color" }
    });
    if (isWin) {
      ptyProcess.write("chcp 65001\r\n");
      ptyProcess.write("clear\r\n");
    }
    ptyProcess.onData((data) => {
      socket.emit("terminal_output", data);
    });
    socket.on("terminal_input", (data) => {
      if (ptyProcess) {
        if (data === "cls\r" || data === "clear\r") {
        }
        ptyProcess.write(data);
      }
    });
    socket.on("terminal_resize", (size) => {
      if (ptyProcess) {
        ptyProcess.resize(size.cols, size.rows);
      }
    });
    socket.on("disconnect", () => {
      ptyProcess.kill();
      console.log("Client disconnected, terminal killed.");
    });
  });
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  });
  const isPkg = process.pkg !== void 0;
  const staticPath = isPkg ? path4.join(__dirname, "dist-client") : path4.join(process.cwd(), "dist-client");
  if (process.env.NODE_ENV !== "production" && !isPkg) {
    const { createServer: createViteServer } = await eval('import("vite")');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(staticPath));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) {
        res.status(404).json({ error: "API route not found" });
      } else {
        res.sendFile(path4.join(staticPath, "index.html"));
      }
    });
  }
  const PORT = 3e3;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
try {
  startServer().catch((err) => {
    fs4.writeFileSync(path4.join(process.cwd(), "erro_fatal.log"), `Erro na Promise startServer: ${err.stack || err}
`);
    process.exit(1);
  });
} catch (e) {
  fs4.writeFileSync(path4.join(process.cwd(), "erro_fatal.log"), `Erro S\xEDncrono: ${e.stack || e}
`);
  process.exit(1);
}
