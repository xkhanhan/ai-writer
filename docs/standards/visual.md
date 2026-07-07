# 视觉规范

> AI 直接遵循。所有 UI 开发必须符合以下规范。

---

## 1. 技术栈

- **唯一组件库**: Ant Design v6 (`antd@^6.5.0`)
- **唯一图标库**: `@ant-design/icons`（Outlined 风格）
- **SSR 支持**: `@ant-design/nextjs-registry`
- **语言包**: `antd/locale/zh_CN`
- **禁止**引入任何第三方 UI 组件库（Material UI、Chakra、Tailwind 等）
- **禁止**引入任何第三方图标库（Lucide、Heroicons、Material Icons 等）
- **禁止**用独立 CSS 文件直接覆盖 Ant Design 组件原生样式
- **禁止**使用 `:global(.ant-xxx)` 选择器覆盖组件样式
- **禁止**使用 `!important` 覆盖 Ant Design 样式
- **允许**通过 `ConfigProvider theme` 调整主题色
- **允许**在 CSS Modules 中编写布局样式（flex、grid、padding、margin 等）
- **允许**为非 Ant Design 自定义元素编写样式

---

## 2. 色彩规范

### 2.1 功能色

| 语义 | 变量名 | 色值 | 用途 |
|------|--------|------|------|
| 主色 | `--color-primary` | `#2F5D50` | 品牌标识、主操作按钮、选中态 |
| 主色悬浮 | `--color-primary-hover` | `#1e4438` | 主色按钮 hover |
| 主色浅底 | `--color-primary-bg` | `rgba(47,93,80,0.05)` | 选中态背景 |
| 主色浅底悬浮 | `--color-primary-bg-hover` | `rgba(47,93,80,0.10)` | 悬浮背景 |
| 主色边框 | `--color-primary-border` | `rgba(47,93,80,0.20)` | 选中态边框 |
| 成功 | `--color-success` | `#2E8B57` | 成功状态、正面标签 |
| 警告 | `--color-warning` | `#964400` | 警告状态、重要标签 |
| 错误 | `--color-error` | `#ba1a1a` | 错误状态、危险操作 |

### 2.2 背景色

| 层级 | 变量名 | 色值 | 使用场景 |
|------|--------|------|----------|
| 页面背景 | `--bg-page` | `#f0ece4` | 最底层页面底色 |
| 抬升面 | `--bg-elevated` | `#faf8f4` | 卡片、弹窗、顶栏、底栏 |
| 静音面 | `--bg-muted` | `#f5f2ec` | 折叠区、代码块、次要容器 |
| 强调底 | `--bg-strong` | `#e8e4dc` | 分割线背景、hover 态、进度条底色 |

### 2.3 文字色

| 层级 | 变量名 | 色值 | 使用场景 |
|------|--------|------|----------|
| 主文字 | `--text-primary` | `#1a1814` | 标题、正文、重要信息 |
| 次文字 | `--text-secondary` | `#4a4640` | 副标题、说明文字 |
| 三级文字 | `--text-tertiary` | `#807b74` | 时间戳、placeholder、辅助信息 |
| 浅色文字 | `--text-light` | `#b5b0a8` | 禁用态、最弱层级 |
| 反白文字 | `--text-inverse` | `#ffffff` | 深色背景上的文字（primary 按钮内文字） |

### 2.4 边框色

| 层级 | 变量名 | 色值 | 使用场景 |
|------|--------|------|----------|
| 默认边框 | `--border` | `#ddd8d0` | 卡片、输入框、分隔线 |
| 强调边框 | `--border-strong` | `#c0bbb3` | 选中态、hover 边框 |
| 弱化边框 | `--border-light` | `#ebe7e0` | gap 伪分割线背景、极弱分隔 |

### 2.5 使用规则

- **禁止**在组件中使用硬编码颜色值（如 `color: #2F5D50`），必须使用 CSS 变量
- **禁止**随意引入非规范色彩（蓝色 `#1890ff`、紫色等），色彩体系仅限上述变量
- **禁止**在不同功能语义间混用颜色（如用绿色表示删除）
- **功能色限定场景**：绿色仅用于成功/完成，橙色仅用于警告/重要，红色仅用于错误/危险
- 所有重要操作统一使用 `var(--color-primary)` 或其衍生变量

### 2.6 传统色（装饰用途）

| 变量名 | 色值 | 用途 |
|--------|------|------|
| `--color-jade` | `#2F5D50` | 青黛，同主色 |
| `--color-gold` | `#964400` | 金色，同警告色 |
| `--color-indigo` | `#465f88` | 靛蓝，装饰性元素 |

