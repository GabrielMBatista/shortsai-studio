# ShortsAI Studio Wiki

## 1. Description
**ShortsAI Studio** is the user-facing frontend application. It provides a rich, interactive interface for creators to generate scripts, edit storyboards (scenes), select styles, and preview final video outputs. It emphasizes a premium user experience with drag-and-drop mechanics and real-time feedback.

## 2. Architecture

### Tech Stack
- **Framework**: Vite + React 19
- **Language**: TypeScript
- **State Management**: React Query (Server state), Context API (UI state)
- **Styling**: Vanilla CSS / CSS Modules (Custom Design System)
- **Video Processing**: `@ffmpeg/ffmpeg` (Client-side previews/transcoding fallback)
- **Icons**: Lucide React

### Design System
The Studio implements a custom design system focusing on:
- **Visuals**: Glassmorphism, dark mode default, vibrant gradients.
- **Interaction**: Smooth transitions, immediate optimistic UI updates.

### Folder Structure
- **`src/services/`**: API clients (Auth, Projects, Gemini). acts as the anti-corruption layer between UI and Backend.
- **`src/components/`**: Reusable UI atoms and molecules.
- **`src/hooks/`**: Custom React hooks for logic reuse (e.g., `useVideoExport`).

## 3. Key Workflows

### Project Creation
1.  User inputs a prompt/topic.
2.  Studio calls `POST /api/jobs` (or relevant generation endpoint).
3.  Studio polls for generation status.
4.  Redirects to Editor upon completion.

### Editor Loop
1.  **Script Editing**: Users modify text; changes autosave via optimistic updates.
2.  **Scene Management**: Drag-and-drop reordering of scenes.
3.  **Media Selection**: Integration with asset libraries (Stock/AI generated) to replace scene backgrounds.

## 4. Deployment

### Infrastructure
- **Type**: Static Single Page Application (SPA).
- **Serving**: Served via Nginx (VPS) or CDN (Vercel/Netlify).

### Build & Run
```bash
# Install dependencies
npm install

# Run Development
npm run dev

# Build for Production
npm run build
# Output is located in dist/
```
