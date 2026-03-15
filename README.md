<div align="center">
  

  # 🤖 Local Multi-Agent Studio
  **O seu ambiente de desenvolvimento local orquestrado por IA**

  [![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
  [![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev/)
  [![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg)](https://vitejs.dev/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC.svg)](https://tailwindcss.com/)
  [![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

  [Funcionalidades](#-principais-funcionalidades) • [Stack Tecnológica](#-stack-tecnológica) • [Instalação](#-instalação-e-configuração) • [Roadmap](#-roadmap)
</div>

---

## 🚀 Sobre o Projeto

O **Local Multi-Agent Studio** é um orquestrador de desenvolvimento assistido por IA que transforma a forma como você constrói software localmente. Mais do que um simples chat, ele atua como uma ponte inteligente entre modelos de linguagem (LLMs) e o seu sistema de arquivos local, permitindo que múltiplos agentes colaborem em tempo real nos seus projetos.

A aplicação opera de forma **reativa e segura**: os agentes podem propor mudanças no código, mas o sistema impõe uma camada de segurança onde ações críticas exigem sua aprovação manual.

---

## ✨ Principais Funcionalidades

### 📂 Gestão de Workspaces
- **Ambientes Isolados**: Cada projeto tem sua própria sandbox em `data/workspaces`, garantindo isolamento total.
- **Explorador Dinâmico**: Navegação fluida por arquivos e pastas com sincronização em tempo real.

### 🧠 Orquestração de Agentes
- **Múltiplas Personalidades**: Crie agentes com funções específicas (Arquiteto, Desenvolvedor, QA).
- **Sistema de @Menções**: Alterne o foco ou invoque agentes específicos durante a conversa.
- **Multi-Provedor**: Suporte nativo para **Google Gemini**, **Groq** e **Ollama** (processamento local).

### 🛠️ IDE Integrada & Terminal
- **Editor Monaco**: Edição de código de alta performance diretamente no navegador.
- **Terminal Nativo**: Integração com `node-pty` para execução de comandos reais no diretório do workspace.
- **Visualização Markdown**: Renderização rica de documentos e respostas dos agentes.

### 🛡️ Protocolo de Segurança (Consent-Based)
- **Aprovação de Ações**: Nenhuma alteração de arquivo ou comando de sistema é executado sem o seu consentimento explícito.
- **Validação de Conteúdo**: Previne a criação de arquivos vazios ou ações destrutivas acidentais.

---

## 💻 Stack Tecnológica

### Frontend
- **React 19**: Interface moderna e reativa.
- **Vite**: Build system ultra-rápido.
- **Tailwind CSS 4**: Estilização baseada em utilitários de última geração.
- **Motion**: Micro-animações fluidas para uma experiência premium.
- **Lucide React**: Conjunto de ícones consistente e elegante.

### Backend
- **Node.js (Express)**: Servidor robusto e escalável.
- **SQLite (Better-SQLite3)**: Persistência de dados leve e eficiente.
- **Socket.io**: Comunicação em tempo real para terminal e atualizações de arquivos.
- **node-pty**: Emulação de terminal fiel ao sistema operacional.

---

## ⚙️ Instalação e Configuração

### Pré-requisitos
- [Node.js](https://nodejs.org/) (v18 ou superior)
- [NPM](https://www.npmjs.com/) ou [Yarn](https://yarnpkg.com/)

### Passo a Passo

1. **Clonar o repositório**
   ```bash
   git clone <repo-url>
   cd local-multi-agent-studio
   ```

2. **Instalar dependências**
   ```bash
   npm install
   ```

3. **Configurar variáveis de ambiente**
   Crie um arquivo `.env` na raiz (ou edite o `.env.example`) e adicione suas chaves:
   ```env
   GEMINI_API_KEY=sua_chave_aqui
   GROQ_API_KEY=sua_chave_aqui
   ```

4. **Iniciar o servidor de desenvolvimento**
   ```bash
   npm run dev
   ```
   Acesse: `http://localhost:3000`

---

## 🗺️ Roadmap

- [x] **Fase 1**: Core de Workspaces, Agentes e IDE Integrada.
- [x] **Fase 2**: Terminal nativo, Protocolo de Consentimento e Melhorias de UI.
- [ ] **Fase 3**: Suporte a plugins de terceiros e análise de repositórios inteiros.
- [ ] **Fase 4**: Deploy autônomo e integração com CI/CD.

---

## 🤝 Contribuindo

Contribuições são o que fazem a comunidade open source um lugar incrível para aprender, inspirar e criar. Qualquer contribuição que você fizer será **muito apreciada**.

1. Faça um Fork do projeto
2. Crie uma Branch para sua Feature (`git checkout -b feature/AmazingFeature`)
3. Insira suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Faça o Push da Branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.

<div align="center">
  <sub></sub>
</div>
