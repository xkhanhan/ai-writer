# Component Interaction Rules

## Buttons

### 类型映射

| Type | 场景 |
|------|------|
| `type="primary"` | 主操作、表单提交（保存、创建、确认） |
| `danger` | 删除、不可逆操作 |
| `type="text"` | 工具栏图标按钮（展开/折叠、更多操作） |
| `type="link"` | 行内文字操作（如"创建分类"） |
| default | 次要/取消 |

### 规则

- 每个页面/弹窗最多一个 `primary` 按钮
- 所有删除使用 `confirmDelete`（见 [utils.md](./utils.md)）
- 异步按钮：立即进入 `loading` 状态 → `showSuccess`/`showError` → 恢复状态
- **禁止：** 异步操作无 loading 状态；删除无确认

### 尺寸

| 上下文 | Size |
|--------|------|
| 弹窗操作按钮 | default |
| 工具栏/行内按钮 | `size="small"` |
| 表单提交 | default |

## Tags

| 等级 | Color | 场景 |
|------|-------|------|
| 核心 | `color="green"` | 正向/完成状态、核心内容 |
| 重要 | `color="red"` / `color="orange"` | 需要关注 |
| 通用 | default | 中性分类 |

**禁止：** 其他标签颜色（蓝色、紫色等）

## Forms

- Label：14px 正文字体
- Inputs：`size="small"`
- 必填字段：label 后红色 `*`
- 验证失败：红色边框 + 文字提示
- 提交：`type="primary"`，Form `layout="vertical"`

## Modals

所有创建/编辑弹窗使用 `BaseModal`（见 [utils.md](./utils.md)）：

- 三层布局：固定标题 → 可滚动内容 → 固定底部
- `maxHeight: 85vh`，overflow auto
- `closable=false`，通过底部按钮关闭
- 底部：取消（左）+ 确认（右，primary）
- 表单保存：确认按钮使用 `confirmLoading`

## Sidebars

- 左侧面板宽度：280px
- 头部：标题 14px `var(--text-primary)` + 展开箭头（DownOutlined rotate -90deg）
- 添加按钮：悬停父元素时显示，`size="small"`
- 选中态：`background: var(--color-primary-bg); color: var(--color-primary)`
- 删除：悬停显示 DeleteOutlined → `confirmDelete`
- 新建实体：底部固定 `Button block type="primary" icon={<PlusOutlined />}`

## Empty State

- 图标：64px，`var(--text-light)`
- 标题：16px `var(--text-tertiary)`；描述：14px `var(--text-tertiary)`
- 背景：`var(--bg-muted)`，border-radius：`var(--radius-lg)`

## SplitPanel

所有列表+详情页必须使用 `SplitPanel`（`shared/ui/split-panel/`）。

## Dividers

使用 CSS `gap` + 伪元素，禁止 DOM 节点。背景：`var(--border-light)`，高度：1px。

## Icons

- 图标库：`@ant-design/icons` Outlined 仅
- 行内按钮：12px；操作列：14px；空状态：64px
- 颜色跟随文字颜色

## 组件提取规则

当组件满足以下条件时，应提取为独立文件：

| 条件 | 操作 |
|------|------|
| 超过 200 行 | 拆分为子组件 |
| 在文件内定义了 3 个以上内部组件 | 提取到独立文件 |
| 被第二个页面使用 | 迁移到 `shared/ui/` |
| 有独立的状态管理逻辑 | 提取为自定义 hook |

**反模式：** 将所有子组件内联在一个大文件中（God Component）。

## 无障碍基础要求

| 元素 | 要求 |
|------|------|
| 可交互 `<span>`/`<div>` | 添加 `role="button"` + `tabIndex={0}` + `onKeyDown` |
| 图标按钮 | 添加 `aria-label` |
| 筛选切换按钮 | 添加 `aria-pressed` |
| 弹窗 | 确认按钮有 `aria-label` |
| 下拉菜单 | 触发器有 `aria-haspopup` |

**优先级：** 共享 UI 组件（`shared/ui/`）必须满足以上要求。页面级组件建议满足。
