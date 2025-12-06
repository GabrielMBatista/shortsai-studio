# Changelog

Todas as mudanças significativas neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado
- **Exportação de Vídeo Client-Side**: Sistema completo de exportação usando WebCodecs API
  - Encoding VP9 + Opus nativo no navegador
  - Renderização 1080x1920 (9:16) a 30fps
  - Processamento sem necessidade de upload
  - Download direto do vídeo final (.webm)

- **Integração com Proxy de Assets**: Uso automático do `/api/assets` para CORS
  - Carregamento correto de assets do R2 Storage
  - Suporte a Canvas e WebCodecs sem erros de CORS
  - Cache otimizado para performance

- **Tour Interativo**: Guia passo a passo para novos usuários
  - Onboarding completo do fluxo de trabalho
  - Tooltips interativos com Joyride
  - Modo mock para demonstração

- **Sistema de Shows**: Organização de vídeos em séries
  - Criação e gerenciamento de séries
  - Associação de projetos a shows
  - Interface dedicada para navegação

### Modificado
- **Player de Vídeo**: Melhorias na exibição e controle
  - Suporte a vídeos gerados com Veo
  - Fallback para imagens quando vídeo não disponível
  - Controles de playback otimizados

- **Editor de Roteiro**: Interface refinada
  - Edição inline de cenas
  - Preview em tempo real
  - Suporte a múltiplos personagens

- **Sincronização com Backend**: Integração completa com ShortsAI API
  - Autenticação via NextAuth
  - Sincronização de projetos e cenas
  - Upload de assets para R2 Storage

### Corrigido
- **CORS na Exportação**: Resolvidos erros ao exportar vídeos
  - Uso obrigatório do proxy `/api/assets`
  - Headers configurados corretamente
  - Compatibilidade com todos os navegadores

- **Legendas Fluídas**: Melhorias na exibição de legendas
  - Renderização contínua sem saltos
  - Highlight da palavra atual
  - Sincronização precisa com áudio

## [2.0.0] - 2024-12

### Adicionado
- Sistema de autenticação (Google OAuth)
- Dashboard com projetos e pastas
- Editor de roteiro avançado
- Geração de múltiplos personagens
- Integração com Gemini 2.5 Flash
- Sistema de templates de estilos

### Modificado
- Migração de IndexedDB para backend REST
- UI/UX completamente redesenhada
- Sistema de temas (dark mode)
- Internacionalização (pt-BR, en-US)

## [1.0.0] - 2024-11

### Adicionado
- Interface inicial de criação de vídeos
- Geração de roteiros com IA
- Geração de imagens por cena
- Geração de áudio com TTS
- Preview em tempo real
- Sistema offline com IndexedDB

---

**Legenda**:
- `Adicionado`: Novas funcionalidades
- `Modificado`: Mudanças em funcionalidades existentes
- `Corrigido`: Correções de bugs
- `Removido`: Funcionalidades removidas
- `Segurança`: Correções de vulnerabilidades
