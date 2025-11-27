# 🎬 ShortsAI Studio - Database Schema (PostgreSQL Ready)

Este documento define a estrutura exata do banco de dados relacional necessário para suportar o ShortsAI Studio integrando com o frontend atual.

## 1. Visão Geral

*   **Banco Recomendado**: PostgreSQL 15+
*   **Extensões Necessárias**: `uuid-ossp` (para geração de IDs).

---

## 2. Tabelas Principais (Core)

### 2.1. `users`
Usuários do sistema.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    google_id VARCHAR(255), -- Para mapeamento de login social
    tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2. `user_limits` (Cotas)
Controle de uso e limites do plano do usuário.

```sql
CREATE TABLE user_limits (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    max_videos INTEGER DEFAULT 5,
    max_tts_minutes DECIMAL(10,2) DEFAULT 10,
    max_images INTEGER DEFAULT 50,
    current_videos INTEGER DEFAULT 0,
    current_tts_minutes DECIMAL(10,2) DEFAULT 0,
    current_images INTEGER DEFAULT 0,
    last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.3. `api_keys`
Chaves de API criptografadas do usuário.

```sql
CREATE TABLE api_keys (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    gemini_key TEXT,
    elevenlabs_key TEXT,
    suno_key TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 3. Biblioteca de Assets

### 3.1. `characters`
Personagens reutilizáveis.

```sql
CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT, 
    images TEXT[], -- Array de strings (Base64 Data URIs ou URLs)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 4. Projetos e Cenas

### 4.1. `projects`
O projeto de vídeo.

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Configuração Básica
    topic TEXT NOT NULL,
    style VARCHAR(50) NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    
    -- Configuração de Voz
    voice_name VARCHAR(100) NOT NULL,
    tts_provider VARCHAR(20) CHECK (tts_provider IN ('gemini', 'elevenlabs')),
    
    -- Música
    include_music BOOLEAN DEFAULT FALSE,
    bg_music_prompt TEXT,
    bg_music_url TEXT, -- Suporta Base64 Data URI ou URL
    bg_music_status VARCHAR(20) DEFAULT 'pending',

    -- Metadados SEO
    generated_title VARCHAR(255),
    generated_description TEXT,

    -- Configuração de Duração
    duration_config JSONB, -- { "min": 55, "max": 65, "targetScenes": 10 }

    -- Referência Legacy (opcional, mantido se necessário para projetos antigos)
    reference_image_url TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4.2. `project_characters` (Relacionamento N:N)
Tabela de junção para vincular múltiplos personagens a um projeto.

```sql
CREATE TABLE project_characters (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, character_id)
);
```

### 4.3. `scenes`
As cenas individuais do roteiro.

```sql
CREATE TABLE scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    scene_number INTEGER NOT NULL,
    visual_description TEXT NOT NULL,
    narration TEXT NOT NULL,
    duration_seconds DECIMAL(5,2) NOT NULL,
    
    -- Assets Gerados
    -- NOTA: O tipo TEXT do Postgres suporta até 1GB.
    -- Armazenaremos Base64 Data URIs (ex: data:image/png;base64,...) diretamente aqui.
    image_url TEXT, 
    image_status VARCHAR(20) DEFAULT 'pending', -- pending, loading, completed, error
    
    audio_url TEXT,
    audio_status VARCHAR(20) DEFAULT 'pending', -- pending, loading, completed, error
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scenes_project_order ON scenes (project_id, scene_number);
```

---

## 5. Analytics & Logs

### 5.1. `usage_logs`
Rastreamento de consumo de API (Tokens/Requests).

```sql
CREATE TABLE usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    action_type VARCHAR(50) NOT NULL, -- GENERATE_SCRIPT, GENERATE_IMAGE, TTS, etc.
    provider VARCHAR(50) NOT NULL,    -- gemini, elevenlabs, suno
    model_name VARCHAR(100),
    
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    duration_seconds DECIMAL(10,2),   -- Para áudio/vídeo
    
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```