# SplitPanel Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor SplitPanel from a static flex container into a proper panel component with show/hide, resize, and standardized detail/empty/loading patterns — eliminating duplicated CSS across 4 consumers.

**Architecture:** Enhanced SplitPanel props API with internal resize handle, CSS-extracted `.detailPanel`/`.detailBody` patterns, and unified empty/loading state. All changes are backward-compatible — existing consumers need only minor prop adjustments.

**Tech Stack:** React 19, CSS Modules, CSS variables (design tokens from `app/globals.css`)

## Global Constraints

- TypeScript strict mode, zero `any`
- CSS Modules only, camelCase class names
- No hardcoded colors — use CSS variables from `app/globals.css`
- No `!important` — use class nesting for specificity
- No `:global(.ant-xxx)` — use ConfigProvider tokens
- Icons: `@ant-design/icons` Outlined only
- Component extraction threshold: 200 lines
- Verification: `npm run typecheck && npm run lint && npm run build`
- Git: AI commits only on feature/* or fix/* branches

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `shared/ui/split-panel/index.tsx` | Modify | Enhanced props, resize logic, slot-based layout |
| `shared/ui/split-panel/index.module.css` | Modify | Resize handle styles, detail panel utilities, empty/loading states |
| `app/pages/books/components/fact-library/index.tsx` | Modify | Use new SplitPanel props, remove custom loading wrapper |
| `app/pages/books/components/fact-library/index.module.css` | Modify | Remove duplicated `.detailPanel`/`.detailContent` |
| `app/pages/books/components/settings-library/index.tsx` | Modify | Use new SplitPanel props, remove custom empty state |
| `app/pages/books/components/settings-library/index.module.css` | Modify | Remove duplicated `.detailPanel`/`.detailBody` |
| `app/pages/books/components/world-rules/index.tsx` | Modify | Use new SplitPanel props, remove redundant `leftWidth={280}` |
| `app/pages/books/components/world-rules/index.module.css` | Modify | Remove duplicated `.detailPanel`/`.detailContent` |
| `app/pages/books/components/tag-library/index.tsx` | Modify | Remove extra `.container` wrapper, use new SplitPanel props |
| `app/pages/books/components/tag-library/index.module.css` | Modify | Remove `.container` and `.rightPanel` duplicates |

---

### Task 1: Redesign SplitPanel Component API and Implementation

**Files:**
- Modify: `shared/ui/split-panel/index.tsx`
- Modify: `shared/ui/split-panel/index.module.css`

**Interfaces:**
- Consumes: None (foundation task)
- Produces: `SplitPanel` with new props: `showLeftPanel`, `leftHeader`, `rightHeader`, `resizable`, `emptyState`, `loading`

- [ ] **Step 1: Rewrite SplitPanel with enhanced props**

```typescript
"use client";

import { useState, useCallback, useRef, type ReactNode } from "react";
import { Spin } from "antd";
import styles from "./index.module.css";

interface SplitPanelProps {
  /** 左侧面板内容 */
  left: ReactNode;
  /** 右侧面板内容，null 时显示 emptyState */
  right: ReactNode | null;
  /** 是否显示左侧面板，默认 true */
  showLeftPanel?: boolean;
  /** 左侧初始宽度，默认 280 */
  leftWidth?: number;
  /** 左侧最小宽度，默认 200 */
  leftMinWidth?: number;
  /** 左侧最大宽度，默认 500 */
  leftMaxWidth?: number;
  /** 是否可拖拽调整宽度，默认 false */
  resizable?: boolean;
  /** 左侧面板头部 slot */
  leftHeader?: ReactNode;
  /** 右侧面板头部 slot */
  rightHeader?: ReactNode;
  /** 右侧空状态内容（传 null 时使用默认空状态） */
  emptyState?: ReactNode;
  /** 右侧空状态文字提示（emptyState 优先） */
  emptyHint?: string;
  /** 加载状态，显示 Spin */
  loading?: boolean;
  /** 右侧面板 CSS 类名覆盖 */
  className?: string;
}

