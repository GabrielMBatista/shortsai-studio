# 🎬 ShortsAI Studio - Database Schema (PostgreSQL)

Este documento reflete a estrutura atual do banco de dados (Prisma Schema).

## 1. Visão Geral

*   **ORM**: Prisma
*   **Banco**: PostgreSQL
*   **IDs**: UUIDs e CUIDs

---

## 2. Tabelas Principais (Core)

### 2.1. `users`
Usuários do sistema.

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY, -- UUID
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    email_verified TIMESTAMP,
    image TEXT,
    avatar_url TEXT,
    google_id TEXT UNIQUE,
    role TEXT DEFAULT 'USER', -- Enum: USER, ADMIN
    subscription_plan TEXT DEFAULT 'FREE', -- Enum: FREE, PRO
    tier TEXT DEFAULT 'free', -- Enum: free, pro, enterprise
    is_blocked BOOLEAN DEFAULT false,
    stripe_customer_id TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    last_video_generated_at TIMESTAMP,
    plan_id TEXT
);
```

### 2.2. `user_limits` (Cotas)
Controle de uso e limites.

```sql
CREATE TABLE user_limits (
    user_id TEXT PRIMARY KEY,
    monthly_videos_limit INTEGER DEFAULT 5,
    monthly_minutes_tts INTEGER DEFAULT 10,
    monthly_images_limit INTEGER DEFAULT 50,
    current_videos_used INTEGER DEFAULT 0,
    current_minutes_tts_used DECIMAL(10,2) DEFAULT 0,
    current_images_used INTEGER DEFAULT 0,
    last_reset_date TIMESTAMP DEFAULT NOW(),
    daily_requests_limit INTEGER DEFAULT 100,
    current_daily_requests INTEGER DEFAULT 0,
    last_daily_reset TIMESTAMP DEFAULT NOW(),
    daily_videos_limit INTEGER DEFAULT 1,
    current_daily_videos INTEGER DEFAULT 0
);
```

### 2.3. `api_keys`
Chaves de API do usuário.

```sql
CREATE TABLE api_keys (
    user_id TEXT PRIMARY KEY,
    gemini_key TEXT,
    elevenlabs_key TEXT,
    suno_key TEXT,
    groq_key TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2.4. `plans`
Planos de assinatura.

```sql
CREATE TABLE plans (
    id TEXT PRIMARY KEY, -- UUID
    name TEXT UNIQUE,
    slug TEXT UNIQUE,
    description TEXT,
    price DECIMAL DEFAULT 0,
    monthly_images_limit INTEGER DEFAULT 10,
    monthly_videos_limit INTEGER DEFAULT 5,
    monthly_minutes_tts INTEGER DEFAULT 10,
    daily_requests_limit INTEGER DEFAULT 50,
    daily_videos_limit INTEGER DEFAULT 2,
    features JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);
```

---

## 3. Organização

### 3.1. `folders`
Pastas para organizar projetos.

```sql
CREATE TABLE folders (
    id TEXT PRIMARY KEY, -- UUID
    name TEXT,
    user_id TEXT NOT NULL,
    parent_id TEXT, -- Relation to Folder (Self-relation)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);
```

### 3.2. `social_posts`
Postagens para redes sociais.

```sql
CREATE TABLE social_posts (
    id TEXT PRIMARY KEY, -- UUID
    user_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    platform TEXT NOT NULL, -- Enum: SocialPlatform
    title TEXT,
    description TEXT,
    privacy_status TEXT NOT NULL, -- Enum: PrivacyStatus
    status TEXT NOT NULL, -- Enum: PostStatus
    scheduled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

### 3.3. `shows`
Séries ou programas.

```sql
CREATE TABLE shows (
    id TEXT PRIMARY KEY, -- UUID
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    style_preset TEXT,
    visual_prompt TEXT,
    default_tts_provider TEXT DEFAULT 'gemini',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);
```

---

## 4. Projetos e Cenas

### 4.1. `projects`
O projeto de vídeo.

```sql
CREATE TABLE projects (
    id TEXT PRIMARY KEY, -- UUID
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    style TEXT NOT NULL,
    language TEXT DEFAULT 'en',
    voice_name TEXT NOT NULL,
    tts_provider TEXT NOT NULL, -- Enum: gemini, elevenlabs, groq
    
    -- Configurações de IA
    reference_image_url TEXT,
    reference_characters_snapshot JSONB,
    video_model TEXT DEFAULT 'veo',
    audio_model TEXT,
    
    -- Música
    include_music BOOLEAN DEFAULT false,
    bg_music_prompt TEXT,
    bg_music_url TEXT,
    bg_music_status TEXT, -- Enum: MusicStatus
    
    -- Metadados
    status TEXT DEFAULT 'draft', -- Enum: ProjectStatus
    generated_title TEXT,
    generated_description TEXT,
    duration_config JSONB,
    tags TEXT[], 
    
    -- Organização
    is_archived BOOLEAN DEFAULT false,
    folder_id TEXT,
    show_id TEXT,
    episode_number INTEGER,
    
    -- Locks
    lock_session_id TEXT,
    lock_expires_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2. `scenes`
As cenas individuais.

```sql
CREATE TABLE scenes (
    id TEXT PRIMARY KEY, -- UUID
    project_id TEXT NOT NULL,
    scene_number INTEGER NOT NULL,
    visual_description TEXT NOT NULL,
    narration TEXT NOT NULL,
    duration_seconds DECIMAL(5,2) NOT NULL,
    
    -- Assets
    image_url TEXT,
    image_status TEXT DEFAULT 'draft', -- Enum: SceneStatus
    audio_url TEXT,
    audio_status TEXT DEFAULT 'draft',
    sfx_url TEXT,
    sfx_status TEXT DEFAULT 'draft',
    video_url TEXT,
    video_status TEXT DEFAULT 'draft',
    
    -- Config
    media_type TEXT DEFAULT 'image',
    visual_effect TEXT DEFAULT 'zoom_in',
    word_timings JSONB,
    
    -- Erros e Tentativas
    error_message TEXT,
    image_attempts INTEGER DEFAULT 0,
    audio_attempts INTEGER DEFAULT 0,
    sfx_attempts INTEGER DEFAULT 0,
    video_attempts INTEGER DEFAULT 0,
    
    character_id TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

### 4.3. `jobs`
Fila de processamento assíncrono (ex: Render de Vídeo).

```sql
CREATE TABLE jobs (
    id TEXT PRIMARY KEY, -- CUID
    type TEXT NOT NULL,
    status TEXT DEFAULT 'QUEUED', 
    inputPayload JSONB NOT NULL,
    outputResult JSONB,
    errorMessage TEXT,
    
    projectId TEXT NOT NULL,
    sceneId TEXT,
    
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP
);
```

---

## 5. Assets Reutilizáveis

### 5.1. `characters`
Personagens consistentes.

```sql
CREATE TABLE characters (
    id TEXT PRIMARY KEY, -- UUID
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    images TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    
    show_id TEXT,
    voice_provider TEXT,
    voice_id TEXT,
    voice_settings JSONB
);
```

---

## 6. Logs

### 6.1. `usage_logs`
Logs de consumo de tokens/serviços.

```sql
CREATE TABLE usage_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    project_id TEXT,
    action_type TEXT NOT NULL, -- Enum: UsageLogAction
    provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    duration_seconds DECIMAL(10,2) DEFAULT 0,
    status TEXT NOT NULL, -- Enum: UsageLogStatus
    error_message TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```