---

## 3. 字体规范

### 3.1 字体族

| 用途 | 变量名 | 字体栈 | 使用场景 |
|------|--------|--------|----------|
| 展示字体 | `--font-display` | `'Noto Serif SC', serif` | 页面标题、品牌名、详情标题 |
| 正文字体 | `--font-body` | `'Inter', 'Noto Sans', 'Noto Sans SC', sans-serif` | 正文、表单标签、按钮等所有 UI 文字 |
| 等宽字体 | `--font-mono` | `'JetBrains Mono', 'Fira Code', 'Consolas', monospace` | 代码、JSON、API 地址 |

### 3.2 字号与行高

| 层级 | 字号 | 行高 | 使用场景 |
|------|------|------|----------|
| 页面标题 | 18px | 1.4 | 顶栏品牌名、页面大标题 |
| 区域标题 | 16px | 1.5 | 面板标题、卡片标题 |
| 正文 | 14px | 1.6 | 所有正文内容、表单标签 |
| 辅助文字 | 13px | 1.5 | 说明文字、提示信息 |
| 小号文字 | 12px | 1.4 | 时间戳、统计数字、列表项名称 |
| 最小文字 | 11px | 1.3 | 移动端底部栏、创建时间 |

### 3.3 使用规则

- 标题一律使用 `--font-display`（衬线体）
- 正文和所有 UI 文字使用 `--font-body`
- 代码块和等宽内容使用 `--font-mono`
- **禁止**在 CSS Modules 中直接写死字体名，必须通过变量引用
- font-weight：`600` 标题、`500` 按钮/强调、`400` 正文

---

## 4. 间距/圆角/阴影规范

### 4.1 间距阶梯

| 变量名 | 值 | 使用场景 |
|--------|-----|----------|
| `--space-1` | 4px | 图标与文字间距、紧凑元素微调 |
| `--space-2` | 8px | 按钮组内部间距、Tag 之间间距 |
| `--space-3` | 12px | 表单项之间间距、列表项间距 |
| `--space-4` | 16px | 区块内边距、标题与内容间距 |
| `--space-5` | 20px | 面板内边距（中等） |
| `--space-6` | 24px | 弹窗内边距、顶栏左右内边距 |
| `--space-8` | 32px | 大区块间距、页面上下内边距 |

间距规则：
- 小元素间距（图标+文字、Tag 之间）：`space-1` ~ `space-2`
- 组件内部间距（表单项、列表项）：`space-3` ~ `space-4`
- 区块间距（面板之间）：`space-5` ~ `space-6`
- 页面级间距（内容区上下）：`space-8`
- **禁止**使用任意数值（如 `13px`、`17px`），必须取最近阶梯值
- 必须使用 CSS 变量：`gap: var(--space-2)` 而非 `gap: 8px`

### 4.2 圆角阶梯

| 变量名 | 值 | 使用场景 |
|--------|-----|----------|
| `--radius-sm` | 4px | Tag、Badge、小按钮 |
| `--radius-md` | 6px | 输入框、选择器、列表项 |
| `--radius-lg` | 8px | 卡片、弹窗、代码块 |
| `--radius-xl` | 12px | 大卡片、面板容器 |
| `--radius-full` | 9999px | 圆形按钮（`shape="circle"`）、圆形头像、药丸形 |

圆角规则：
- 圆形按钮用 `--radius-full`，方形按钮不设圆角（Ant Design 默认）
- 卡片/容器用 `--radius-lg` 或 `--radius-xl`
- 输入框/选择器用 `--radius-md`
- Tag/Badge 用 `--radius-sm`
- **禁止**在组件中直接写死圆角数值

### 4.3 阴影层级

| 变量名 | 定义 | 使用场景 |
|--------|------|----------|
| `--shadow` | `0 1px 3px rgba(24,28,34,0.08)` | 卡片、下拉菜单、顶栏 |
| `--shadow-md` | `0 4px 12px rgba(24,28,34,0.12)` | 弹窗（Modal）、悬浮面板 |
| `--shadow-lg` | `0 8px 24px rgba(24,28,34,0.16)` | 全屏弹窗、下拉层级最深 |

阴影规则：
- 默认卡片/面板：`--shadow`
- 弹窗/Modal：`--shadow-lg`
- 下拉菜单/Popover：`--shadow-md`
- 页面内容区不需要阴影——使用暖纸色背景层级区分
- **禁止**直接写死 `box-shadow` 数值，必须引用变量

---

## 5. 按钮规范

### 5.1 按钮类型与场景

