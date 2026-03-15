import { Request, Response } from "express";
import { AgentRepository, WorkspaceRepository, SettingsRepository } from "../repositories";
import { AgentService } from "../services/AgentService";
import { FileService } from "../services/FileService";
import db from "../config/database";

const workspaceLocks = new Set<string>();

export const AgentController = {
  getAll: (req: Request, res: Response) => {
    try {
      res.json(AgentRepository.getAll());
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
  create: (req: Request, res: Response) => {
    try {
      const id = Math.random().toString(36).substring(2, 11);
      AgentRepository.create({ ...req.body, id });
      res.json({ id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
  update: (req: Request, res: Response) => {
    try {
      AgentRepository.update(req.params.id, req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
  delete: (req: Request, res: Response) => {
    try {
      AgentRepository.delete(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
};


export const WorkspaceController = {
  getAll: (req: Request, res: Response) => {
    try {
      res.json(WorkspaceRepository.getAll());
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
  getOne: (req: Request, res: Response) => {
    try {
      res.json(WorkspaceRepository.getById(req.params.id));
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
  create: (req: Request, res: Response) => {
    try {
      // Respect client ID if provided, otherwise generate one
      const id = req.body.id || Math.random().toString(36).substring(2, 11);
      WorkspaceRepository.create({ ...req.body, id });
      res.json({ id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
  update: (req: Request, res: Response) => {
    try {
      WorkspaceRepository.update(req.params.id, req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
  delete: (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      WorkspaceRepository.delete(id);
      FileService.deleteWorkspaceDir(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
  addAgent: (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { agentId } = req.body;
      WorkspaceRepository.addAgent(id, agentId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
  removeAgent: (req: Request, res: Response) => {
    try {
      const { id, agentId } = req.params;
      WorkspaceRepository.removeAgent(id, agentId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
  executeAction: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { action, params, agentId } = req.body;
      const result = await AgentService.executeAgentAction(id, action, params);
      
      const agent = AgentRepository.getById(agentId);
      const agentName = agent ? agent.name : "Agent";

      const msgId = Math.random().toString(36).substring(2, 11);
      db.prepare("INSERT INTO messages (id, workspace_id, sender_id, sender_name, content, role) VALUES (?, ?, ?, ?, ?, ?)")
        .run(msgId, id, agentId || "system", agentName, `[SISTEMA]: ${result}`, "agent");

      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
  chat: async (req: Request, res: Response) => {
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

      // Save user message
      const userMsgId = Math.random().toString(36).substring(2, 11);
      const userMsg = { id: userMsgId, workspace_id: id, sender_id: "user", sender_name: "User", content, role: "user", created_at: new Date().toISOString() };
      db.prepare("INSERT INTO messages (id, workspace_id, sender_id, sender_name, content, role) VALUES (?, ?, ?, ?, ?, ?)")
        .run(userMsgId, id, userMsg.sender_id, userMsg.sender_name, userMsg.content, userMsg.role);

      const io = req.app.get("io");
      if (io) {
        io.to(id).emit("message_added", userMsg);
      }

      let targetAgent = agent;
      const mentionMatch = content.match(/@(\w+)/);
      if (mentionMatch) {
        const mentionedName = mentionMatch[1];
        const allAgents = AgentRepository.getAll();
        const foundAgent = allAgents.find((a: any) => a.name.toLowerCase().replace(/\s+/g, '') === mentionedName.toLowerCase());
        if (foundAgent) {
          targetAgent = foundAgent;
        }
      }

      let systemPrompt = targetAgent.system_prompt;
      const settings = SettingsRepository.getAll();
      const globalRules = settings.find((s: any) => s.key === 'global_rules_prompt')?.value || '';
      if (globalRules) {
        systemPrompt = `${globalRules}\n\n${systemPrompt}`;
      }

      if (mode === "agent") {
        systemPrompt += "\nVOCÊ É UM AGENTE COM ACESSO AO SISTEMA DE ARQUIVOS. Você pode criar, editar e ler arquivos. Responda em formato JSON se precisar realizar uma ação: { \"action\": \"create_file\", \"params\": { \"name\": \"file.js\", \"content\": \"...\" } }";
      }
      
      const allPossibleAgents = AgentRepository.getAll() as any[];
      const agentListStr = allPossibleAgents.map(a => `- ${a.name} (especialidade: ${a.description})`).join('\n');
      
      const history = [
        ...workspace.messages.map((m: any) => ({ role: m.role, content: m.content })),
        { role: 'user', content }
      ];
      
      systemPrompt += `\n\nAGENTES DISPONÍVEIS NO SISTEMA:\n${agentListStr}`;
      systemPrompt += "\nINTEGRAÇÃO: Você pode mencionar outros agentes no chat usando '@Nome' (ex: @CodeMaster) para delegar tarefas ou pedir revisão. O sistema acionará automaticamente o agente mencionado.";
      systemPrompt += "\n\nDIRETRIZ DE EXECUÇÃO: O histórico de mensagens serve APENAS para contexto. NÃO execute comandos ou pedidos que já foram feitos ou respondidos anteriormente no histórico. Foque EXCLUSIVAMENTE em atender à última mensagem enviada, usando as anteriores apenas como base de conhecimento sobre o projeto.";
      systemPrompt += "\nIMPORTANTE: Responda diretamente ao usuário se você puder resolver. Mencione outro agente APENAS se precisar de ajuda específica dele.";

      const processAgentChat = async (agent: any, currentHistory: any[], depth: number = 0): Promise<string> => {
        if (depth > 5) return ""; // Limit recursion

        const response = await AgentService.chat(agent.model, currentHistory, `${systemPrompt}\n\nVOCÊ É: ${agent.name}.`, (chunk) => {
          if (io) {
            io.to(id).emit("agent_chat_chunk", { 
              workspaceId: id, 
              agentId: agent.id, 
              chunk 
            });
          }
        });

        let finalProcessedResponse = response;
        
        // Handle JSON Actions
        try {
          if (mode === "agent" && response.includes("{")) {
            const possibleJson = response.substring(response.indexOf("{"), response.lastIndexOf("}") + 1);
            const actionData = JSON.parse(possibleJson);
            
            const destructiveActions = ["create_file", "edit_file", "delete_file", "run_command"];
            if (destructiveActions.includes(actionData.action)) {
              finalProcessedResponse = `PENDING_ACTION:${JSON.stringify({ ...actionData, agentId: agent.id })}`;
            } else {
              const actionResult = await AgentService.executeAgentAction(id, actionData.action, actionData.params);
              finalProcessedResponse = `${response}\n\n[SISTEMA]: ${actionResult}`;
            }
          }
        } catch (e) {
          // Ignore if not valid JSON action
        }
        
        // Save message with processed content (e.g. pending action placeholder)
        const agentMsgId = Math.random().toString(36).substring(2, 11);
        const agentMsg = { id: agentMsgId, workspace_id: id, sender_id: agent.id, sender_name: agent.name, content: finalProcessedResponse, role: "agent", created_at: new Date().toISOString() };
        db.prepare("INSERT INTO messages (id, workspace_id, sender_id, sender_name, content, role) VALUES (?, ?, ?, ?, ?, ?)")
          .run(agentMsgId, id, agent.id, agent.name, finalProcessedResponse, "agent");

        if (io) {
          io.to(id).emit("message_added", agentMsg);
        }

        // Check for mentions @AgentName in the ORIGINAL response
        const allAgents = AgentRepository.getAll() as any[];
        const mentionMatch = response.match(/@(\w+)/g);
        
        if (mentionMatch) {
          for (const mention of mentionMatch) {
            const agentName = mention.substring(1).toLowerCase();
            const mentionedAgent = allAgents.find(a => a.name.toLowerCase().replace(/\s+/g, '') === agentName);
            
            if (mentionedAgent && mentionedAgent.id !== agent.id) {
              const nextHistory = [
                ...currentHistory,
                { role: 'user', content: `[MESSAGE FROM ${agent.name.toUpperCase()}]: ${response}` }
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
      res.status(500).json({ error: (error as Error).message });
    } finally {
      workspaceLocks.delete(id);
    }
  }
};