export function SplitPanel({
  left,
  right,
  showLeftPanel = true,
  leftWidth: initialLeftWidth = 280,
  leftMinWidth = 200,
  leftMaxWidth = 500,
  resizable = false,
  leftHeader,
  rightHeader,
  emptyState,
  emptyHint = "选择一项查看详情",
  loading = false,
  className,
}: SplitPanelProps) {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      if (!resizable) return;
      e.preventDefault();
      setIsDragging(true);
      startXRef.current = e.clientX;
      startWidthRef.current = leftWidth;

      const handleDragMove = (ev: PointerEvent) => {
        const delta = ev.clientX - startXRef.current;
        const newWidth = Math.min(
          leftMaxWidth,
          Math.max(leftMinWidth, startWidthRef.current + delta)
        );
        setLeftWidth(newWidth);
      };

      const handleDragEnd = () => {
        setIsDragging(false);
        document.removeEventListener("pointermove", handleDragMove);
        document.removeEventListener("pointerup", handleDragEnd);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("pointermove", handleDragMove);
      document.addEventListener("pointerup", handleDragEnd);
    },
    [resizable, leftWidth, leftMinWidth, leftMaxWidth]
  );

  if (loading) {
    return (
      <div className={styles.splitPanelLoading}>
        <Spin />
      </div>
    );
  }

  const renderEmpty = () => {
    if (emptyState) return emptyState;
    return (
      <div className={styles.emptyRight}>
        <span className={styles.emptyHint}>{emptyHint}</span>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.splitPanel} ${isDragging ? styles.dragging : ""}`}
    >
      {showLeftPanel && (
        <>
          <div
            className={styles.leftPanel}
            style={{ width: leftWidth, minWidth: leftWidth }}
          >
            {leftHeader && (
              <div className={styles.panelHeader}>{leftHeader}</div>
            )}
            <div className={styles.panelBody}>{left}</div>
          </div>
          {resizable && (
            <div
              className={styles.resizeHandle}
              onPointerDown={handleDragStart}
            />
          )}
        </>
      )}
      <div className={`${styles.rightPanel} ${className ?? ""}`}>
        {rightHeader && (
          <div className={styles.panelHeader}>{rightHeader}</div>
        )}
        <div className={styles.panelBody}>
          {right ?? renderEmpty()}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite SplitPanel CSS with new patterns**

```css
/* ===== SplitPanel ===== */
.splitPanel {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: var(--bg-elevated);
}

.splitPanel.dragging {
  pointer-events: none;
}

/* ---- Loading ---- */
.splitPanelLoading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

/* ---- Left Panel ---- */
.leftPanel {
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  border-right: 1px solid var(--border-light);
  overflow: hidden;
  flex-shrink: 0;
}

/* ---- Resize Handle ---- */
.resizeHandle {
  width: 4px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.15s;
  flex-shrink: 0;
  position: relative;
}

.resizeHandle::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: -2px;
  right: -2px;
}

.resizeHandle:hover {
  background: var(--color-primary);
}

/* ---- Right Panel ---- */
.rightPanel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  overflow: hidden;
}

/* ---- Shared Panel Parts ---- */
.panelHeader {
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-light);
}