| 类型 | 适用场景 | 示例 |
|------|----------|------|
| `type="primary"` | 页面主操作、表单提交、确认操作 | 保存、创建、确认、测试连接 |
| `danger` | 删除操作、不可逆的危险操作 | 删除、移除、清空 |
| `type="text"` | 轻量辅助操作、工具栏图标按钮 | 更多操作（⋯）、展开/折叠 |
| `type="link"` | 行内文字链接式操作 | 新建大类、添加子标签 |
| 默认（无 type） | 次要操作、取消操作 | 取消、查看、编辑 |

### 5.2 强制规则

- **每个页面/弹窗只允许一个 primary 按钮**
- 删除操作统一使用 `danger` 按钮，点击后弹出 `Modal.confirm` 二次确认
- `type="text"` 仅用于工具栏图标按钮，禁止混用于表单提交
- `type="link"` 仅用于行内文字式操作，禁止混用于主要操作
- 取消操作统一使用默认按钮（无 type），不使用 `type="text"`
- 确认删除弹窗统一使用 `confirmDelete`（`shared/ui/confirm-delete`），文案：`确定要删除「{名称}」吗？此操作不可撤销。`
- 保存按钮如需独立展示，使用 `shared/ui/save-button`

### 5.3 按钮尺寸

| 场景 | 尺寸 |
|------|------|
| 弹窗操作按钮 | 不设（默认 default） |
| 工具栏图标按钮 | `size="small"` |
| 行内操作按钮 | `size="small"` |
| 表单提交按钮 | 不设（默认 default） |
| SplitPanel 新建/编辑/删除 | `size="small"` |

### 5.4 按钮交互规范（漏斗架构）

#### 5.4.1 错误处理漏斗

```
API Client (client.ts)     → 拦截所有异常，返回 Result<T>
API 函数 (api/*.ts)         → 透传 Result<T>
Hooks (hooks/*.ts)          → 检查 result.ok，调用 showError/showSuccess
页面组件                     → 仅处理业务逻辑，无 try/catch
```

**Result 类型定义** (`app/api-client/client.ts`):
```typescript
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
```

#### 5.4.2 异步按钮统一行为

| 阶段 | 行为 | 实现 |
|------|------|------|
| 点击 | 立即禁用，防止重复提交 | `loading={submitting}` 或 `disabled={loading}` |
| 请求中 | 展示加载状态 | antd Button `loading` prop |
| 成功 | 展示成功提示 | `showSuccess("xxx成功")` |
| 失败 | 展示错误提示 | `showError(result.error)` |
| 完成 | 恢复按钮状态 | `setLoading(false)` |

#### 5.4.3 删除操作规范

- 统一使用 `confirmDelete(name, onOk)` 组件
- `confirmDelete` 内部处理 loading 状态，点击确认后按钮显示加载态
- 确认弹窗期间禁止重复点击
- `onOk` 回调内仅处理 Result，不使用 try/catch

#### 5.4.4 保存操作规范

- 表单保存：antd Modal `confirmLoading` 控制确认按钮加载态
- 独立保存按钮：使用 `SaveButton` 组件（antd Button + loading）
- 自动保存（如文件编辑器）：`saveStatus` 状态控制提示文案

#### 5.4.5 禁止事项

- **禁止**在 hooks/components 中使用 try/catch 处理 API 错误
- **禁止**在 API 函数层抛出异常（所有异常在 client 层拦截）
- **禁止**按钮无 loading 状态的异步操作
- **禁止**删除操作无二次确认
- **禁止**使用 `message.error` / `message.success`（统一用 `showError` / `showSuccess`）

---

## 6. 标签规范 (Tag)

### 6.1 三级标签体系

| 等级 | Tag 颜色 | 背景变量 | 文字变量 | 使用场景 |
|------|----------|----------|----------|----------|
| 核心 | `color="green"` | `--tag-core-bg` | `--tag-core-color` | 核心冲突、关键看点、已写正文、题材分类、连接成功 |
| 重要 | `color="red"` 或 `color="orange"` | `--tag-important-bg` | `--tag-important-color` | 卷纲标记、章节数统计、只读标记 |
| 一般 | 默认（无 color） | `--tag-general-bg` | `--tag-general-color` | 书籍分类、普通状态、一般标签、保存状态 |

### 6.2 使用规则

- 核心标签（绿色）：正面/完成状态、核心内容标记
- 重要标签（红色/橙色）：需要关注的高亮信息
- 一般标签（默认色）：中性分类和辅助信息
- **禁止**随意引入其他颜色标签（蓝色、紫色等），必须遵循三级映射
- Tag 尺寸统一使用默认尺寸，不使用 `size="small"`

