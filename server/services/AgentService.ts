import { FileService } from "./FileService";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { GoogleGenAI } from "@google/genai";
import { SettingsRepository } from "../repositories";

export const AgentService = {
  async chat(model: string, messages: any[], systemPrompt: string, onChunk?: (chunk: string) => void) {
    const settings = SettingsRepository.getAll();
    const getSetting = (key: string) => settings.find((s: any) => s.key === key)?.value || '';
    
    const globalRules = getSetting('global_rules_prompt');
    const fullSystemPrompt = globalRules ? `${globalRules}\n\n${systemPrompt}` : systemPrompt;
    const geminiKey = (getSetting('gemini_api_key') && getSetting('gemini_api_key') !== '********') ? getSetting('gemini_api_key') : process.env.GEMINI_API_KEY;
    const groqKey = (getSetting('groq_api_key') && getSetting('groq_api_key') !== '********') ? getSetting('groq_api_key') : process.env.GROQ_API_KEY;
    const ollamaUrl = getSetting('ollama_url') || "http://localhost:11434";

    // 1. Check if it's a Cloud Model (Gemini)
    if (model.startsWith('gemini-') && geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        
        const geminiHistory = messages.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }));

        const result = await ai.models.generateContentStream({
          model: model,
          contents: geminiHistory,
          config: { systemInstruction: fullSystemPrompt }
        });

        let fullText = '';
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
        return `Erro no modelo Gemini: ${(e as Error).message}`;
      }
    }

    // 2. Check if it's a GROQ Model
    const groqModels = ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768', 'gemma-7b-it'];
    if ((model.startsWith('groq/') || groqModels.includes(model)) && groqKey) {
      try {
        const groqModel = model.replace('groq/', '');
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
        let fullText = '';

        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.substring(6));
                const content = data.choices[0].delta?.content || '';
                if (content) {
                  fullText += content;
                  if (onChunk) onChunk(content);
                }
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }
        return fullText;
      } catch (e) {
        console.error("GROQ Model Error:", e);
        return `Erro no modelo GROQ: ${(e as Error).message}`;
      }
    }

    // 3. Fallback to Local (Ollama)
    try {
      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model,
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
      let fullText = '';

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const segments = chunk.split('\n').filter(s => s.trim());
        
        for (const segment of segments) {
          try {
            const data = JSON.parse(segment);
            if (data.message?.content) {
              fullText += data.message.content;
              if (onChunk) onChunk(data.message.content);
            }
            if (data.done) break;
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
      return fullText;
    } catch (error) {
      console.error("Ollama Connection Error:", error);
      const isRefused = (error as any).code === 'ECONNREFUSED' || (error as Error).message.includes('fetch failed');
      
      if (isRefused) {
        return `Erro de Conexão: O sistema não conseguiu falar com o Ollama em ${ollamaUrl}. Por favor, certifique-se de que o aplicativo Ollama está aberto e rodando no seu computador.`;
      }
      
      return `Erro ao processar com Ollama: ${(error as Error).message}`;
    }
  },

  // Tools for the 'Agent' mode
  async executeAgentAction(workspaceId: string, action: string, params: any) {
    const workspaceDir = FileService.getWorkspaceDir(workspaceId);
    
    // Protocol Validation
    if ((action === "create_file" || action === "edit_file") && (!params.content || params.content.trim() === '')) {
      return "Erro: O conteúdo do arquivo não pode estar vazio (Protocol Violation).";
    }

    if (!params.name && (action === "create_file" || action === "edit_file" || action === "delete_file")) {
       params.name = params.path; // Normalize path/name from protocol
    }

    if (!params.name && action !== "read_workspace" && action !== "run_command" && action !== "mkdir" && action !== "rename" && action !== "delete") {
      return "Erro: Nome do arquivo ou caminho é obrigatório.";
    }
    
    switch (action) {
      case "create_file":
      case "mkdir":
        if (action === "mkdir") {
          FileService.createItem(workspaceId, params.path || params.name, 'directory');
          return `Diretório ${params.path || params.name} criado.`;
        }
        FileService.saveFile(workspaceId, params.name, params.content);
        return `Arquivo ${params.name} criado com sucesso.`;
      
      case "edit_file":
        const filePath = path.join(workspaceDir, params.name);
        if (fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, params.content);
          return `Arquivo ${params.name} editado com sucesso.`;
        }
        return `Erro: Arquivo ${params.name} não encontrado.`;

      case "rename":
        FileService.renameItem(workspaceId, params.oldPath, params.newPath);
        return `Renomeado de ${params.oldPath} para ${params.newPath}.`;

      case "delete_file":
      case "delete":
        FileService.deleteItem(workspaceId, params.path || params.name);
        return `Item ${params.path || params.name} excluído.`;

      case "read_workspace":
        const tree = FileService.getFileTree(workspaceDir);
        return JSON.stringify(tree, null, 2);

      case "run_command":
        return new Promise((resolve) => {
          exec(params.command, { cwd: workspaceDir }, (error: any, stdout: any, stderr: any) => {
            if (error) {
              resolve(`Erro ao executar comando: ${error.message}\n${stderr}`);
              return;
            }
            resolve(stdout || "Comando executado com sucesso (sem saída).");
          });
        });

      default:
        return "Ação desconhecida ou não suportada pelo protocolo.";
    }
  }
};
