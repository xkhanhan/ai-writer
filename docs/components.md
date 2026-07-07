# Component Interaction Rules

## Buttons

### Type Mapping

| Type | Scenario |
|------|----------|
| `type="primary"` | Main action, form submit (save, create, confirm) |
| `danger` | Delete, irreversible action |
| `type="text"` | Toolbar icon buttons (expand/collapse, more actions) |
| `type="link"` | Inline text action (e.g. "Create category") |
| default | Secondary / cancel |

### Rules

- One `primary` button per page/modal maximum
- All deletes use `confirmDelete` (see [utils.md](./utils.md))
- Async buttons: immediate `loading` state → `showSuccess`/`showError` → restore state
- **Forbidden**: Async operation without loading state; delete without confirmation

### Sizing

| Context | Size |
|---------|------|
| Modal action buttons | default |
| Toolbar / inline buttons | `size="small"` |
| Form submit | default |

## Tags (Tag)

| Level | Color | Scenario |
|-------|-------|----------|
| Core | `color="green"` | Positive/completion status, core content |
| Important | `color="red"` / `color="orange"` | Highlight attention |
| General | default | Neutral categories |

**Forbidden**: Other tag colors (blue, purple, etc.)

## Forms

- Label: 14px body font
- Inputs: `size="small"`
- Required fields: red `*` after label
- Validation fail: red border + text message
- Submit: `type="primary"`, Form `layout="vertical"`

## Modals

All create/edit modals use `BaseModal` (see [utils.md](./utils.md)):

- Three-layer layout: fixed title → scrollable content → fixed footer
- `maxHeight: 85vh`, overflow auto-scroll
- `closable=false`, close via footer buttons
- Footer: cancel (left) + confirm (right, primary)
- Form save: `confirmLoading` on confirm button

## Sidebars

- Left panel width: 280px
- Header: title 14px `var(--text-primary)` + expand arrow (DownOutlined rotate -90deg)
- Add button: visible on parent hover, `size="small"`
- Selected: `background: var(--color-primary-bg); color: var(--color-primary)`
- Delete: hover shows DeleteOutlined → `confirmDelete`
- New entity: bottom fixed `Button block type="primary" icon={<PlusOutlined />}`

## Empty State

- Icon: 64px, `var(--text-light)`
- Title: 16px `var(--text-tertiary)`; Description: 14px `var(--text-tertiary)`
- Background: `var(--bg-muted)`, border-radius: `var(--radius-lg)`

## SplitPanel

All list+detail pages must use `SplitPanel` (`shared/ui/split-panel/`). See visual spec for layout details.

## Dividers

Use CSS `gap` + pseudo-elements, no DOM nodes. Background: `var(--border-light)`, height: 1px.

## Icons

- Library: `@ant-design/icons` Outlined only
- Inline buttons: 12px; Action column: 14px; Empty state: 64px
- Color follows text color