---

## 7. 表单规范

### 7.1 Label 位置

- **垂直布局（表单页面/Modal 内）**：Label 位于输入框上方，使用 `<Form.Item label="...">`
- **自定义表单**（非 Ant Design Form，如 SplitPanel Modal）：使用 `<label>` + `formLabel` 类名

### 7.2 必填标记

- 必填字段使用 `<Form.Item required>` 或 `rules={[{ required: true }]}`
- 必填标记（红色星号）由 Ant Design 自动渲染，**禁止**手动添加 `*` 或「必填」文字
- 可选字段不显示任何标记

### 7.3 校验提示

- 校验错误通过 `<Form.Item rules>` 的 `message` 字段自定义
- 校验提示显示在输入框下方，使用 Ant Design 默认样式
- **禁止**使用 `message.error()` 替代表单内联校验（仅用于 API 错误反馈）

### 7.4 输入框选择

| 类型 | 使用场景 |
|------|----------|
| `Input` | 短文本输入（书名、标签名等） |
| `Input.TextArea` | 长文本输入（简介、正文、描述等） |
| `Select` | 选项选择（题材、平台、下拉选择） |
| `InputNumber` | 数值输入 |
| `Slider` | 范围滑动选择 |

### 7.5 布局规则

- 弹窗内表单：标题 → 表单项 → 底部操作栏（取消 + 提交）
- 面板内表单：左侧字段区 + 右侧操作栏
- 表单项之间间距：`gap: var(--space-4)` 或使用 `<Form.Item>` 自带间距
- 表单操作栏靠右对齐，取消按钮在左、提交按钮在右

---

## 8. 空状态规范

- **所有无数据场景必须使用 `EmptyState` 组件**（`shared/ui/empty-state`），**禁止**使用纯文字或 Ant Design `<Empty>` 组件
- **图标**：使用 `@ant-design/icons` 中的 Outlined 风格图标，字号由组件控制
- **标题文案**：简洁描述当前状态，不超过 10 个字
- **描述文案**：提供操作引导，说明如何获取内容，不超过 25 个字
- **操作按钮**：可选，提供下一步操作入口（如「+ 新建大类」）
- **禁止**在空状态中使用自定义 SVG 图标或第三方图标

标准文案示例：

| 场景 | 标题 | 描述 |
|------|------|------|
| 标签库未选择大类 | 选择一个标签大类 | 从左侧选择大类查看其下标签，或新建大类开始 |
| 正文库为空 | 还没有存稿 | 在创作区写完正文后可存入这里 |
| 搜索无结果 | 没有找到匹配的内容 | 尝试其他关键词或清除搜索条件 |
| 文件夹为空 | 选择文件开始编辑 | 从左侧文件树中选择一个文件 |

---

## 9. 弹窗规范 (Modal)

### 9.1 BaseModal 基础弹窗模板

所有编辑/创建类弹窗（删除确认除外）必须基于 `shared/ui/base-modal` 封装。禁止直接使用 Ant Design `Modal` 构建表单/内容弹窗。

**布局结构（三层固定）：**

```
┌─────────────────────────────────┐
│  标题栏 (flex-shrink: 0)         │  ← 固定不动
├─────────────────────────────────┤
│                                 │
│  内容区 (flex: 1, overflow-y)   │  ← 可纵向滚动
│  内边距: 16px 24px              │
│  滚动条距内容: 8px              │
│                                 │
├─────────────────────────────────┤
│  操作栏 (flex-shrink: 0)        │  ← 固定在底部
│  [取消]              [确认]     │
└─────────────────────────────────┘
```

**核心约束：**

| 约束 | 值 | 说明 |
|------|-----|------|
| 最大高度 | `85vh` | 弹窗整体不突破视口 |
| 内容滚动 | `overflow-y: auto` | 仅内容区滚动 |
| 底部固定 | `flex-shrink: 0` | 操作栏不随内容移动 |
| 滚动条间距 | `padding-right: 8px` | 滚动条不紧贴内容 |
| 锁定行为 | `closable=false, maskClosable=false, keyboard=false` | 编辑/创建弹窗统一锁定 |

**Props 接口：**

```typescript
interface BaseModalProps {
  open: boolean;
  title: string;
  onCancel: () => void;
  onOk?: () => void | Promise<void>;
  okText?: string;           // 默认 "确认"
  cancelText?: string;       // 默认 "取消"
  okButtonProps?: ButtonProps;
  confirmLoading?: boolean;
  width?: number;            // 默认 600
  destroyOnClose?: boolean;  // 默认 true
  children: React.ReactNode;
}
```

