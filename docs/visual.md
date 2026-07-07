# Visual Specification

## Tech Stack Constraints

- **Only component library**: Ant Design v6 (`antd@^6.5.0`)
- **Only icon library**: `@ant-design/icons` (Outlined style)
- **Forbidden**: Third-party UI libs (Material UI, Tailwind, etc.)
- **Forbidden**: `:global(.ant-xxx)` overrides on Ant Design styles
- **Allowed**: `ConfigProvider theme` for token adjustments; CSS Modules for layout

## Design Tokens

All values defined as CSS variables in `app/globals.css`.

### Functional Colors

| Semantic | Variable | Value |
|----------|----------|-------|
| Primary | `--color-primary` | `#2F5D50` |
| Primary hover | `--color-primary-hover` | `#1e4438` |
| Primary bg | `--color-primary-bg` | `rgba(47,93,80,0.05)` |
| Success | `--color-success` | `#2E8B57` |
| Warning | `--color-warning` | `#964400` |
| Error | `--color-error` | `#ba1a1a` |

### Background Colors

| Level | Variable | Value |
|-------|----------|-------|
| Page | `--bg-page` | `#f0ece4` |
| Elevated | `--bg-elevated` | `#faf8f4` |
| Muted | `--bg-muted` | `#f5f2ec` |
| Strong | `--bg-strong` | `#e8e4dc` |

### Text Colors

| Level | Variable | Value |
|-------|----------|-------|
| Primary | `--text-primary` | `#1a1814` |
| Secondary | `--text-secondary` | `#4a4640` |
| Tertiary | `--text-tertiary` | `#807b74` |
| Light | `--text-light` | `#b5b0a8` |
| Inverse | `--text-inverse` | `#ffffff` |

### Border Colors

| Level | Variable | Value |
|-------|----------|-------|
| Default | `--border` | `#ddd8d0` |
| Strong | `--border-strong` | `#c0bbb3` |

### Usage Rules

- **No hardcoded colors** — use CSS variables only
- **No non-standard colors** (blue, purple, etc.)
- Functional colors: green = success, orange = warning, red = error

### Typography

| Purpose | Variable | Stack |
|---------|----------|-------|
| Display | `--font-display` | `'Noto Serif SC', serif` |
| Body | `--font-body` | `'Inter', 'Noto Sans', 'Noto Sans SC', sans-serif` |
| Monospace | `--font-mono` | `'JetBrains Mono', 'Fira Code', 'Consolas', monospace` |

Size scale: 18px (page title) → 16px (section title) → 14px (body) → 13px (auxiliary) → 12px (small) → 11px (tiny)

### Spacing Scale

| Variable | Value | Use |
|----------|-------|-----|
| `--space-1` | 4px | Icon-text gap |
| `--space-2` | 8px | Button groups, tag gap |
| `--space-3` | 12px | Form/list item gap |
| `--space-4` | 16px | Block padding |
| `--space-5` | 20px | Panel padding |
| `--space-6` | 24px | Modal padding |
| `--space-8` | 32px | Page-level spacing |

### Border Radius

| Variable | Value | Use |
|----------|-------|-----|
| `--radius-sm` | 4px | Tag, Badge |
| `--radius-md` | 6px | Input, Selector |
| `--radius-lg` | 8px | Card, Modal |
| `--radius-xl` | 12px | Large card, Panel |
| `--radius-full` | 9999px | Circle button, Avatar |

### Shadows

| Variable | Definition | Use |
|----------|------------|-----|
| `--shadow` | `0 1px 3px rgba(24,28,34,0.08)` | Card, dropdown |
| `--shadow-md` | `0 4px 12px rgba(24,28,34,0.12)` | Modal, popover |
| `--shadow-lg` | `0 8px 24px rgba(24,28,34,0.16)` | Full-screen modal |

## Responsive

Single breakpoint: `@media (max-width: 768px)`
