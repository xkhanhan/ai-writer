# Panel Container 设计文档

## 目标

将当前的 `SplitPanel` 升级为 IDE 式面板容器系统，支持：
- 多面板并列（左/中/右）
- 面板内嵌套拆分（上下/左右子面板）
- 可拖拽分割线调整大小
- 面板折叠/隐藏
- Tab 切换（同一区域多内容）
- AI 面板集成
- 章纲 vs 正文对照

## 设计原则

### 1. 消费者零布局 CSS

**核心规则：消费者不写任何容器/布局样式。** Panel 组件内部处理所有结构性 CSS（flex、overflow、border、padding、height），消费者只写自己内容的样式（卡片、列表、表单等）。

```
消费者写的：                       组件提供的：
├── .contentCard                   ├── .panel (flex column, overflow)
├── .factItem                      ├── .panelHeader (flex, border-bottom, height)
├── .treeWrap                      ├── .panelBody (flex:1, overflow-y:auto)
├── .infoSection                   ├── .divider (width/height, cursor, hover)
└── 自己内容的样式                  ├── .tabBar, .tabItem
                                   └── 折叠/展开 transition
```

### 2. 设计规范对齐

所有组件样式严格使用 `docs/visual.md` 定义的 Design Token：
- 颜色：`var(--text)`, `var(--text-secondary)`, `var(--ink-tertiary)`, `var(--color-primary)` 等
- 间距：`var(--space-1)` ~ `var(--space-8)`
- 圆角：`var(--radius-sm)` ~ `var(--radius-full)`
- 边框：`var(--border)`, `var(--border-light)`, `var(--line)`
- 阴影：`var(--shadow)`, `var(--shadow-md)`
- 字体：`var(--font-display)`, `var(--font-body)`
- 背景：`var(--bg-elevated)`, `var(--bg-muted)`, `var(--panel)`, `var(--panel-soft)`

禁止硬编码颜色值、禁止 `!important`、禁止 `:global(.ant-xxx)`。

### 3. 高可复用性

组件必须适配项目中所有面板场景：
- 事实库 / 世界规则 / 标签库 / 设定库（列表+详情）
- 创作区（章纲+编辑器+参考）
- 正文库 / 伏笔库（未来扩展）
- AI 面板（并列/嵌套）

### 4. 高可扩展性

通过 slots 和 props 实现完全自定义：
- 每个结构区域都是一个 slot（可替换/可隐藏）
- 所有视觉属性可通过 props 覆盖
- 支持受控和非受控模式
- 支持外部控制面板可见性（AI 面板开关）

## 设计参考

- IntelliJ IDEA 编辑器面板布局
- VS Code 编辑器分屏
- Monaco Editor 容器

## 组件架构

```
PanelContainer (根容器)
  ├── PanelGroup (方向: horizontal | vertical)
  │   ├── Panel (可折叠/可调整大小)
  │   ├── Divider (拖拽分割线)
  │   ├── Panel
  │   └── PanelGroup (嵌套: 垂直拆分)
  │       ├── Panel
  │       ├── Divider
  │       └── Panel
  └── PanelGroup ...
```

## 组件定义

### PanelContainer

根容器，管理面板状态和布局。

```tsx
interface PanelContainerProps {
  children: React.ReactNode;
  className?: string;
}
```

### PanelGroup

面板组，定义排列方向。可嵌套。

```tsx
interface PanelGroupProps {
  direction: "horizontal" | "vertical";
  children: React.ReactNode;
}
```

### Panel

单个面板。提供完整的结构化布局，消费者通过 slots 自定义内容。

**设计原则体现：** Panel 内部处理所有布局 CSS（header、body、divider），消费者只传入内容，不写布局样式。

```tsx
interface PanelProps {
  // ---- 基础 ----
  /** 面板唯一标识 */
  id: string;
  /** 默认宽度（horizontal）或高度（vertical），像素或比例(0-1) */
  defaultSize?: number;
  /** 最小尺寸 */
  minSize?: number;
  /** 最大尺寸 */
  maxSize?: number;

  // ---- 折叠 ----
  /** 是否可折叠 */
  collapsible?: boolean;
  /** 折叠时保留的宽度 */
  collapsedSize?: number;
  /** 折叠状态（受控） */
  collapsed?: boolean;
  /** 折叠回调 */
  onCollapse?: (collapsed: boolean) => void;

  // ---- 可见性 ----
  /** 面板是否可见（用于外部控制，如 AI 面板开关） */
  visible?: boolean;
  /** 可见性回调 */
  onVisibleChange?: (visible: boolean) => void;

  // ---- 标题栏 slots ----
  /** 标题文字或 ReactNode */
  title?: React.ReactNode;
  /** 标题栏右侧操作按钮 */
  actions?: React.ReactNode;
  /** 标题栏左侧图标（替换默认折叠箭头） */
  icon?: React.ReactNode;

  // ---- Tab 支持 ----
  /** Tab 数据（启用 tab 模式） */
  tabs?: Array<{
    key: string;
    label: string;
    icon?: React.ReactNode;
    closable?: boolean;
  }>;
  /** 当前激活的 tab */
  activeTab?: string;
  /** Tab 切换回调 */
  onTabChange?: (key: string) => void;
  /** Tab 关闭回调 */
  onTabClose?: (key: string) => void;
  /** Tab 栏右侧额外操作 */
  tabActions?: React.ReactNode;

  // ---- 内容 ----
  /** 面板内容 */
  children: React.ReactNode;
}
```