### 9.2 尺寸规范

| 场景 | 宽度 | 说明 |
|------|------|------|
| 小型弹窗 | 480px | 简单表单（新建文件夹/文件） |
| 中型弹窗（默认） | 600px | 常规编辑/创建表单 |
| 大型弹窗 | 720px | 预览、内容展示 |
| SplitPanel 内 Modal | 560px | SplitPanel 工作区内弹窗 |

移动端自动适配：`width: min(宽度, calc(100vw - 32px))`

### 9.3 标题格式

- 弹窗标题使用中文四字或五字短语，统一「动词 + 名词」格式
- 标准示例：创建新书、编辑书籍、编辑卷纲、新建人物
- **禁止**使用英文标题
- **禁止**在标题中使用图标

### 9.4 Footer 操作栏

- **取消按钮在左，确认按钮在右**
- 取消：默认样式（`type="default"`），确认：`type="primary"`
- 操作栏通过 `border-top` 与内容区视觉分隔
- 禁止使用 `footer={null}` 自定义底部按钮

### 9.5 适配范围

| 弹窗 | 位置 | 宽度 | 改造方式 |
|------|------|------|----------|
| 创建新书 | `app/pages/home/index.tsx` | 600px | 替换为 BaseModal |
| 编辑书籍 | `app/pages/home/index.tsx` | 600px | 替换为 BaseModal |
| 新建/编辑世界规则 | `world-rules/index.tsx` | 560px | 替换为 BaseModal |
| 新建/编辑设定实体 | `settings-library/index.tsx` | 600px | 替换为 BaseModal |
| 编辑书籍信息 | `book-info-form/index.tsx` | 640px | 替换为 BaseModal |
| 新建文件夹 | `folder-file-editor/create-modal/` | 480px | 替换为 BaseModal |
| 新建文件 | `folder-file-editor/create-modal/` | 480px | 替换为 BaseModal |
| 正文预览 | `content-library/index.tsx` | 720px | 替换为 BaseModal |
| 正文预览 | `archive-view/index.tsx` | 720px | 替换为 BaseModal |

**不受影响：** `Modal.confirm` 删除确认弹窗（使用 `confirmDelete`）

---

## 10. 分割线规范

### 10.1 标准分割方式

项目**不使用**显式的 `<Divider>` 元素作为内容分割。统一采用 `gap + background` 伪分割线方式：

```css
.separator {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--border-light);
}
.separator > * {
  background: var(--bg-elevated);
}
```

### 10.2 使用规则

- 面板/区域之间：`gap: 1px` + `background: var(--border-light)`
- 顶栏/底栏边框：`border-bottom: 1px solid var(--border)` 和 `border-top: 1px solid var(--border)`
- 列表项之间：`gap: 1px` + `background: var(--border-light)` 或 `border-bottom`
- **禁止**在内容区域使用 `<Divider />` 组件进行分割
- **禁止**使用 `border-bottom` / `border-top` 在内容区域做分割（顶栏/底栏除外）

---

## 11. 响应式规范

### 11.1 断点

| 断点 | 条件 | 内容区内边距 | 适用场景 |
|------|------|-------------|----------|
| 桌面 | > 1024px | 160px 水平 | 大屏桌面 |
| 平板 | 768px ~ 1024px | 48px 水平 | 小屏桌面、平板 |
| 移动端 | < 768px | 16px 水平 | 手机 |
| 极小屏 | < 480px | 16px 水平 | 小屏手机 |

### 11.2 全局布局结构

```
shell-root (flex-col, h-screen)
  shell-topbar (56px, shrink-0)
  shell-main (flex-1, overflow-auto)
    wrapper (flex, justify-center, padding)
      content (max-width: 1024px)
  shell-footer (32px, shrink-0)
```

### 11.3 移动端适配

- 顶栏：padding 缩减为 `0 12px`，副标题隐藏
- 底栏：padding 缩减为 `0 12px`，右侧信息组隐藏
- 品牌名：字号从 18px 缩减为 14px（< 480px 时）
- 内容区：使用 CSS 变量 `--content-padding-x` 自动响应
- 活动栏（Activity Bar）：保持 56px 宽度不变
- **禁止**在移动端隐藏核心操作按钮

### 11.4 响应式规则

- 断点使用 CSS Media Query，在 `globals.css` 中统一定义
- **禁止**在组件 CSS Modules 中定义响应式断点
- 内容最大宽度：`--content-max-width: 1024px`，居中显示
- 弹窗宽度在移动端自动适配为 `calc(100vw - 32px)`

---

