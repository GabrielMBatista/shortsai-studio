# 🎬 ShortsAI Studio

> **Plataforma de Criação de Vídeos Curtos com Google Gemini 2.5 & Arquitetura Híbrida**

O **ShortsAI Studio** é uma aplicação web moderna que transforma ideias em vídeos verticais prontos para publicação. Diferente de geradores comuns, ele utiliza uma **Arquitetura Híbrida (Sync Engine)**: funciona offline usando IndexedDB e sincroniza automaticamente com um backend REST quando online.

## ✨ Funcionalidades Principais

### 🧠 Inteligência Artificial (Google Gemini 2.5)
- **Roteirização Multimodal**: Cria roteiros cena-a-cena com descrições visuais e narração (`gemini-2.5-flash`).
- **Director's Eye (Vision Analysis)**: Analisa fotos de personagens carregadas pelo usuário para extrair características físicas (cor dos olhos, cabelo, formato do rosto) e garantir consistência visual.
- **AI Character Optimization**: Gera automaticamente uma "Character Sheet" (Headshot neutro) antes de criar as cenas, evitando alucinações visuais.
- **Geração de Imagens**: Criação de storyboards 9:16 (`gemini-2.5-flash-image`).
- **Narração Neural (TTS)**: Vozes ultra-realistas via Gemini, ElevenLabs ou Groq (Llama 3).

### 🎥 Exportação de Vídeo (Server-Side Rendering)
- **Renderização na Nuvem**: Processamento pesado movido para **Google Cloud Run** (Python Worker).
- **Alta Performance**: Evita travamentos no navegador delegando a renderização para workers escaláveis.
- **Pipeline Automatizado**: O frontend solicita a geração e recebe o vídeo pronto via polling.
- **Formatos**: Vídeos MP4 otimizados para Shorts/Reels/TikTok.
- **R2 Storage**: Assets e vídeos finais hospedados globalmente com Cloudflare R2.

### 🏗️ Arquitetura & Engenharia

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
    *   `GET/POST /projects`: Gerenciamento de projetos (Metadata + Cenas).
    *   `POST /characters`: Biblioteca de personagens consistentes.

### ⚙️ Configuração de Ambiente

O frontend se comunica com a API backend. Configure a URL da API:

**Desenvolvimento Local:**
```env
# .env.local
VITE_API_URL=http://localhost:3333
```

**Produção (VPS):**
```env
# .env.local
VITE_API_URL=https://seu-dominio.com
```

**Proxy de Assets**: O frontend automaticamente usa `/api/assets` para contornar CORS ao exportar vídeos. Certifique-se de que a API esteja acessível.

### 🌍 Deploy em Produção (Docker/VPS)

O deploy é automatizado via **GitHub Actions** (`.github/workflows/deploy.yml`), que se conecta ao VPS via SSH e atualiza o container.

O frontend é servido via **Nginx**, que atua como um proxy reverso para o backend.

*   **Configuração de Proxy**: O Nginx redireciona automaticamente requisições de `/api` para o container do backend (`http://shortsai-api:3333`).
*   **Variáveis de Ambiente**: O frontend usa caminhos relativos (`/api`), então não é necessário recompilar para mudar o domínio.
*   **Manual Rebuild (Fallback)**:
    ```bash
    docker-compose up -d --build studio
    ```
    *Nota: O Docker Compose gerencia automaticamente a substituição dos containers (rolling update).*

---

## 📚 Documentação

### Guias Técnicos

- **[Integração com API](./docs/API_INTEGRATION.md)** - Comunicação Frontend ↔ Backend
  - Endpoints principais
  - Fluxo de sincronização
  - Tratamento de erros

- **[Arquitetura e Fluxo](./docs/ARCHITECTURE_FLOW.md)** - Diagramas e visão geral
  - Hybrid Sync Engine
  - Fluxo de dados

- **[Schema do Banco](./docs/DATABASE_SCHEMA.md)** - Estrutura do PostgreSQL
  - Tabelas e relacionamentos
  - Migrations

- **[Contrato da API](./docs/API_CONTRACT.yaml)** - Especificação OpenAPI
  - Endpoints completos
  - Modelos de dados

### Backend (shortsai-api)

Para que o frontend funcione, você precisa do backend rodando.
Clone e execute o repositório da API:

```bash
git clone https://github.com/seu-usuario/shortsai-api.git
cd shortsai-api
# Siga as instruções no README da API
```

---

Desenvolvido com ❤️, React 19 e Google Gemini.