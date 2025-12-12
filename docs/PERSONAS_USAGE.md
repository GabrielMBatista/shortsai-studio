# Personas & Channels - Usage Guide

Guia de uso dos components React de Personas e Channels.

## 📦 Components Disponíveis

### **Types & API (3 arquivos)**
```
src/types/personas.ts              ✅ Interfaces TypeScript
src/api/personas.ts                ✅ API client (personas)
src/api/channels.ts                ✅ API client (channels)
```

### **Hooks (2 arquivos)**
```
src/hooks/usePersonas.ts           ✅ Hook para personas
src/hooks/useChannels.ts           ✅ Hook para channels (com assignPersona)
```

### **Components (3 arquivos)**
```
src/components/PersonaGallery.tsx          ✅ Galeria de personas com filtros
src/components/ChannelPersonaSelector.tsx  ✅ Dropdown para selecionar persona
src/components/ChannelsList.tsx            ✅ Lista de channels com stats
```

---

## 🎯 Como Usar

### **1. Persona Gallery**
```tsx
import PersonaGallery from './components/PersonaGallery';

// Exibir galeria de personas
<PersonaGallery />
```

**Features:**
- ✅ Filtros por categoria (all, biblical, educational, etc.)
- ✅ Badges (Official, Featured, Premium)
- ✅ Stats (usage count, temperature, type)
- ✅ Tags
- ✅ Loading & error states

---

### **2. Channels List**
```tsx
import ChannelsList from './components/ChannelsList';

// Exibir lista de channels com persona selector
<ChannelsList />
```

**Features:**
- ✅ Grid de channels com thumbnails
- ✅ Stats (subscribers, videos, views)
- ✅ Persona selector integrado
- ✅ Auto-update após atribuir persona
- ✅ Last synced timestamp

---

### **3. Channel Persona Selector**
```tsx
import ChannelPersonaSelector from './components/ChannelPersonaSelector';

const channel = { /* ... */ };

<ChannelPersonaSelector 
  channel={channel}
  onUpdate={(updated) => console.log('Updated:', updated)}
/>
```

**Features:**
- ✅ Dropdown com todas personas disponíveis
- ✅ Opção "No Persona" (default)
- ✅ Visual feedback (loading state)
- ✅ Auto-close após seleção

---

## 🔗 Integração com App Existente

### **Opção 1: Adicionar Nova Rota**
```tsx
// Em App.tsx ou routes

import PersonaGallery from './components/PersonaGallery';
import ChannelsList from './components/ChannelsList';

// Adicionar rotas
<Route path="/personas" element={<PersonaGallery />} />
<Route path="/my-channels" element={<ChannelsList />} />
```

### **Opção 2: Integrar em Dashboard**
```tsx
// Em Dashboard.tsx

import ChannelsList from './components/ChannelsList';

<div className="space-y-8">
  {/* Conteúdo existente */}
  
  {/* Nova seção */}
  <section>
    <ChannelsList />
  </section>
</div>
```

---

## 🎨 Design System

### **Colors**
```css
/* Persona Types */
--persona-system: #3b82f6;    /* blue-500 */
--persona-custom: #a855f7;    /* purple-500 */

/* Badges */
--badge-official: #3b82f6;    /* blue */
--badge-featured: #10b981;    /* emerald */
--badge-premium: #f59e0b;     /* amber */
```

### **Icons (lucide-react)**
```tsx
<Sparkles />  // Persona featured
<Crown />     // Premium
<Star />      // Official
<Youtube />   // Channel
<Users />     // Subscribers
<Video />     // Videos count
<Eye />       // Views
```

---

## 📡 API Integration

### **Environment Variables**
```env
# .env
VITE_API_URL=http://localhost:3333/api
```

### **Endpoints Utilizados**
```
GET    /api/personas              ← usePersonas()
GET    /api/channels/user         ← useChannels()
PATCH  /api/channels/:id/persona  ← assignPersona()
```

---

## 🧪 Testing

### **Test Personas Loading**
```tsx
import { usePersonas } from './hooks/usePersonas';

function Test() {
  const { personas, loading, error } = usePersonas();
  
  console.log('Personas:', personas);
  console.log('Loading:', loading);
  console.log('Error:', error);
  
  return <PersonaGallery />;
}
```

### **Test Channel Assignment**
```tsx
import { useChannels } from './hooks/useChannels';

function Test() {
  const { channels, assignPersona } = useChannels();
  
  const handleAssign = async () => {
    const channelId = channels[0]?.id;
    const personaId = 'biblical-storyteller';
    
    try {
      const updated = await assignPersona(channelId, personaId);
      console.log('Updated:', updated);
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  return <button onClick={handleAssign}>Assign Persona</button>;
}
```

---

## ✅ Checklist de Implementação

```
Types & API:
✅ types/personas.ts
✅ api/personas.ts
✅ api/channels.ts

Hooks:
✅ usePersonas
✅ useChannels

Components:
✅ PersonaGallery
✅ ChannelPersonaSelector
✅ ChannelsList

Next Steps:
☐ Adicionar rotas no App.tsx
☐ Testar com backend rodando
☐ Validar responsividade mobile
☐ Adicionar analytics tracking
```

---

## 🚀 Como Rodar

```bash
# 1. Backend deve estar rodando
cd shortsai-api
npm run dev  # http://localhost:3333

# 2. Frontend
cd shortsai-studio
npm run dev  # http://localhost:5173

# 3. Acessar
# http://localhost:5173/personas (se rota criada)
# Ou importar components onde precisar
```

---

## 🎯 Features Implementadas

✅ **PersonaGallery**
- Grid responsivo 3 cols
- Filtros por categoria
- Badges (Official, Featured, Premium)
- Loading & error states
- Hover effects

✅ **ChannelsList**
- Cards de channels
- Stats (subs, videos, views)
- Persona selector integrado
- Auto-update

✅ **ChannelPersonaSelector**
- Dropdown animado
- Lista todas personas
- Opção "No Persona"
- Loading state

✅ **API Integration**
- Fetch personas
- Fetch channels
- Assign persona
- Error handling

✅ **Type Safety**
- TypeScript strict
- Todas interfaces definidas
- Auto-complete

---

## 🔧 Customização

### **Mudar Cores**
```tsx
// Em PersonaGallery.tsx
const badge = persona.isFeatured 
  ? 'text-emerald-400' // Mudar para outra cor
  : 'text-blue-400';
```

### **Adicionar Campos**
```tsx
// Em ChannelsList.tsx
<div className="mt-4">
  <span>Custom Data: {channel.customField}</span>
</div>
```

### **Filtros Customizados**
```tsx
// Em PersonaGallery.tsx
const [showPremiumOnly, setShowPremiumOnly] = useState(false);

const filtered = personas.filter(p => 
  !showPremiumOnly || p.isPremium
);
```

---

**Frontend está pronto para uso!** 🎉
