import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import os from "os";
import { spawn as childSpawn } from "child_process";
import pty from "node-pty";
import multer from "multer";
import chokidar from "chokidar";
import { AgentController, WorkspaceController } from "./server/controllers";
import { FileService } from "./server/services/FileService";
import { SettingsRepository } from "./server/repositories";
import db from "./server/config/database";

const upload = multer({ dest: 'uploads/' });

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  app.use(express.json());
  app.set("io", io);

  // API Routes
  app.get("/api/settings", (req, res) => {
    const settings = SettingsRepository.getAll();
    const maskedSettings = settings.map((s: any) => {
      // PROIBIDO mascarar URLs de conexão local
      if (s.key.includes('api_key') && s.value && s.value !== 'Configured') {
        return { ...s, value: '********' };
      }
      return s;
    });
    
    // Add environment indicators
    const envKeys = [
      { key: 'env_gemini_key', value: process.env.GEMINI_API_KEY ? 'Configured' : '' },
      { key: 'env_groq_key', value: process.env.GROQ_API_KEY ? 'Configured' : '' }
    ];
    
    res.json([...maskedSettings, ...envKeys]);
  });
  app.post("/api/settings", (req, res) => {
    const { key, value } = req.body;
    SettingsRepository.set(key, value);
    if (key === 'global_rules_prompt') {
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
    const command = os.platform() === 'win32' ? `explorer "${workspaceDir}"` : os.platform() === 'darwin' ? `open "${workspaceDir}"` : `xdg-open "${workspaceDir}"`;
    childSpawn(command, { shell: true });
    res.json({ success: true });
  });

  // Models API
  app.get("/api/models/local", async (req, res) => {
    try {
      const response = await fetch("http://localhost:11434/api/tags");
      if (!response.ok) throw new Error("Ollama not running");
      const data = await response.json();
      res.json(data.models || []);
    } catch (e) {
      res.json([]); // Return empty if Ollama is off
    }
  });

  // File Tree API
  app.get("/api/files/tree", (req, res) => {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ error: "Workspace ID required" });
    const dir = FileService.getWorkspaceDir(workspaceId as string);
    res.json(FileService.getFileTree(dir));
  });
  
  app.post("/api/files/upload", upload.single('file'), (req, res) => {
    const { workspaceId, category } = req.body;
    const file = req.file;
    if (!file || !workspaceId) return res.status(400).json({ error: "File and Workspace ID required" });

    const id = Math.random().toString(36).substring(2, 11);
    const workspaceDir = FileService.getWorkspaceDir(workspaceId);
    const targetDir = path.join(workspaceDir, category || 'context');
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    
    const targetPath = path.join(targetDir, file.originalname);
    fs.renameSync(file.path, targetPath);

    db.prepare("INSERT INTO workspace_files (id, workspace_id, name, path, type, category) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, workspaceId, file.originalname, targetPath.replace(workspaceDir, '').replace(/^\//, ''), file.mimetype, category || 'context');

    res.json({ success: true, id });
  });

  app.get("/api/files/content", (req, res) => {
    const { workspaceId, path: filePath } = req.query;
    if (!workspaceId || !filePath) return res.status(400).json({ error: "Workspace ID and Path required" });
    
    const workspaceDir = FileService.getWorkspaceDir(workspaceId as string);
    const fullPath = path.join(workspaceDir, filePath as string);
    
    if (fs.existsSync(fullPath)) {
      res.json({ content: fs.readFileSync(fullPath, "utf-8") });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  app.post("/api/files/save", express.json(), (req, res) => {
    const { workspaceId, path: filePath, content } = req.body;
    if (!workspaceId || !filePath) return res.status(400).json({ error: "Workspace ID and Path required" });
    
    const workspaceDir = FileService.getWorkspaceDir(workspaceId);
    const fullPath = path.join(workspaceDir, filePath);
    try {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, "utf-8");
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.post("/api/files/new", (req, res) => {
    const { workspaceId, path: filePath, type, content } = req.body;
    try {
      // Validation: Proibido disparar 'create_file' com a propriedade 'content' vazia
      // We only enforce this for files, not directories.
      if (type === 'file' && (!content || content.length < 1)) {
        return res.status(400).json({ error: "File content cannot be empty." });
      }
      FileService.createItem(workspaceId, filePath, type, content);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.post("/api/files/rename", (req, res) => {
    const { workspaceId, oldPath, newPath } = req.body;
    try {
      FileService.renameItem(workspaceId, oldPath, newPath);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.post("/api/files/move", (req, res) => {
    const { workspaceId, oldPath, newParentPath } = req.body;
    try {
      FileService.moveItem(workspaceId, oldPath, newParentPath);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.delete("/api/files/delete", (req, res) => {
    const { workspaceId, path: filePath } = req.query;
    try {
      FileService.deleteItem(workspaceId as string, filePath as string);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Socket.io for Terminal and Real-time updates
  const watcher = chokidar.watch(path.join(process.cwd(), "data", "workspaces"), {
    persistent: true,
    ignoreInitial: true,
    depth: 99
  });

  watcher.on("all", (event, filePath) => {
    const relative = path.relative(path.join(process.cwd(), "data", "workspaces"), filePath);
    const parts = relative.split(path.sep);
    const workspaceId = parts[0];
    if (workspaceId) {
      io.to(workspaceId).emit("file_change", { event, path: relative });
    }
  });

  io.on("connection", (socket) => {
    const workspaceId = socket.handshake.query.workspaceId as string;
    if (workspaceId) {
      socket.join(workspaceId);
    }
    console.log("Client connected:", socket.id, "Workspace:", workspaceId);

    const isWin = os.platform() === "win32";
    const shellCommand = isWin ? 'powershell.exe' : 'bash';
    const workspacePath = workspaceId ? path.join(process.cwd(), 'data', 'workspaces', workspaceId) : process.cwd();

    // Ensure physical directory exists
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true });
    }

    // NATIVE TERMINAL INTEGRATION (node-pty)
    const ptyProcess = pty.spawn(shellCommand, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: workspacePath,
      env: { ...process.env, TERM: 'xterm-256color' }
    });

    if (isWin) {
      ptyProcess.write("chcp 65001\r\n"); // Force UTF-8
      ptyProcess.write("clear\r\n");      // Clear screen for professional look
    }

    ptyProcess.onData((data) => {
      socket.emit('terminal_output', data);
    });

    socket.on("terminal_input", (data) => {
      if (ptyProcess) {
        // Normalization: xterm.js Enter to Windows CRLF if needed
        // node-pty handles most of this, but we'll follow directive if manual clear is needed
        if (data === 'cls\r' || data === 'clear\r') {
           // We'll let the shell handle it, but node-pty is real so it should work natively.
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

  // 404 for API routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  });

  // Vite integration
  const isPkg = (process as any).pkg !== undefined;
  // No formato portátil, o site fica na pasta dist-client ao lado do arquivo
  const staticPath = path.join(process.cwd(), "dist-client");

  if (process.env.NODE_ENV !== "production" && !isPkg) {
    const { createServer: createViteServer } = await (eval('import("vite")') as any);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(staticPath));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) {
        res.status(404).json({ error: "API route not found" });
      } else {
        res.sendFile(path.join(staticPath, "index.html"));
      }
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Auto-open browser in production
    const isPkg = (process as any).pkg !== undefined;
    if (process.env.NODE_ENV === "production" || isPkg) {
      const url = `http://localhost:${PORT}`;
      const start = os.platform() === 'win32' ? 'start' : os.platform() === 'darwin' ? 'open' : 'xdg-open';
      childSpawn(`${start} ${url}`, { shell: true });
    }
  });
}

// Inicialização com captura de erro fatal para binários
try {
  startServer().catch(err => {
    fs.writeFileSync(path.join(process.cwd(), "erro_fatal.log"), `Erro na Promise startServer: ${err.stack || err}\n`);
    process.exit(1);
  });
} catch (e) {
  fs.writeFileSync(path.join(process.cwd(), "erro_fatal.log"), `Erro Síncrono: ${(e as Error).stack || e}\n`);
  process.exit(1);
}