## 12. SplitPanel 组件规范

> 所有左右分栏页面（世界规则、设定库、伏笔库等）**必须**使用 `SplitPanel` 组件。

### 12.1 组件 API

```typescript
interface SplitPanelProps {
  left: ReactNode;                    // 左侧面板内容
  right: ReactNode | null;            // 右侧面板，null 时显示空状态
  leftWidth?: number;                 // 左侧宽度，默认 280px
  emptyHint?: string;                 // 空状态提示文字
}
```

组件位置：`shared/ui/split-panel/index.tsx`

### 12.2 左侧面板

**工具栏**：
- 布局：`flex; align-items: center; justify-content: space-between; padding-bottom: 10px`
- 左侧：数量标签（如 `3 条规则`），样式：`font-weight: 600; font-size: 13px; color: var(--text-tertiary)`
- 右侧：新建按钮，统一 `<Button type="primary" size="small" icon={<PlusOutlined />}>新建</Button>`

**列表项**：
- padding: `8px 10px`，border-radius: `var(--radius-md)`，margin-bottom: `2px`
- `border-left: 3px solid transparent`，cursor: pointer，transition: `all 0.15s ease`
- 名称文字：`font-size: 12px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0`
- 默认：`background: transparent`
- 悬停：`background: var(--bg-muted)`
- 选中：`background: var(--color-primary-bg); border-left-color: var(--color-primary)`

**列表项内部结构**：
- `itemBody`: `display: flex; align-items: center; justify-content: space-between; gap: 8px`
- `itemName`: 名称文字（flex: 1，溢出省略）
- `itemMeta`: 标签区域（flex-shrink: 0，margin: 0）

**空列表状态**：使用 `EmptyState` 组件居中显示，带新建按钮

### 12.3 右侧详情面板

**详情头部 (Detail Header)**：
- `padding: 16px 20px; border-bottom: 1px solid var(--border); flex-shrink: 0`
- 标题行：`display: flex; align-items: center; gap: 10px; margin-bottom: 6px`
- 标题：`font-family: var(--font-display); font-size: 18px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap`
- 创建时间：`font-size: 11px; color: var(--text-tertiary); margin-bottom: 10px`
- 操作按钮区：`display: flex; gap: 8px`

**详情内容区**：
- `flex: 1; overflow-y: auto; padding: 16px 20px`
- 正文：`font-size: 13px; line-height: 1.8; color: var(--text-primary); white-space: pre-wrap; word-break: break-word`

**右侧空状态**：`flex: 1; display: flex; align-items: center; justify-content: center; font-size: 13px; color: var(--text-tertiary)`

### 12.4 分隔线

SplitPanel 不使用显式分割线元素。分隔效果通过父容器实现：

```css
.splitPanel {
  display: flex;
  height: 100%;
  gap: 1px;                        /* 1px 间隙形成分割线 */
  background: var(--border-light); /* 间隙处显示边框色 */
}
.leftPanel, .rightPanel {
  background: var(--bg-elevated);  /* 面板背景 */
}
```

- **禁止**在左右面板之间添加 `<Divider />` 或 `<div>` 分割线元素
- **禁止**使用 `border-right` / `border-left` 模拟分割线
- **禁止**修改 gap 值（固定 1px）

### 12.5 SplitPanel 内按钮标准

| 操作 | 代码 | 位置 |
|------|------|------|
| 新建 | `<Button type="primary" size="small" icon={<PlusOutlined />}>新建</Button>` | 左侧工具栏 |
| 编辑 | `<Button size="small" icon={<EditOutlined />}>编辑</Button>` | 右侧详情头部 |
| 删除 | `<Button size="small" danger icon={<DeleteOutlined />}>删除</Button>` | 右侧详情头部 |

- **必须**使用 `size="small"` 统一按钮尺寸
- 新建按钮**必须** `type="primary"`，删除按钮**必须** `danger`
- 编辑按钮使用默认 type（不加 type prop）
- **禁止**使用 ghost / link / text 按钮用于新建/编辑/删除

### 12.6 SplitPanel 内 Modal 表单

- 标题格式：`"新建{实体名}"` / `"编辑{实体名}"`
- 宽度：560px
- 表单垂直布局（label 在 input 上方）
- 必填字段在 label 后添加红色星号
- 使用原生 `<label>` + antd Input/Select/TextArea 组合
- 底部：取消 + 保存
- `destroyOnClose`
- **禁止**使用 `<Form>` + `<Form.Item>` 包装
- **禁止**修改 Modal 宽度
- **禁止**使用自定义 footer 按钮

### 12.7 骨架屏

