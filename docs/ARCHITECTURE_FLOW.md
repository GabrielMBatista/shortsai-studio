# 🏗️ Arquitetura do Sistema ShortsAI

Este documento descreve a arquitetura de serviços distribuídos em produção.

## 🏢 Visão Geral (High Level)

O sistema é composto por 3 partes principais:

1.  **Frontend (Studio)**: Single Page Application (React/Vite).
2.  **Backend (API)**: API RESTful (Next.js App Router).
3.  **Worker (Video Engine)**: Microsserviço de renderização (Python/MoviePy).

---

## 🔄 Fluxo de Dados (Data Flow)

### 1. Geração de Assets (IA)
O frontend solicita a geração, mas a lógica pesada ocorre no backend.

```mermaid
sequenceDiagram
    participant F as Frontend (React)
    participant A as API (Node.js)
    participant G as Gemini/11Labs (AI)
    participant D as Banco (Postgres)
    participant R as R2 Storage

    F->>A: POST /api/workflow/command (generate_all)
    A->>G: Solicita Roteiro/Imagens/Áudio
    G-->>A: Retorna Conteúdo/URLs
    A->>R: Salva Assets
    A->>D: Atualiza Cenas (URLs)
    A-->>F: Aceito (200 OK)
    
    loop Polling
        F->>A: GET /api/projects/:id
        A-->>F: Status (completed)
    end
```

### 2. Renderização de Vídeo (Pipeline de Exportação)
Processo assíncrono delegado ao Worker.

```mermaid
sequenceDiagram
    participant F as Frontend
    participant A as API
    participant D as Banco
    participant W as Worker (Python/VPS)
    participant R as R2 Storage

    F->>A: POST /api/render {projectId}
    A->>D: Cria Job (status: pending)
    A->>W: Dispatch HTTP POST /render
    
    par Async Processing
        W->>R: Baixa Imagens/Áudios
        W->>W: Processa Vídeo (MoviePy)
        W->>R: Upload Resultado (.mp4/.webm)
        W->>A: Webhook (Job Concluído)
    end
    
    loop Polling
        F->>A: GET /api/render/:jobId
        A-->>F: Job Status (completed)
    end
```

### 3. Agendamento de Postagens (Social Media)
Orquestração via Fila de Mensagens (BullMQ).

```mermaid
sequenceDiagram
    participant F as Frontend
    participant A as API (Node.js)
    participant Q as Redis (BullMQ)
    participant W as Worker (Queue Processor)
    
    F->>A: POST /api/social/posts (scheduledAt)
    A->>D: Cria Post (status: scheduled)
    A->>Q: Adiciona Job (delay)
    
    Note over Q,W: Aguarda Scheduled Time
    
    Q->>W: Processa Job (publish-video)
    W->>D: Atualiza Status (published)
```

---

## 🧩 Componentes

### Frontend (`shortsai-studio`)
- **Tech**: React 19, Vite, TailwindCSS.
- **Responsabilidade**: Interface, Edição de Roteiro, Preview, Solicitação de Geração.
- **Modos**:
  - `Mock`: Usa dados locais para testes de UI.
  - `Prod`: Conecta na API via `/api/*`.

### Backend API (`shortsai-api`)
- **Tech**: Next.js 15, Prisma, PostgreSQL.
- **Responsabilidade**: Regras de negócio, Gestão de Créditos, Proxy de R2, Orquestração de IA.
- **Hospedagem**: VPS (Docker Compose).

### Worker (`shortsai-api/worker`)
- **Tech**: Python 3.11, FastAPI, MoviePy.
- **Responsabilidade**: Renderização de vídeo intensiva (CPU Bound).
- **Hospedagem**: VPS (Docker Compose).
- **Nota**: Código compatível com Cloud Run (Serverless) para escala futura, mas rodando localmente por questões de performance/custo.

### Armazenamento
- **Banco**: PostgreSQL (Dados relacionais).
- **Blob**: Cloudflare R2 (Imagens, Áudio, Vídeo).
