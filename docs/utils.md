# Utilities & Shared Components

## Message Tools

Import from `@/app/utils/error-handler`:

```typescript
import { showError, showSuccess, showWarning, showInfo } from "@/app/utils/error-handler";
```

| Function | Use |
|----------|-----|
| `showError(msg)` | API failure, validation error |
| `showSuccess(msg)` | Save/create success |
| `showWarning(msg)` | Non-critical anomalies |
| `showInfo(msg)` | Operation guidance |

**Forbidden**: Direct `message.error()` / `message.success()` — use wrappers above.

## Date Formatting

Use `formatDate()` from `app/utils/format-date.ts`. **Forbidden**: `new Date().toLocaleDateString()` or raw Date formatting.

## Shared UI Components (`shared/ui/`)

| Component | Path | Purpose |
|-----------|------|---------|
| `SplitPanel` | `shared/ui/split-panel/` | Left-right split layout |
| `EmptyState` | `shared/ui/empty-state/` | Empty state placeholder |
| `ConfirmDelete` | `shared/ui/confirm-delete/` | Delete confirmation modal |
| `SaveButton` | `shared/ui/save-button/` | Save button with loading |
| `BaseModal` | `shared/ui/base-modal/` | Base modal (three-layer layout) |
| `AiDropdown` | `shared/ui/ai-dropdown/` | AI action dropdown |
| `ArrayInput` | `shared/ui/array-input/` | Array input component |
| `Theme` | `shared/ui/theme/` | Theme switching context |
| `TagTree` | `shared/ui/tag-tree/` | Tag tree component (ConfigProvider tokens) |
| `TagSelector` | `shared/ui/tag-selector/` | Cascading tag selector (TreeSelect) |

### BaseModal

- Three-layer: fixed title → scrollable body (`flex:1`) → fixed footer (`flex-shrink:0`)
- `maxHeight: 85vh`, overflow auto
- `closable=false`, close via footer buttons
- `destroyOnClose=true`
- Optional `footer` prop — pass `null` to hide footer

### ConfirmDelete

Use `confirmDelete(action, label, warning?)` to trigger delete confirmation.
Internal loading prevents double-click.
Default copy: `Are you sure you want to delete "{name}"? This cannot be undone.`

### SaveButton

Based on antd `Button` with `loading` prop. For standalone save scenarios.
Form saves use Modal's `confirmLoading` instead.

## Server Utilities

- ID generation: `server/utils/id-generator.ts`
- DB connection: `server/storage/db.ts` → `getDb()`
- **Forbidden**: Client code importing from `server/`
