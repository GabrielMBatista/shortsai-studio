
# 🎬 ShortsAI Studio

> **Plataforma de Criação de Vídeos Curtos com Google Gemini 2.5 & Arquitetura Híbrida**

O **ShortsAI Studio** é uma aplicação web moderna que transforma ideias em vídeos verticais prontos para publicação. Diferente de geradores comuns, ele utiliza uma **Arquitetura Híbrida (Sync Engine)**: funciona offline usando IndexedDB e sincroniza automaticamente com um backend REST quando online.

## ✨ Funcionalidades Principais

### 🧠 Inteligência Artificial (Google Gemini 2.5)
- **Roteirização Multimodal**: Cria roteiros cena-a-cena com descrições visuais e narração (`gemini-2.5-flash`).
- **Director's Eye (Vision Analysis)**: Analisa fotos de personagens carregadas pelo usuário para extrair características físicas (cor dos olhos, cabelo, formato do rosto) e garantir consistência visual.
- **AI Character Optimization**: Gera automaticamente uma "Character Sheet" (Headshot neutro) antes de criar as cenas, evitando alucinações visuais.
- **Geração de Imagens**: Criação de storyboards 9:16 (`gemini-2.5-flash-image`).
- **Narração Neural (TTS)**: Vozes ultra-realistas via Gemini ou ElevenLabs.

### 🏗️ Arquitetura & Engenharia
- **Hybrid Sync Engine**: 
  - **Offline First**: Todos os dados são salvos instantaneamente no IndexedDB (suporta blobs grandes).
  - **Cloud Sync**: Sincronização automática com API (`shortsai-api`) quando a conexão é restabelecida.
  - **Fallback Robusto**: Se a API cair, o app continua funcionando localmente sem interrupção.
- **Renderização Client-Side (High Fidelity)**: Compilação de vídeo `.mp4`/`.webm` direto no navegador (Canvas API + MediaRecorder) com legendas sincronizadas e efeito Ken Burns.
    - **Consistent Rendering**: O sistema utiliza um motor de renderização compartilhado para garantir que as legendas e efeitos visuais no "Preview" sejam visualmente idênticos ao arquivo de vídeo exportado, mantendo fontes, cores e animações de "Karaoke" consistentes.
- **Segurança**: Criptografia/Ofuscação de API Keys no LocalStorage (`utils/security.ts`).

---

## 🚀 Como Executar

### Pré-requisitos
*   **Node.js** (v18+)
*   **Gemini API Key** (Google AI Studio)

### Instalação

1.  Clone o repositório:
    ```bash
    git clone https://github.com/seu-usuario/shortsai-studio.git
    cd shortsai-studio
    ```

2.  Instale as dependências:
    ```bash
    npm install
    ```

3.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```

4.  Acesse `http://localhost:3000`.

### Autenticação & Backend
O projeto vem configurado para conectar-se à API de produção (`shortsai-api.vercel.app`) ou funcionar offline.
*   **Modo Demo/Admin**: O sistema detecta automaticamente se não há `GOOGLE_CLIENT_ID` configurado e oferece um login de Administrador (conectado ao banco de dados de teste).
*   **Google Auth**: Para habilitar login social real, configure `VITE_GOOGLE_CLIENT_ID` no seu `.env`.

---

## 📚 Documentação Técnica

### Estrutura de Pastas
```
/src
  /components     # UI Components (Dashboard, ScriptView, Player, SubtitleOverlay)
  /hooks          # Lógica de Estado (useVideoGeneration, useCharacterLibrary, useVideoExport)
  /services       # Camada de Integração
    - gemini.ts   # Lógica de Prompting e Vision
    - storage.ts  # Hybrid Sync (API + IndexedDB)
    - quota.ts    # Rate Limiting & HUD
  /utils          # Helpers (Security, SubtitleStyles, VideoUtils)
/docs
  - API_CONTRACT.yaml   # Especificação OpenAPI do Backend
  - DATABASE_SCHEMA.md  # Estrutura do Banco SQL
```

### Integração com Backend
O frontend espera uma API RESTful compatível com o contrato definido em `docs/API_CONTRACT.yaml`.
*   **Base URL**: `http://localhost:3000/api` (Padrão)
*   **Endpoints Principais**:
    *   `POST /users`: Criação/Sincronização de perfil.
    *   `GET/POST /projects`: Gerenciamento de projetos (Metadata + Cenas).
    *   `POST /characters`: Biblioteca de personagens consistentes.

### Fluxo de Otimização de Personagem
1.  Usuário faz upload de fotos de referência.
2.  **Vision Analysis**: O Gemini analisa a imagem e extrai um texto descritivo denso ("homem, 30 anos, cicatriz no olho esquerdo...").
3.  **Optimization**: O sistema gera uma nova imagem de referência "limpa" (fundo branco, iluminação neutra).
4.  **Geração de Cenas**: Todas as cenas usam essa imagem otimizada + a descrição textual como condicionamento para o `gemini-2.5-flash-image`.

---

Desenvolvido com ❤️, React 19 e Google Gemini.