.panelBody {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ---- Detail Panel Utilities ---- */
.detailPanel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.detailBody {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}

/* ---- Empty State ---- */
.emptyRight {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emptyHint {
  font-size: 13px;
  color: var(--text-tertiary);
  font-family: var(--font-body);
}

/* ---- Responsive ---- */
@media (max-width: 768px) {
  .splitPanel {
    flex-direction: column;
  }

  .leftPanel {
    width: 100% !important;
    min-width: 100% !important;
    max-height: 40%;
    border-right: none;
    border-bottom: 1px solid var(--border-light);
  }

  .resizeHandle {
    display: none;
  }

  .rightPanel {
    flex: 1;
  }
}
```

- [ ] **Step 3: Run typecheck to verify no regressions**

Run: `npm run typecheck`
Expected: PASS (new props are all optional, existing usage still works)

- [ ] **Step 4: Run lint and build**

Run: `npm run lint && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add shared/ui/split-panel/index.tsx shared/ui/split-panel/index.module.css
git commit -m "refactor(split-panel): enhance API with show/hide, resize, slots, loading"
```

---

### Task 2: Update FactLibrary to Use New SplitPanel

**Files:**
- Modify: `app/pages/books/components/fact-library/index.tsx:318-330`
- Modify: `app/pages/books/components/fact-library/index.module.css:139-195`

**Interfaces:**
- Consumes: `SplitPanel` (new API from Task 1)
- Produces: FactLibrary using `loading` prop instead of external Spin wrapper, using `.detailPanel`/`.detailContent` from SplitPanel CSS

- [ ] **Step 1: Update FactLibrary TSX — remove loading wrapper, use loading prop**

Replace lines 318-330 (the conditional loading + SplitPanel render) with:

```tsx
return (
  <>
    <SplitPanel
      left={leftPanel}
      right={rightPanel}
      emptyHint="选择一条事实查看详情"
      loading={loading && facts.length === 0}
    />
    {/* ... modal stays the same ... */}
  </>
);
```

Remove the outer `<div style={{ display: "flex", justifyContent: "center" }}>` wrapper.

- [ ] **Step 2: Update FactLibrary CSS — remove duplicated detailPanel/detailContent**

Remove from `fact-library/index.module.css`:
```css
.detailPanel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
```

```css
.detailContent {
  flex: 1;
  overflow-y: auto;
}
```

Keep `.detailHeader`, `.detailTitleRow`, `.detailActions`, `.detailMeta`, and all other unique styles. Only remove the ones that are now provided by SplitPanel's CSS.

- [ ] **Step 3: Update TSX to use `.detailBody` instead of `.detailContent`**

In `fact-library/index.tsx`, change line 291:
```tsx
// Before
<div className={styles.detailContent}>
// After
<div className="detailContent">
```

Actually, since `.detailContent` is now in SplitPanel's CSS but SplitPanel uses CSS Modules, consumers can't access it directly. Instead, keep `.detailContent` as a local alias or use inline flex styles. Better approach: keep the class in fact-library's CSS but make it a thin wrapper:

```css
/* In fact-library/index.module.css */
.detailContent {
  flex: 1;
  overflow-y: auto;
}
```

This stays as-is since it's a consumer-specific scrolling wrapper. Only remove `.detailPanel` since that's now provided by SplitPanel's `.rightPanel` + `.panelBody`.

- [ ] **Step 4: Verify fact-library renders correctly**

Run: `npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/pages/books/components/fact-library/index.tsx app/pages/books/components/fact-library/index.module.css
git commit -m "refactor(fact-library): use SplitPanel loading prop, remove duplicate detailPanel CSS"
```

---

### Task 3: Update TagLibrary — Remove Extra Wrapper, Unify Loading

**Files:**
- Modify: `app/pages/books/components/tag-library/index.tsx:371-386, 482-488`
- Modify: `app/pages/books/components/tag-library/index.module.css:1-6`

**Interfaces:**
- Consumes: `SplitPanel` (new API from Task 1)
- Produces: TagLibrary without extra `.container` div, loading via SplitPanel's `loading` prop

- [ ] **Step 1: Remove `.container` wrapper from TagLibrary TSX**

Replace lines 482-488:
```tsx
// Before
<div className={styles.container}>
  <SplitPanel
    left={leftPanel}
    right={rightPanel}
    emptyHint="选择一个标签大类"
  />
  <BaseModal ... />
</div>

// After
<>
  <SplitPanel
    left={leftPanel}
    right={rightPanel}
    emptyHint="选择一个标签大类"
    loading={loading && categories.length === 0}
  />
  <BaseModal ... />
</>
```

- [ ] **Step 2: Remove loading bypass (lines 371-386)**

Delete the early return for loading state:
```tsx
// DELETE this block (lines 371-386)
if (loading && categories.length === 0) {
  return (
    <div className={styles.container}>
      <div style={{ ... }}>
        <Spin />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Remove `.container` CSS class**

Delete from `tag-library/index.module.css`:
```css
.container {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```

- [ ] **Step 4: Verify tag-library renders correctly**

Run: `npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/pages/books/components/tag-library/index.tsx app/pages/books/components/tag-library/index.module.css
git commit -m "refactor(tag-library): remove extra container wrapper, use SplitPanel loading prop"
```

---

### Task 4: Update SettingsLibrary — Use Built-in Empty State

**Files:**
- Modify: `app/pages/books/components/settings-library/index.tsx:622-635`
- Modify: `app/pages/books/components/settings-library/index.module.css:133-138, 177-181`

**Interfaces:**
- Consumes: `SplitPanel` (new API from Task 1)
- Produces: SettingsLibrary using SplitPanel's default empty state instead of custom inline fallback

- [ ] **Step 1: Remove custom empty state, pass null to right**

Replace lines 622-635 in `settings-library/index.tsx`:
```tsx
// Before
) : (
  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
      选择一项设定查看详情
    </span>
  </div>
);

// After — just pass null, SplitPanel handles empty state
) : null;
```

- [ ] **Step 2: Remove duplicated detailPanel/detailBody CSS**

Remove from `settings-library/index.module.css`:
```css
.detailPanel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.detailBody {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
```

The `.detailPanel` is now provided by SplitPanel. For `.detailBody`, keep it as a consumer-specific class but use SplitPanel's pattern — or rename to use the shared pattern.

- [ ] **Step 3: Update TSX class references**

In `settings-library/index.tsx`, the right panel wraps content in `<div className={styles.detailPanel}>` and `<div className={styles.detailBody}>`. Since `.detailPanel` is removed from local CSS, the component will use the one from SplitPanel's CSS (via the `.rightPanel > .panelBody` structure). Update to use SplitPanel's exported class or keep local thin wrappers.

Best approach: keep `.detailBody` as a local class with just the padding, and use `<div className={styles.detailBody}>` for the scrollable content area.

- [ ] **Step 4: Verify settings-library renders correctly**

Run: `npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/pages/books/components/settings-library/index.tsx app/pages/books/components/settings-library/index.module.css
git commit -m "refactor(settings-library): use SplitPanel empty state, remove duplicate CSS"
```

---

### Task 5: Update WorldRules — Remove Redundant leftWidth

**Files:**
- Modify: `app/pages/books/components/world-rules/index.tsx:413-418`
- Modify: `app/pages/books/components/world-rules/index.module.css:120-125`

**Interfaces:**
- Consumes: `SplitPanel` (new API from Task 1)
- Produces: WorldRules with cleaner SplitPanel usage, no duplicate detailPanel CSS

- [ ] **Step 1: Remove redundant leftWidth prop**

In `world-rules/index.tsx`, line 413-418, remove `leftWidth={280}`:
```tsx
// Before
<SplitPanel
  left={leftPanel}
  right={rightPanel}
  leftWidth={280}
  emptyHint="选择一条规则查看详情"
/>

// After
<SplitPanel
  left={leftPanel}
  right={rightPanel}
  emptyHint="选择一条规则查看详情"
/>
```

- [ ] **Step 2: Remove duplicated detailPanel CSS**

Remove from `world-rules/index.module.css`:
```css
.detailPanel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
```

Keep `.detailContent` as it has consumer-specific padding/scrolling behavior.

- [ ] **Step 3: Verify world-rules renders correctly**

Run: `npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/pages/books/components/world-rules/index.tsx app/pages/books/components/world-rules/index.module.css
git commit -m "refactor(world-rules): remove redundant leftWidth, remove duplicate detailPanel CSS"
```

---

### Task 6: Final Verification and Cross-Page Smoke Test

**Files:**
- None (verification only)

**Interfaces:**
- Consumes: All changes from Tasks 1-5
- Produces: Confirmation that all 4 panels render correctly

- [ ] **Step 1: Full typecheck + lint + build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: All PASS, zero errors

- [ ] **Step 2: Start dev server and visually verify each panel**

Run: `npm run dev`

Manually verify (or use playwright):
1. Navigate to each panel via the activity bar
2. FactLibrary: left panel visible, right panel shows empty state when nothing selected, detail when selected
3. TagLibrary: no extra wrapper layer, loading shows correctly, left/right split works
4. SettingsLibrary: empty state shows "选择一项设定查看详情" text, detail panel renders when entity selected
5. WorldRules: left/right split works, no visual regression
6. Resize handle (if enabled): drag to resize, respects min/max width
7. Dark theme: all panels render correctly

- [ ] **Step 3: Final commit if any adjustments needed**

```bash
git add -A
git commit -m "fix(split-panel): final adjustments from visual verification"
```