**Panel 内部渲染结构（消费者不需要关心这些 CSS）：**

```
┌─────────────────────────────────────┐
│ [折叠箭头] 标题          [操作按钮]  │  ← .panelHeader (height: 36px)
├─────────────────────────────────────┤
│ Tab1 | Tab2 | Tab3                  │  ← .tabBar (仅在有 tabs 时渲染)
├─────────────────────────────────────┤
│                                     │
│         {children}                  │  ← .panelBody (flex:1, overflow:auto)
│                                     │
└─────────────────────────────────────┘
```

### Divider

拖拽分割线。由 PanelGroup 自动插入。

```tsx
interface DividerProps {
  direction: "horizontal" | "vertical";
  onDrag: (delta: number) => void;
  onDoubleClick?: () => void;
}
```

## 用法示例

### 事实库（当前场景）

```tsx
<PanelContainer>
  <PanelGroup direction="horizontal">
    {/* 左侧列表 */}
    <Panel
      id="fact-list"
      defaultSize={280}
      minSize={200}
      maxSize={500}
      title="事实库"
      actions={<span>{filteredFacts.length} 条</span>}
    >
      {/* 消费者只写内容样式，不写布局样式 */}
      <div className={styles.filterBar}>...</div>
      <div className={styles.searchBar}>...</div>
      <div className={styles.factList}>...</div>
      <div className={styles.bottomBar}>...</div>
    </Panel>

    <Divider />

    {/* 右侧内容 */}
    <Panel
      id="fact-detail"
      defaultSize={600}
      minSize={400}
      title="事实详情"
      actions={<><Button>编辑</Button><Button danger>删除</Button></>}
    >
      <div className={styles.detailMeta}>来源：第3章 · 记录于：2026-07-01</div>
      <div className={styles.detailBody}>
        <div className={styles.contentCard}>...</div>
        <div className={styles.relatedSection}>...</div>
      </div>
    </Panel>
  </PanelGroup>
</PanelContainer>
```

**消费者 CSS 只包含内容样式：**
```css
/* 消费者写的 ✓ */
.filterBar { display: flex; gap: var(--space-1); padding: var(--space-2) var(--space-3); }
.factList { flex: 1; overflow-y: auto; padding: var(--space-2) var(--space-3); }
.contentCard { background: var(--panel-soft); border-radius: var(--radius-lg); }

/* 消费者不写的 ✗ （由 Panel 组件提供） */
/* .panelHeader, .panelBody, .divider, .tabBar */
```

### 创作区（章纲 vs 正文对照）

```tsx
<PanelContainer>
  <PanelGroup direction="horizontal">
    <Panel id="outline" defaultSize={280} title="章纲">
      <OutlineTree />
    </Panel>

    <Divider />

    <PanelGroup direction="vertical">
      <Panel id="chapter" defaultSize={0.5} title="第3章：青云镇">
        <ChapterEditor />
      </Panel>

      <Divider />

      <Panel id="reference" defaultSize={0.5} title="参考内容">
        <ReferencePanel />
      </Panel>
    </PanelGroup>
  </PanelGroup>
</PanelContainer>
```

### AI 面板（外部控制可见性）

```tsx
const [showAI, setShowAI] = useState(false);

<PanelContainer>
  <PanelGroup direction="horizontal">
    <Panel id="content" defaultSize={700} title="事实详情">
      <DetailContent />
    </Panel>

    <Divider />

    <Panel
      id="ai"
      defaultSize={360}
      minSize={280}
      title="AI 助手"
      visible={showAI}
      onVisibleChange={setShowAI}
    >
      <AIPanel />
    </Panel>
  </PanelGroup>
</PanelContainer>
```

## 交互规范

### 拖拽分割线

