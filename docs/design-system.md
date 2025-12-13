# Frontend Architecture - Design System Documentation

## 📐 Design System Implementation

### **Structure**
```
src/
├── styles/
│   └── theme.css          # CSS Variables & Design Tokens
├── components/
│   └── ui/                # Base Reusable Components
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       ├── Badge.tsx
│       ├── Spinner.tsx
│       └── index.ts       # Centralized exports
```

---

## 🎨 Theme System (CSS Variables)

All visual tokens are centralized in `src/styles/theme.css`:

### **Color Palette**
- **Base**: `--color-slate-{50-950}` (neutral palette)
- **Primary**: `--color-primary-{50-900}` (indigo)
- **Secondary**: `--color-secondary-{50-900}` (purple)
- **Semantic Colors**: success, warning, error, accent

### **Spacing Scale**
- `--space-{1-24}` (0.25rem to 6rem)

### **Typography**
- Font sizes: `--font-size-{xs-6xl}`
- Font weights: `--font-weight-{normal|medium|semibold|bold|extrabold}`

### **Border Radius**
- `--radius-{sm|md|lg|xl|2xl|3xl|full}`

### **Shadows**
- `--shadow-{sm|md|lg|xl|2xl}`
- Themed shadows: `--shadow-primary`, `--shadow-error`

### **Animations**
Predefined keyframes:
- `fadeIn`, `fadeInUp`, `fadeInDown`
- `slideInLeft`, `slideInRight`
- `scaleIn`, `spin`, `pulse`, `ken-burns`

---

## 🧩 UI Components

### **Button**
```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md" isLoading={false}>
  Click me
</Button>
```

**Props:**
- `variant`: `primary` | `secondary` | `outline` | `ghost` | `danger`
- `size`: `sm` | `md` | `lg`
- `isLoading`: boolean
- `leftIcon`, `rightIcon`: React.ReactNode
- `fullWidth`: boolean

---

### **Card**
```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui';

<Card variant="glass" padding="md" hoverable>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
  <CardFooter>
    Footer actions
  </CardFooter>
</Card>
```

**Variants:**
- `default`: Standard card
- `elevated`: With shadow
- `outlined`: Transparent with border
- `glass`: Glassmorphism effect

---

### **Input & Textarea**
```tsx
import { Input, Textarea } from '@/components/ui';

<Input
  label="Email"
  placeholder="you@example.com"
  error="Invalid email"
  leftIcon={<Mail />}
/>

<Textarea
  label="Description"
  rows={4}
  helpText="Max 500 characters"
/>
```

---

### **Modal**
```tsx
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui';

<Modal isOpen={isOpen} onClose={handleClose} size="lg">
  <ModalHeader>
    <ModalTitle>Modal Title</ModalTitle>
  </ModalHeader>
  <ModalBody>
    Content
  </ModalBody>
  <ModalFooter>
    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
    <Button variant="primary">Confirm</Button>
  </ModalFooter>
</Modal>
```

**Sizes:** `sm` | `md` | `lg` | `xl` | `full`

---

### **Badge**
```tsx
import { Badge } from '@/components/ui';

<Badge variant="success" size="sm" dot>
  Active
</Badge>
```

**Variants:**
- `default`, `primary`, `success`, `warning`, `error`, `secondary`

---

### **Spinner & Loader**
```tsx
import { Spinner, Loader } from '@/components/ui';

<Spinner size="md" />
<Loader message="Loading data..." size="lg" />
```

---

## 🔄 Migration Guide

### **Before (Old Pattern)**
```tsx
<button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg">
  Click me
</button>
```

### **After (Design System)**
```tsx
<Button variant="primary" size="lg">
  Click me
</Button>
```

---

## ✅ Benefits

1. **Consistency**: Unified visual language across the app
2. **Maintainability**: Single source of truth for styles
3. **Accessibility**: Built-in focus states, ARIA-friendly
4. **Performance**: Reusable components reduce bundle size
5. **Dark Mode Ready**: CSS variables make theming trivial
6. **Type Safety**: Full TypeScript support

---

## 🚀 Next Steps

1. **Migrate existing components** to use the new design system
2. **Remove inline Tailwind classes** where applicable
3. **Extend the UI library** with additional components as needed (Select, Checkbox, Radio, Switch, etc.)
4. **Document component usage** in Storybook (optional)

---

## 📚 References

- **Theme File**: `src/styles/theme.css`
- **Components**: `src/components/ui/`
- **Import Pattern**: `import { Button, Card } from '@/components/ui';`

---

**Last Updated**: 2025-12-13
**Maintained By**: ShortsAI Studio Team
