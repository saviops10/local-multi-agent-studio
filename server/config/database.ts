import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = path.join(process.cwd(), "data", "database.sqlite");
const dataDir = path.join(process.cwd(), "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize tables
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

// Migration for existing databases
try {
  db.exec("ALTER TABLE agents ADD COLUMN top_p REAL DEFAULT 1.0");
} catch (e) {}
try {
  db.exec("ALTER TABLE agents ADD COLUMN max_tokens INTEGER DEFAULT 2048");
} catch (e) {}
try {
  db.exec("ALTER TABLE agents ADD COLUMN is_cloud INTEGER DEFAULT 0");
} catch (e) {}
try {
  db.exec("ALTER TABLE workspaces ADD COLUMN view_mode TEXT DEFAULT 'ide'");
} catch (e) {}
try {
  db.exec("ALTER TABLE workspaces ADD COLUMN active INTEGER DEFAULT 1");
} catch (e) {}

export default db;