| 行为 | 实现 |
|------|------|
| 拖拽开始 | 设置 `isDragging`，document 加 pointermove/pointerup 监听 |
| 拖拽中 | 实时计算新尺寸，clamp 到 min/max，更新面板大小 |
| 拖拽结束 | 移除监听，持久化布局到 localStorage |
| 拖拽视觉 | 鼠标变为 `col-resize`/`row-resize`，分割线高亮 `var(--color-primary)` |
| 双击分割线 | 重置为默认尺寸 |

### 面板折叠

| 行为 | 实现 |
|------|------|
| 折叠 | 面板缩小到 `collapsedSize`（默认 0） |
| 展开 | 恢复到折叠前的尺寸 |
| 折叠按钮 | 面板标题栏左侧 `DownOutlined` 旋转 -90° |
| 折叠动画 | CSS transition: width/height 0.2s ease |

### Tab 切换

| 行为 | 实现 |
|------|------|
| Tab 栏位置 | 标题栏下方 |
| 激活 Tab | 底部 2px 边框 `var(--color-primary)` |
| 关闭 Tab | Tab 右侧 × 按钮（closable=true 时） |

## CSS 规范

### 组件内部样式（由 Panel 提供，消费者不写）

```css
/* 面板 */
.panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg-elevated);
}

/* 标题栏 — 所有面板统一，消费者不覆盖 */
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
.panelCollapseBtn:hover { background: var(--bg-muted); color: var(--text); }

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

/* 分割线 */
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
  top: 0; bottom: 0; left: -2px; right: -2px;
}
.divider.horizontal { width: 4px; cursor: col-resize; }
.divider.vertical { height: 4px; cursor: row-resize; }
.divider:hover { background: var(--color-primary); }
.divider.dragging { background: var(--color-primary); pointer-events: none; }

/* Tab 栏 */
.tabBar {
  display: flex;
  align-items: center;
  height: 32px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
  padding: 0 var(--space-2);
  gap: 2px;
}

.tabItem {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0 var(--space-3);
  height: 100%;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  white-space: nowrap;
}
.tabItem:hover { color: var(--text); background: var(--bg-muted); }
.tabItem.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }

/* 内容区 — 消费者内容在这里渲染 */
.panelBody {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 折叠态 */
.panel.collapsed { overflow: visible; }
.panel.collapsed .panelBody { display: none; }
.panel.collapsed .panelHeader { writing-mode: vertical-lr; height: auto; width: 36px; padding: var(--space-2) 0; }
```

### 消费者样式（只写内容样式）

消费者只写自己业务内容的 CSS，例如：
- `.contentCard`, `.contentCardBody` — 内容卡片
- `.factItem`, `.factList` — 列表项
- `.detailMeta`, `.relatedSection` — 元信息区
- `.treeWrap`, `.infoSection` — 树/信息区

**禁止消费者覆盖的样式：**
- `.panel`, `.panelHeader`, `.panelBody` — 面板结构
- `.divider` — 分割线
- `.tabBar`, `.tabItem` — Tab 栏

## 状态管理

### 布局持久化

面板尺寸和折叠状态保存到 localStorage：

```typescript
interface PanelLayout {
  panels: Record<string, {
    size: number;
    collapsed: boolean;
  }>;
}
```

Key: `panel-layout-{page}-{bookId}`

## 分阶段实施

### Phase 1: 基础容器（当前）
- PanelContainer + PanelGroup + Panel + Divider
- 水平分割 + 拖拽调整大小
- 面板折叠/展开
- 替换现有 SplitPanel

### Phase 2: Tab 支持
- TabBar 集成到 Panel
- 同一 Panel 内多 Tab 切换

### Phase 3: AI 面板
- AI 面板 UI 组件
- 与主内容区并列显示
- 面板开关控制

### Phase 4: 嵌套拆分
- 章纲 vs 正文上下拆分
- 垂直方向 PanelGroup
- 多层嵌套布局

### Phase 5: 高级功能
- 布局预设（保存/恢复多种布局）
- 面板拖拽到不同位置
- 全屏面板

## 与现有 SplitPanel 的关系

**直接替换。** SplitPanel 的所有 4 个消费者迁移到 PanelContainer，SplitPanel 废弃。

## 文件结构

```
shared/ui/
  panel-container/
    index.tsx              # 导出所有子组件
    panel-container.tsx    # PanelContainer 根容器
    panel-group.tsx        # PanelGroup 面板组
    panel.tsx              # Panel 单个面板（含 header/body/tab）
    divider.tsx            # Divider 拖拽分割线
    types.ts               # 类型定义
    index.module.css       # 所有容器样式（消费者不写这些）
    hooks/
      use-panel-resize.ts  # 拖拽 resize 逻辑
      use-panel-layout.ts  # 布局持久化
```