所有使用 SplitPanel 的页面**必须**实现骨架屏加载：

```tsx
// 左侧：3-4 个矩形块
<Skeleton active paragraph={{ rows: 0 }} title={{ width: "60%" }} />
<Skeleton active paragraph={{ rows: 0 }} title={{ width: "80%" }} />
<Skeleton active paragraph={{ rows: 0 }} title={{ width: "50%" }} />

// 右侧：标题骨架 + 内容段落骨架
<Skeleton active title={{ width: "40%" }} paragraph={{ rows: 0 }} />
<Skeleton active paragraph={{ rows: 4 }} style={{ marginTop: 20 }} />
```

- 使用 antd `<Skeleton active />`
- 仅在 `loading === true` 时显示，数据就绪后立即切换

### 12.8 SplitPanel 响应式

| 断点 | 布局 | 说明 |
|------|------|------|
| >= 768px | 左右分栏 (flex row) | 默认桌面布局 |
| < 768px | 上下排列 (flex column) | 移动端，左侧 `max-height: 40%`，右侧 `flex: 1` |

移动端内边距调整：

| 属性 | 桌面端 | 移动端 |
|------|--------|--------|
| 列表容器 padding | 12px | `8px 12px` |
| 详情头部 padding | `16px 20px` | `14px 16px` |
| 详情内容 padding | `16px 20px` | `12px 16px` |
| 详情标题字号 | 18px | 16px |

---

## 13. 图标规范

### 13.1 来源

- **唯一来源**: `@ant-design/icons`，Outlined 风格
- **禁止**: 内联 `<svg>` 元素
- **禁止**: 第三方图标库

### 13.2 常用图标清单

| 图标名 | 用途 |
|--------|------|
| `SettingOutlined` | 设置 |
| `ArrowLeftOutlined` | 返回 |
| `BookOutlined` | 书籍 |
| `EditOutlined` | 编辑 |
| `PlusOutlined` | 添加 |
| `DeleteOutlined` | 删除 |
| `SaveOutlined` | 保存 |
| `SearchOutlined` | 搜索 |
| `EyeOutlined` | 查看 |
| `CloseOutlined` | 关闭 |
| `InboxOutlined` | 存档/归档 |
| `GlobalOutlined` | 世界/全局 |
| `FileTextOutlined` | 文件 |
| `DownOutlined` / `RightOutlined` | 展开/折叠 |
| `CalendarOutlined` | 日期 |
| `MoreOutlined` | 更多 |
| `PlusSquareOutlined` | 新建方块 |
| `CheckCircleOutlined` | 成功/已完成 |
| `CloseCircleOutlined` | 失败 |
| `LoadingOutlined` | 加载中 |
| `ApiOutlined` | API/连接 |
| `ReloadOutlined` | 刷新/重新加载 |
| `EyeInvisibleOutlined` | 隐藏 |
| `FolderOutlined` | 文件夹 |
| `FolderOpenOutlined` | 打开的文件夹 |
| `FileOutlined` | 文件 |
| `MinusCircleOutlined` | 移除 |
| `UnorderedListOutlined` | 列表视图 |
| `AppstoreOutlined` | 应用/实体 |

---

## 附录：Design Token 快速查阅

### 传统色别名（向后兼容）

项目定义了以下传统色别名，仅用于已有代码的向后兼容。新代码**禁止**使用这些变量名：

| 别名 | 映射到 | 说明 |
|------|--------|------|
| `--accent` | `--color-primary` | 主色 |
| `--accent-strong` | `--color-primary-hover` | 主色悬浮 |
| `--accent-soft` | `--color-primary-bg` | 主色浅底 |
| `--accent-10` | `--color-primary-bg-hover` | 主色浅底悬浮 |
| `--accent-20` | `--color-primary-border` | 主色边框 |
| `--panel` | `--bg-elevated` | 抬升面 |
| `--panel-strong` | `--bg-strong` | 强调底 |
| `--panel-soft` | `--bg-muted` | 静音面 |
| `--ink-secondary` | `--text-secondary` | 次文字 |
| `--ink-tertiary` | `--text-tertiary` | 三级文字 |
| `--ink-light` | `--text-light` | 浅色文字 |
| `--line-strong` | `--border-strong` | 强调边框 |

### 布局常量

```
--topbar-height:      56px
--footerbar-height:   32px
--content-max-width:  1024px
--content-padding-x:  160px (桌面) / 48px (平板) / 16px (移动端)
--content-padding-y:  32px
```

### 滚动条

```
--scrollbar-thumb:        #c8c0b4
--scrollbar-thumb-hover:  #a8a098
```

