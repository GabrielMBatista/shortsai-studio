# Component Refactoring Guide

## Example: ChannelSidebarList Refactored

This document shows how to refactor existing components to use the new Design System.

---

## ❌ **Before** (Old Pattern)

```tsx
// ChannelSidebarList.tsx (BEFORE)
<div className="bg-slate-900 md:bg-slate-900/50 border-r border-slate-800 flex flex-col gap-2 h-screen">
  <div className="flex items-center justify-between p-4 mb-2">
    <h3 className="text-sm font-semibold text-slate-400 uppercase">Channels</h3>
  </div>
  
  <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg bg-indigo-500/20 text-indigo-400">
    All Channels
  </button>
  
  <div className="h-9 rounded-lg bg-slate-800/50 animate-pulse" />
</div>
```

**Problems:**
- 🔴 Hardcoded colors (`bg-slate-900`, `text-indigo-400`)
- 🔴 Repeated spacing values (`px-3 py-2`)
- 🔴 Inline styles scattered throughout
- 🔴 No reusable components

---

## ✅ **After** (Design System)

```tsx
// ChannelSidebarList.tsx (AFTER)
import { Card, Badge, Spinner } from '@/components/ui';

<Card variant="elevated" padding="none" className="h-screen">
  <div className="flex items-center justify-between p-4 mb-2">
    <h3 style={{
      fontSize: 'var(--font-size-sm)',
      fontWeight: 'var(--font-weight-semibold)',
      color: 'var(--color-text-tertiary)',
      textTransform: 'uppercase'
    }}>
      Channels
    </h3>
  </div>
  
  <button style={{
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-2) var(--space-3)',
    width: '100%',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'var(--color-primary-500)',
    color: 'var(--color-primary-400)'
  }}>
    All Channels
  </button>
  
  {isLoading && <Spinner size="md" />}
</Card>
```

**Benefits:**
- ✅ Uses CSS Variables for theming
- ✅ Uses reusable `Card`, `Badge`, `Spinner` components
- ✅ Easier to maintain and update theme
- ✅ Consistent with design system

---

## 🔄 **Progressive Refactoring Steps**

### **Step 1: Replace Containers**
```tsx
// OLD
<div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
  ...
</div>

// NEW
<Card variant="glass" padding="md">
  ...
</Card>
```

---

### **Step 2: Replace Buttons**
```tsx
// OLD
<button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold">
  Click me
</button>

// NEW
<Button variant="primary" size="lg">
  Click me
</Button>
```

---

### **Step 3: Replace Inputs**
```tsx
// OLD
<input
  type="text"
  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white"
  placeholder="Enter text"
/>

// NEW
<Input
  placeholder="Enter text"
  label="Field Label"
/>
```

---

### **Step 4: Replace Badges/Tags**
```tsx
// OLD
<span className="bg-indigo-500/20 text-indigo-400 px-2.5 py-1 text-sm rounded-lg border border-indigo-500/30">
  Active
</span>

// NEW
<Badge variant="primary" size="md">
  Active
</Badge>
```

---

### **Step 5: Replace Modals**
```tsx
// OLD
<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm">
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
    <h2 className="text-2xl font-bold text-white mb-4">Title</h2>
    <div className="mb-6">Content</div>
    <div className="flex gap-3">
      <button className="px-4 py-2 bg-slate-700 rounded-lg">Cancel</button>
      <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Confirm</button>
    </div>
  </div>
</div>

// NEW
<Modal isOpen={isOpen} onClose={handleClose}>
  <ModalHeader>
    <ModalTitle>Title</ModalTitle>
  </ModalHeader>
  <ModalBody>
    Content
  </ModalBody>
  <ModalFooter>
    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
    <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
  </ModalFooter>
</Modal>
```

---

### **Step 6: Use CSS Variables for Custom Styles**
```tsx
// OLD
<div className="text-slate-400 bg-slate-900/50 border-slate-700 p-4 rounded-xl">
  ...
</div>

// NEW
<div style={{
  color: 'var(--color-text-tertiary)',
  backgroundColor: 'var(--color-surface)',
  border: `1px solid var(--color-border)`,
  padding: 'var(--space-4)',
  borderRadius: 'var(--radius-xl)'
}}>
  ...
</div>
```

---

## 📊 **Migration Checklist**

- [ ] Review component for duplicated styles
- [ ] Identify reusable patterns (buttons, cards, inputs)
- [ ] Replace with Design System components
- [ ] Use CSS Variables for remaining custom styles
- [ ] Test component in all states (loading, error, disabled)
- [ ] Verify accessibility (focus states, ARIA attributes)
- [ ] Update component documentation

---

## 🎯 **Priority Components to Refactor**

1. **High Priority**
   - ✅ Dashboard.tsx (many cards and buttons)
   - ✅ InputSection.tsx (forms, inputs)
   - ✅ ScriptView.tsx (complex UI)
   - ✅ VideoPlayer.tsx (modals, controls)
   - ✅ ProjectCard.tsx (card components)

2. **Medium Priority**
   - ChannelsList.tsx
   - FolderList.tsx
   - PersonaGallery.tsx
   - SettingsScreen.tsx

3. **Low Priority**
   - Tutorial.tsx
   - Toast.tsx (already simple)
   - Loader.tsx (already abstracted)

---

## 🚀 **Next Actions**

1. Start with **ProjectCard.tsx** (simple, high-visibility)
2. Refactor **Dashboard.tsx** (biggest impact)
3. Update **InputSection.tsx** (most forms)
4. Migrate modals across the app
5. Create additional UI components as needed (Select, Toggle, etc.)

---

**Last Updated**: 2025-12-13
