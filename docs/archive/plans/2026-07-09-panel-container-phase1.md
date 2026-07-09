# Panel Container Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace SplitPanel with an IDE-style PanelContainer system supporting horizontal split, drag resize, and panel collapse.

**Architecture:** `PanelContainer > PanelGroup > Panel + Divider` component tree. Panel handles its own header/body structure so consumers write zero layout CSS. All styles use Design Tokens from `docs/visual.md`.

**Tech Stack:** React 19, CSS Modules, CSS variables, TypeScript strict

## Global Constraints

- TypeScript strict mode, zero `any`
- CSS Modules only, camelCase class names
- All colors via CSS variables from `app/globals.css` — no hardcoded values
- No `!important`, no `:global(.ant-xxx)`
- Icons: `@ant-design/icons` Outlined only
- Component extraction threshold: 200 lines
- Verification: `npm run typecheck && npm run lint && npm run build`
- Git: AI commits only on feature/* or fix/* branches

## Design Principles

1. **Consumer zero layout CSS** — Panel provides all structural styles (header, body, divider). Consumers only write content styles.
2. **Design Token alignment** — All values from `docs/visual.md` tokens.
3. **Slot-based extensibility** — title, actions, icon, tabs are all slots.

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `shared/ui/panel-container/types.ts` | Create | Shared type definitions |
| `shared/ui/panel-container/use-panel-resize.ts` | Create | Drag resize hook |
| `shared/ui/panel-container/divider.tsx` | Create | Draggable divider |
| `shared/ui/panel-container/panel.tsx` | Create | Panel with header/body/collapse |
| `shared/ui/panel-container/panel-group.tsx` | Create | Panel group (direction container) |
| `shared/ui/panel-container/panel-container.tsx` | Create | Root container |
| `shared/ui/panel-container/index.tsx` | Create | Barrel exports |
| `shared/ui/panel-container/index.module.css` | Create | All container styles |
| `app/pages/books/components/fact-library/index.tsx` | Modify | Migrate to PanelContainer |
| `app/pages/books/components/fact-library/index.module.css` | Modify | Remove layout CSS, keep content CSS |
| `app/pages/books/components/world-rules/index.tsx` | Modify | Migrate to PanelContainer |
| `app/pages/books/components/world-rules/index.module.css` | Modify | Remove layout CSS, keep content CSS |
| `app/pages/books/components/tag-library/index.tsx` | Modify | Migrate to PanelContainer |
| `app/pages/books/components/tag-library/index.module.css` | Modify | Remove layout CSS, keep content CSS |
| `app/pages/books/components/settings-library/index.tsx` | Modify | Migrate to PanelContainer |
| `app/pages/books/components/settings-library/index.module.css` | Modify | Remove layout CSS, keep content CSS |
| `shared/ui/split-panel/` | Delete | Obsolete — replaced by panel-container |

---

### Task 1: Create Types and use-panel-resize Hook

**Files:**
- Create: `shared/ui/panel-container/types.ts`
- Create: `shared/ui/panel-container/use-panel-resize.ts`

**Interfaces:**
- Consumes: None (foundation)
- Produces: `PanelState`, `UsePanelResizeReturn` types, `usePanelResize` hook

- [ ] **Step 1: Create types.ts**

```typescript
export interface PanelState {
  size: number;
  collapsed: boolean;
}

export interface PanelLayout {
  panels: Record<string, PanelState>;
}

export type Direction = "horizontal" | "vertical";
```

- [ ] **Step 2: Create use-panel-resize.ts**

```typescript
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Direction } from "./types";

interface UsePanelResizeOptions {
  direction: Direction;
  size: number;
  minSize: number;
  maxSize: number;
  onResize: (newSize: number) => void;
}

export function usePanelResize({
  direction,
  size,
  minSize,
  maxSize,
  onResize,
}: UsePanelResizeOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
  }, []);

  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      const startPos = direction === "horizontal" ? e.clientX : e.clientY;
      const startSize = size;

      const handleDragMove = (ev: PointerEvent) => {
        const currentPos = direction === "horizontal" ? ev.clientX : ev.clientY;
        const delta = currentPos - startPos;
        const newSize = Math.min(maxSize, Math.max(minSize, startSize + delta));
        onResize(newSize);
      };

      const cursor = direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.cursor = cursor;
      document.body.style.userSelect = "none";
      document.addEventListener("pointermove", handleDragMove);
      document.addEventListener("pointerup", handleDragEnd);

      cleanupRef.current = () => {
        document.removeEventListener("pointermove", handleDragMove);
        document.removeEventListener("pointerup", handleDragEnd);
      };
    },
    [direction, size, minSize, maxSize, onResize, handleDragEnd]
  );

  const handleDoubleClick = useCallback(() => {
    onResize(size);
  }, [size, onResize]);

  return { isDragging, handleDragStart, handleDoubleClick };
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add shared/ui/panel-container/
git commit -m "feat(panel-container): add types and use-panel-resize hook"
```

---

### Task 2: Create Divider Component

**Files:**
- Create: `shared/ui/panel-container/divider.tsx`

**Interfaces:**
- Consumes: `usePanelResize` (Task 1), `Direction` type
- Produces: `Divider` component

- [ ] **Step 1: Create divider.tsx**

```typescript
"use client";

import type { Direction } from "./types";
import { usePanelResize } from "./use-panel-resize";
import styles from "./index.module.css";

interface DividerProps {
  direction: Direction;
  size: number;
  minSize: number;
  maxSize: number;
  onResize: (newSize: number) => void;
  onDoubleClick?: () => void;
}

export function Divider({
  direction,
  size,
  minSize,
  maxSize,
  onResize,
  onDoubleClick,
}: DividerProps) {
  const { isDragging, handleDragStart, handleDoubleClick } = usePanelResize({
    direction,
    size,
    minSize,
    maxSize,
    onResize,
  });

  return (
    <div
      className={`${styles.divider} ${styles[direction]} ${isDragging ? styles.dragging : ""}`}
      onPointerDown={handleDragStart}
      onDoubleClick={onDoubleClick}
    />
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add shared/ui/panel-container/divider.tsx
git commit -m "feat(panel-container): add Divider component with drag resize"
```

---

### Task 3: Create Panel Component

**Files:**
- Create: `shared/ui/panel-container/panel.tsx`

**Interfaces:**
- Consumes: `Direction` type
- Produces: `Panel` component with header, body, collapse

- [ ] **Step 1: Create panel.tsx**

```typescript
"use client";

import { useState, useCallback, type ReactNode } from "react";
import { DownOutlined } from "@ant-design/icons";
import styles from "./index.module.css";

interface PanelProps {
  id: string;
  title?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  collapsible?: boolean;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  children: ReactNode;
}

export function Panel({
  title,
  actions,
  icon,
  collapsible = false,
  collapsed: controlledCollapsed,
  onCollapse,
  children,
}: PanelProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed ?? internalCollapsed;

  const handleCollapse = useCallback(() => {
    const next = !isCollapsed;
    if (onCollapse) {
      onCollapse(next);
    } else {
      setInternalCollapsed(next);
    }
  }, [isCollapsed, onCollapse]);

  return (
    <div className={`${styles.panel} ${isCollapsed ? styles.collapsed : ""}`}>
      {(title || actions || collapsible) && (
        <div className={styles.panelHeader}>
          {collapsible && (
            <button
              className={styles.panelCollapseBtn}
              onClick={handleCollapse}
              aria-label={isCollapsed ? "展开" : "折叠"}
            >
              <DownOutlined
                style={{
                  fontSize: 10,
                  transform: isCollapsed ? "rotate(-90deg)" : "none",
                  transition: "transform 0.2s",
                }}
              />
            </button>
          )}
          {icon && <span className={styles.panelIcon}>{icon}</span>}
          {title && <span className={styles.panelTitle}>{title}</span>}
          {actions && <div className={styles.panelActions}>{actions}</div>}
        </div>
      )}
      <div className={styles.panelBody}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add shared/ui/panel-container/panel.tsx
git commit -m "feat(panel-container): add Panel component with header/body/collapse"
```

---

### Task 4: Create PanelGroup, PanelContainer, Index, and CSS

**Files:**
- Create: `shared/ui/panel-container/panel-group.tsx`
- Create: `shared/ui/panel-container/panel-container.tsx`
- Create: `shared/ui/panel-container/index.tsx`
- Create: `shared/ui/panel-container/index.module.css`

**Interfaces:**
- Consumes: `Panel` (Task 3), `Divider` (Task 2), `Direction` type
- Produces: Complete PanelContainer system

- [ ] **Step 1: Create panel-group.tsx**

```typescript
"use client";

import { useState, useCallback, Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Divider } from "./divider";
import type { Direction } from "./types";
import styles from "./index.module.css";

interface PanelGroupProps {
  direction: Direction;
  children: ReactNode;
}

export function PanelGroup({ direction, children }: PanelGroupProps) {
  const childArray = Children.toArray(children).filter(isValidElement);

  // Initialize sizes from Panel defaultSize props
  const [sizes, setSizes] = useState<number[]>(() => {
    return childArray.map((child) => {
      if (child.type === Divider) return 4; // divider default size
      const props = child.props as Record<string, unknown>;
      return (props.defaultSize as number) ?? 280;
    });
  });

  const handleResize = useCallback((index: number, newSize: number) => {
    setSizes((prev) => {
      const next = [...prev];
      next[index] = newSize;
      return next;
    });
  }, []);

  // Build panel elements with sizes and dividers
  const elements: ReactElement[] = [];
  let panelIndex = 0;

  childArray.forEach((child, i) => {
    if (child.type === Divider) {
      const prevPanelIdx = panelIndex - 1;
      const prevPanel = childArray
        .filter((c) => c !== child && isValidElement(c) && c.type !== Divider)
        [prevPanelIdx];
      const prevProps = prevPanel?.props as Record<string, unknown> | undefined;
      const minSize = (prevProps?.minSize as number) ?? 100;
      const maxSize = (prevProps?.maxSize as number) ?? 800;

      elements.push(
        <Divider
          key={`divider-${i}`}
          direction={direction}
          size={sizes[prevPanelIdx] ?? 280}
          minSize={minSize}
          maxSize={maxSize}
          onResize={(newSize) => handleResize(prevPanelIdx, newSize)}
        />
      );
    } else {
      const idx = panelIndex;
      const panelSize = sizes[idx] ?? 280;
      const isHorizontal = direction === "horizontal";
      const style = isHorizontal
        ? { width: panelSize, minWidth: panelSize }
        : { height: panelSize, minHeight: panelSize };

      elements.push(
        <div key={`panel-${idx}`} className={styles.panelWrapper} style={style}>
          {cloneElement(child as ReactElement<Record<string, unknown>>)}
        </div>
      );
      panelIndex++;
    }
  });

  return (
    <div className={`${styles.panelGroup} ${styles[direction]}`}>
      {elements}
    </div>
  );
}
```

- [ ] **Step 2: Create panel-container.tsx**

```typescript
"use client";

import type { ReactNode } from "react";
import styles from "./index.module.css";

interface PanelContainerProps {
  children: ReactNode;
  className?: string;
}

export function PanelContainer({ children, className }: PanelContainerProps) {
  return (
    <div className={`${styles.panelContainer} ${className ?? ""}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Create index.tsx (barrel exports)**

```typescript
export { PanelContainer } from "./panel-container";
export { PanelGroup } from "./panel-group";
export { Panel } from "./panel";
export { Divider } from "./divider";
export type { Direction, PanelState, PanelLayout } from "./types";
```

- [ ] **Step 4: Create index.module.css**

```css
/* ===== PanelContainer ===== */
.panelContainer {
  display: flex;
  height: 100%;
  overflow: hidden;
}