## 10. 侧边栏规范 (Sidebar)

### 10.1 适用范围

| 页面 | 布局方式 | 有折叠分组 |
|------|---------|-----------|
| 设定库 settings-library | SplitPanel | 有（分类组） |
| 世界规则 world-rules | SplitPanel | 有（规则分组） |
| 标签库 tag-library | 自建 sidebar | 无（选中切换） |
| 文件编辑器 folder-file-editor | 自建 sidebar | 有（文件夹→文件嵌套） |

创作区导航树结构特殊（批量选择、状态色条），不在此规范范围内。

### 10.2 侧边栏容器

| 属性 | 统一值 |
|------|--------|
| 宽度 | 280px |
| 背景 | `var(--panel)` |
| 边框 | 右侧 `1px solid var(--border)` |
| 布局 | `flex-direction: column` |
| 溢出 | `overflow: hidden` |

### 10.3 工具栏 / 头部

| 属性 | 统一值 |
|------|--------|
| padding | `12px 12px 8px` |
| 底部分隔 | `border-bottom: 1px solid var(--border)` |
| 布局 | `display: flex; align-items: center; justify-content: space-between` |
| 固定 | `flex-shrink: 0` |

- 标题：`font-weight: 600; font-size: 13px; color: var(--text)`
- 总计数：`font-weight: 600; font-size: 13px; color: var(--text-secondary)`
- 主操作按钮（如"+ 新建大类"）：始终可见

### 10.4 分组折叠条

**容器：**

| 属性 | 值 |
|------|-----|
| margin-bottom | `4px` |

**分组头 (groupHeader)：**

| 属性 | 值 |
|------|-----|
| display | `flex; align-items: center; gap: 6px` |
| padding | `6px 8px` |
| border-radius | `var(--radius-md)` |
| cursor | `pointer` |
| user-select | `none` |
| transition | `background 0.15s ease` |
| hover | `background: var(--bg-muted)` |

**折叠箭头：**

| 属性 | 值 |
|------|-----|
| 图标 | `DownOutlined`（Ant Design） |
| 大小 | `font-size: 10px` |
| 颜色 | `var(--text-secondary)` |
| 动画 | `transition: transform 0.2s ease` |
| 展开态 | 无旋转（默认 0deg） |
| 折叠态 | `transform: rotate(-90deg)` |
| flex | `flex-shrink: 0` |

**分组名称：**

| 属性 | 值 |
|------|-----|
| font-size | `13px` |
| font-weight | `600` |
| color | `var(--text)` |
| flex | `1` |
| 溢出 | `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` |

**计数：**

| 属性 | 值 |
|------|-----|
| font-size | `11px` |
| color | `var(--text-secondary)` |

**+添加按钮：**

| 属性 | 值 |
|------|-----|
| 组件 | `Button type="text" size="small"` |
| 图标 | `PlusOutlined` |
| 可见性 | hover 分组头时渐显（`opacity: 0 → 1`，transition 0.15s） |

### 10.5 子项列表

**容器 (groupItems)：**

| 属性 | 值 |
|------|-----|
| padding-left | `12px` |

**条目 (listItem)：**

| 属性 | 值 |
|------|-----|
| display | `flex; align-items: center; gap: 4px` |
| padding | `6px 10px` |
| border-radius | `var(--radius-md)` |
| margin-bottom | `2px` |
| border-left | `3px solid transparent` |
| cursor | `pointer` |
| transition | `all 0.15s ease` |

**条目 hover：** `background: var(--bg-muted)`

**条目 active：**

| 属性 | 值 |
|------|-----|
| background | `var(--color-primary-bg)` |
| border-left-color | `var(--color-primary)` |

**条目名称：**

| 属性 | 值 |
|------|-----|
| font-size | `13px` |
| font-weight | `500` |
| color | `var(--text)` |
| 溢出 | `overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0` |

**空态文本：**

| 属性 | 值 |
|------|-----|
| font-size | `12px` |
| color | `var(--text-secondary)` |
| font-style | `italic` |
| padding | `6px 0` |

### 10.6 嵌套结构（文件编辑器）

文件夹→文件为两级嵌套，额外规范：

| 属性 | 值 |
|------|-----|
| 文件夹图标 | `FolderOutlined` 16px，`var(--text-secondary)` |
| 文件图标 | `FileOutlined` 14px，`var(--text-secondary)` |
| 操作按钮 | hover 文件夹/文件项时渐显（opacity 0→1） |
| 文件 active 名称 | `color: var(--color-primary); font-weight: 500` |

---

**最后更新**: 2026-07-06
