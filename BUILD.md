# Guia de Instalação e Uso Local: Local Multi-Agent AI Studio

Este guia fornece instruções detalhadas para configurar, compilar e utilizar a aplicação em um ambiente totalmente offline.

## 1. Pré-requisitos

*   **Node.js**: Versão 18 ou superior.
*   **Ollama**: Para execução de modelos locais (recomendado).
*   **Espaço em Disco**: Depende dos modelos de IA que você deseja baixar (ex: Llama3 requer ~5GB).

## 2. Configuração de Modelos Locais (Ollama)

A aplicação está pré-configurada para se integrar ao Ollama.

1.  **Instalação**: Baixe em [ollama.com](https://ollama.com/).
2.  **Download de Modelos**:
    ```bash
    ollama pull llama3
    ollama pull mistral
    ```
3.  **Mapeamento de Pasta**:
    A aplicação busca automaticamente por manifestos de modelos na pasta padrão do Ollama:
    *   Windows: `C:\Users\<SeuUsuario>\.ollama\models`
    *   Linux/macOS: `~/.ollama/models`

## 3. Instalação e Execução para Desenvolvimento

1.  **Instalar Dependências**:
    ```bash
    npm install
    ```
2.  **Iniciar em Modo Dev**:
    ```bash
    npm run dev
    ```
    Acesse `http://localhost:3000` no seu navegador.

## 4. Gerando o Executável (.exe)

Para distribuir a aplicação como um arquivo único:

1.  **Build do Frontend**:
    ```bash
    npm run build
    ```
2.  **Gerar Binário**:
    Utilizamos o pacote `pkg` para empacotar o Node.js e o código.
    ```bash
    npx pkg . --targets node18-win-x64 --out-path dist/bin
    ```
    O executável será gerado em `dist/bin/local-multi-agent-ai-studio.exe`.

## 5. Orientações de Uso

### Criando Agentes
*   Vá na aba **Agents** e clique em **Create Agent**.
*   No campo **Model**, você pode selecionar modelos do Gemini (requer internet e API Key) ou modelos do Ollama (prefixados com `ollama/`).
*   A lista de modelos locais detectados aparecerá automaticamente no campo de seleção.

### Gerenciando Workspaces
*   Crie um **Workspace** para um projeto específico.
*   Selecione quais agentes farão parte deste projeto.
*   **Edição**: Você pode clicar no ícone de engrenagem no cabeçalho do workspace para adicionar ou remover agentes a qualquer momento.

### Colaboração e Arquivos
*   No chat do workspace, selecione qual agente deve responder sua mensagem.
*   Os agentes podem gerar arquivos (Markdown, JSON, CSV, etc.) que aparecerão na aba **Files**.
*   Você pode exportar o histórico completo da conversa clicando no ícone de download.

## 6. Uso 100% Offline

Para garantir que nada saia da sua rede:
1.  Certifique-se de que todos os agentes estão configurados com modelos `ollama/...`.
2.  Não preencha a `GEMINI_API_KEY` no arquivo `.env` (ou deixe-a vazia).
3.  A aplicação utilizará o SQLite local (`studio.db`) para todo o armazenamento.