/* ===== PanelGroup ===== */
.panelGroup {
  display: flex;
  overflow: hidden;
}

.panelGroup.horizontal {
  flex-direction: row;
}

.panelGroup.vertical {
  flex-direction: column;
}

/* ===== Panel Wrapper (internal, sized by PanelGroup) ===== */
.panelWrapper {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

/* ===== Panel ===== */
.panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  height: 100%;
  background: var(--bg-elevated);
}

.panel.collapsed {
  overflow: visible;
}

.panel.collapsed .panelBody {
  display: none;
}

/* ---- Panel Header ---- */
.panelHeader {
  display: flex;
  align-items: center;
  padding: 0 var(--space-3);
  height: 36px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
  gap: var(--space-2);
}

.panelCollapseBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  transition: all 0.15s;
  flex-shrink: 0;
}

.panelCollapseBtn:hover {
  background: var(--bg-muted);
  color: var(--text);
}

.panelIcon {
  display: flex;
  align-items: center;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.panelTitle {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  font-family: var(--font-body);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panelActions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-left: auto;
  flex-shrink: 0;
}

/* ---- Panel Body ---- */
.panelBody {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ===== Divider ===== */
.divider {
  flex-shrink: 0;
  position: relative;
  background: transparent;
  transition: background 0.15s;
  z-index: 1;
}

.divider::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: -2px;
  right: -2px;
}

.divider.horizontal {
  width: 4px;
  cursor: col-resize;
}

.divider.vertical {
  height: 4px;
  cursor: row-resize;
}

.divider:hover {
  background: var(--color-primary);
}

.divider.dragging {
  background: var(--color-primary);
  pointer-events: none;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .panelGroup.horizontal {
    flex-direction: column;
  }

  .divider.horizontal {
    width: 100%;
    height: 4px;
    cursor: row-resize;
  }

  .divider.vertical {
    display: none;
  }
}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add shared/ui/panel-container/
git commit -m "feat(panel-container): add PanelGroup, PanelContainer, CSS and barrel exports"
```

---

### Task 5: Migrate FactLibrary to PanelContainer

**Files:**
- Modify: `app/pages/books/components/fact-library/index.tsx`
- Modify: `app/pages/books/components/fact-library/index.module.css`

**Interfaces:**
- Consumes: `PanelContainer`, `PanelGroup`, `Panel`, `Divider` (Tasks 1-4)
- Produces: FactLibrary using PanelContainer

- [ ] **Step 1: Update imports in fact-library/index.tsx**

Replace `SplitPanel` import with PanelContainer imports:
```typescript
import { PanelContainer, PanelGroup, Panel, Divider } from "@/shared/ui/panel-container";
```

Remove `SplitPanel` import.

- [ ] **Step 2: Rewrite fact-library JSX to use PanelContainer**

Replace the SplitPanel usage with:
```tsx
<PanelContainer>
  <PanelGroup direction="horizontal">
    <Panel
      id="fact-list"
      defaultSize={280}
      minSize={200}
      maxSize={500}
      title="事实库"
      actions={<span className={styles.listCount}>{filteredFacts.length} 条</span>}
      collapsible
    >
      {/* left content: filterBar, searchBar, factList, bottomBar */}
    </Panel>
    <Divider />
    <Panel
      id="fact-detail"
      defaultSize={600}
      minSize={400}
      title={selectedFact ? "事实详情" : undefined}
      actions={selectedFact ? editDeleteButtons : undefined}
    >
      {/* right content: detailMeta, contentCard, relatedSection */}
    </Panel>
  </PanelGroup>
</PanelContainer>
```

- [ ] **Step 3: Update fact-library CSS — remove layout CSS**

Remove from `fact-library/index.module.css`:
- `.detailHeader` (replaced by Panel's `.panelHeader`)
- `.detailTitleRow` (replaced by Panel's header flex)
- `.detailTitle` (replaced by Panel's `.panelTitle`)
- `.detailActions` (replaced by Panel's `.panelActions`)

Keep:
- `.detailMeta` (content-specific)
- `.detailBody` → rename to `.detailContent` or keep (content scrollable area)
- `.contentCard`, `.contentCardBody`, `.detailText`, etc. (content styles)
- `.filterBar`, `.filterBtn`, `.factList`, `.factItem`, etc. (left panel content)
- `.bottomBar`, `.listToolbar`, `.listCount` (left panel content)

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/pages/books/components/fact-library/
git commit -m "refactor(fact-library): migrate from SplitPanel to PanelContainer"
```

---

### Task 6: Migrate WorldRules to PanelContainer

**Files:**
- Modify: `app/pages/books/components/world-rules/index.tsx`
- Modify: `app/pages/books/components/world-rules/index.module.css`

**Interfaces:**
- Consumes: PanelContainer (Task 4)
- Produces: WorldRules using PanelContainer

- [ ] **Step 1: Update imports and rewrite JSX**

Replace SplitPanel with PanelContainer:
- Left panel: add title "世界规则", add search bar, add bottom action bar
- Use SplitPanel `loading` → Panel does not have loading, keep inline Spin in left content
- Right panel: use Panel `title`/`actions` slots

- [ ] **Step 2: Update world-rules CSS — remove layout CSS**

Remove: `.detailHeader`, `.detailTitleRow`, `.detailTitle`, `.detailActions`
Keep: `.detailTime`, `.detailBody`, `.detailContent` → `.detailBody`, `.contentCard`, etc.

- [ ] **Step 3: Verify and commit**

---

### Task 7: Migrate TagLibrary to PanelContainer

**Files:**
- Modify: `app/pages/books/components/tag-library/index.tsx`
- Modify: `app/pages/books/components/tag-library/index.module.css`

- [ ] **Step 1: Update imports and rewrite JSX**

Replace SplitPanel with PanelContainer.

- [ ] **Step 2: Update tag-library CSS — remove layout CSS**

Remove: `.detailHeader`, `.detailTitleRow`, `.detailTitle`, `.detailActions`, `.detailBody`
Keep: `.treeWrap`, `.catList`, `.catItem`, `.searchWrap`, `.bottomBar`, etc.

- [ ] **Step 3: Verify and commit**

---

### Task 8: Migrate SettingsLibrary to PanelContainer

**Files:**
- Modify: `app/pages/books/components/settings-library/index.tsx`
- Modify: `app/pages/books/components/settings-library/index.module.css`

- [ ] **Step 1: Update imports and rewrite JSX**

Replace SplitPanel with PanelContainer:
- Add title "设定库", add search bar, add bottom action bar
- Use SplitPanel loading → keep inline Spin

- [ ] **Step 2: Update settings-library CSS — remove layout CSS**

Remove: `.detailHeader`, `.detailTitleRow`, `.detailTitle`, `.detailActions`
Keep: `.detailBody`, `.detailMeta`, `.infoSection`, etc.

- [ ] **Step 3: Verify and commit**

---

### Task 9: Remove Old SplitPanel and Final Verification

**Files:**
- Delete: `shared/ui/split-panel/index.tsx`
- Delete: `shared/ui/split-panel/index.module.css`

- [ ] **Step 1: Verify no remaining SplitPanel imports**

Run: `grep -r "split-panel" app/ shared/`
Expected: No results

- [ ] **Step 2: Delete SplitPanel files**

```bash
git rm -r shared/ui/split-panel/
```

- [ ] **Step 3: Full verification**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove obsolete SplitPanel, replaced by PanelContainer"
```
