# Integração com ShortsAI API

Este documento descreve como o **ShortsAI Studio** (Frontend) se integra com a **ShortsAI API** (Backend).

## 🔗 Configuração da URL da API

A URL base da API é configurada via variável de ambiente:

```env
# .env.local
VITE_API_URL=http://localhost:3333  # Desenvolvimento
# ou
VITE_API_URL=https://api.seu-dominio.com  # Produção
```

O código acessa essa variável através de:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
```

## 📋 Endpoints Principais Utilizados

### Autenticação
- `GET /api/auth/session`: Verifica sessão do usuário
- `POST /api/auth/signin`: Login com Google OAuth

### Projetos
- `GET /api/projects`: Lista projetos do usuário
- `POST /api/projects`: Cria novo projeto
- `GET /api/projects/:id`: Obtém detalhes do projeto
- `PATCH /api/projects/:id`: Atualiza projeto
- `DELETE /api/projects/:id`: Deleta projeto (soft delete)

### Cenas
- `PATCH /api/scenes/:id`: Atualiza cena
- `DELETE /api/scenes/:id`: Deleta cena (soft delete)
- `POST /api/scenes/:id/asset`: Upload de asset (imagem/áudio)

### Workflow (Geração de Assets)
- `POST /api/workflow/command`: Dispara geração de assets
  - Actions: `generate_all`, `regenerate_image`, `regenerate_audio`
- `GET /api/events/:projectId`: Server-Sent Events para progresso em tempo real

### Assets (Proxy R2 Storage)
- `GET /api/assets?url={r2_url}`: Proxy para assets do R2 Storage

## 🎥 Exportação de Vídeo

O processo de exportação utiliza o proxy de assets para evitar problemas de CORS:

### Fluxo de Exportação

1. **Coletar Cenas**: O frontend obtém todas as cenas do projeto
2. **Proxy de URLs**: Converte URLs do R2 para URLs do proxy
   ```typescript
   const getProxiedUrl = (r2Url: string) => {
     return `${API_URL}/api/assets?url=${encodeURIComponent(r2Url)}`;
   };
   ```
3. **Carregar Assets**: Usa `fetch()` nas URLs do proxy
4. **Encoding**: Usa WebCodecs API para processar vídeo/áudio
5. **Download**: Gera arquivo .webm final

### Por que usar o Proxy?

❌ **Sem Proxy**: Erros de CORS ao carregar assets em Canvas/WebCodecs
```
Access to fetch at 'https://pub-xxxxx.r2.dev/...' from origin 'https://seu-dominio.com' 
has been blocked by CORS policy
```

✅ **Com Proxy**: Headers CORS configurados corretamente
```typescript
// API configura headers:
'Access-Control-Allow-Origin': '*'
'Cache-Control': 'public, max-age=31536000, immutable'
```

## 🔄 SSE (Server-Sent Events)

O frontend usa SSE para receber atualizações em tempo real durante a geração:

```typescript
const eventSource = new EventSource(`${API_URL}/api/events/${projectId}`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'scene_update') {
    // Atualiza UI com novo status da cena
  }
};
```

### Tipos de Eventos Recebidos

- `init`: Status inicial do projeto
- `scene_update`: Cena foi atualizada (novo asset gerado)
- `project_update`: Status geral do projeto mudou
- `error`: Erro na geração

## 📦 Upload de Assets

Quando o usuário faz upload de uma imagem customizada:

```typescript
const uploadAsset = async (sceneId: string, file: File, type: 'image' | 'audio') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  const response = await fetch(`${API_URL}/api/scenes/${sceneId}/asset`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  return response.json(); // { url: 'https://pub-xxxxx.r2.dev/...' }
};
```

A API automaticamente:
1. Valida o arquivo
2. Faz upload para R2 Storage
3. Retorna URL pública
4. Atualiza banco de dados

## 🔒 Autenticação

O frontend usa cookies HTTP-only para autenticação (NextAuth.js):

```typescript
// Todas as requests incluem credentials
fetch(`${API_URL}/api/projects`, {
  credentials: 'include',  // Envia cookies automaticamente
});
```

Não é necessário gerenciar tokens manualmente.

## 🚨 Tratamento de Erros

### Erros Comuns

**401 Unauthorized**: Usuário não autenticado
```typescript
if (response.status === 401) {
  window.location.href = `${API_URL}/api/auth/signin`;
}
```

**404 Not Found**: Projeto/cena não existe
```typescript
if (response.status === 404) {
  showToast('Projeto não encontrado', 'error');
  navigate('/dashboard');
}
```

**429 Too Many Requests**: Limite de uso excedido
```typescript
if (response.status === 429) {
  showToast('Limite de geração atingido. Aguarde ou faça upgrade.', 'warning');
}
```

## 🌐 CORS e Proxy Nginx

Em produção, o Nginx faz proxy das requisições `/api/*` para o backend:

```nginx
location /api/ {
    proxy_pass http://shortsai-api:3333/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

Isso permite que o frontend use caminhos relativos:
```typescript
// Funciona tanto em dev quanto em prod
fetch('/api/projects')  // Dev: http://localhost:5173/api/projects → http://localhost:3333/api/projects
                        // Prod: https://seu-dominio.com/api/projects (proxied pelo Nginx)
```

## 📊 Exemplo Completo: Criar e Gerar Projeto

```typescript
async function createAndGenerateProject(title: string, topic: string) {
  // 1. Criar projeto
  const projectRes = await fetch(`${API_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      title,
      topic,
      style: 'documentary',
      language: 'pt-BR',
    }),
  });
  
  const project = await projectRes.json();
  
  // 2. Iniciar geração
  await fetch(`${API_URL}/api/workflow/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      projectId: project.id,
      action: 'generate_all',
    }),
  });
  
  // 3. Escutar atualizações via SSE
  const events = new EventSource(`${API_URL}/api/events/${project.id}`);
  events.onmessage = (e) => console.log('Update:', JSON.parse(e.data));
  
  return project;
}
```

## 🔧 Troubleshooting

### "Failed to fetch" ao chamar API

**Causa**: API não está rodando ou URL incorreta

**Solução**:
1. Verifique se a API está rodando: `curl http://localhost:3333/api/health`
2. Confirme a variável `VITE_API_URL` no `.env.local`

### Erros de CORS

**Causa**: API não configurou headers CORS corretamente

**Solução**: A API já tem CORS configurado para `FRONTEND_URL`. Certifique-se que a variável está correta no `.env` da API:
```env
FRONTEND_URL=http://localhost:5173  # Dev
FRONTEND_URL=https://seu-dominio.com  # Prod
```

### SSE não conecta

**Causa**: EventSource não suporta CORS com credenciais em alguns navegadores

**Solução**: Use `fetch` com `ReadableStream` como alternativa ou configure domínio único (mesmo domínio para API e frontend via Nginx).

---

**Tip**: Use a ferramenta de DevTools > Network para inspecionar todas as chamadas à API e verificar headers/payloads.
