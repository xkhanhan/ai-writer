# 前端组件规范

> 按钮、标签、表单、弹窗、侧边栏等组件的交互规则。视觉 Token 详见 [视觉规范](./visual.md)。

## 1. 按钮规范

### 1.1 类型与场景

| 类型 | 场景 | 示例 |
|------|------|------|
| `type="primary"` | 主操作、表单提交 | 保存、创建、确认 |
| `danger` | 删除、不可逆操作 | 删除、移除 |
| `type="text"` | 工具栏图标按钮 | 更多操作、展开/折叠 |
| `type="link"` | 行内文字操作 | 新建大类 |
| 默认 | 次要/取消操作 | 取消、查看 |

### 1.2 强制规则

- 每个页面/弹窗只允许一个 primary 按钮
- 删除统一用 `confirmDelete`（`shared/ui/confirm-delete`）
- 保存独立展示用 `SaveButton`（`shared/ui/save-button`）

### 1.3 按钮交互规范（漏斗架构）

**异步按钮统一行为**：

| 阶段 | 行为 | 实现 |
|------|------|------|
| 点击 | 立即禁用 | `loading={submitting}` |
| 请求中 | 加载状态 | antd Button `loading` prop |
| 成功 | 成功提示 | `showSuccess("xxx成功")` |
| 失败 | 错误提示 | `showError(result.error)` |
| 完成 | 恢复状态 | `setLoading(false)` |

**禁止事项**：
- 禁止按钮无 loading 状态的异步操作
- 禁止删除操作无二次确认
- 详见 [API 规范](./api.md)

### 1.4 尺寸

| 场景 | 尺寸 |
|------|------|
| 弹窗操作按钮 | default |
| 工具栏/行内按钮 | `size="small"` |
| 表单提交按钮 | default |

## 2. 标签规范 (Tag)

### 三级标签体系

| 等级 | 颜色 | 场景 |
|------|------|------|
| 核心 | `color="green"` | 正面/完成状态、核心内容 |
| 重要 | `color="red"` / `color="orange"` | 高亮关注信息 |
| 一般 | 默认 | 中性分类和辅助信息 |

禁止随意引入其他颜色标签（蓝色、紫色等）。

## 3. 表单规范

- Label 使用 14px 正文字体
- 输入框统一使用 `size="small"`
- 必填字段 Label 后加红色 `*`
- 验证失败：Input 边框变红 + 文字提示
- Submit 按钮为 primary 类型，Form `layout="vertical"`

## 4. 弹窗规范 (Modal)

所有编辑/创建弹窗必须使用 BaseModal（`shared/ui/base-modal/`）：

- 三层布局：固定标题 → 可滚动内容 → 固定底栏
- `maxHeight: 85vh`，内容超出自动滚动
- `closable=false`，通过底部按钮关闭
- 底栏：取消（左）+ 确认（右，primary）
- 表单保存：`confirmLoading` 控制确认按钮加载态

## 5. 侧边栏规范 (Sidebar)

- 左栏宽度：280px
- 头部：标题 14px `var(--text-primary)` + 展开箭头（DownOutlined rotate(-90deg)）
- 新增按钮：hover 父级时显示，`size="small"`
- 选中态：`background: var(--color-primary-bg); color: var(--color-primary)`
- 删除：hover 显示 DeleteOutlined，点击 `confirmDelete`
- 新建按钮：底部固定 `Button block type="primary" icon={<PlusOutlined />}`

## 6. 空状态规范

- 图标 64px，颜色 `var(--text-light)`
- 标题 16px `var(--text-tertiary)`，描述 14px `var(--text-tertiary)`
- 背景 `var(--bg-muted)`，圆角 `var(--radius-lg)`

## 7. 分割线规范

- 使用 CSS `gap` + 伪元素实现，避免 DOM 节点
- 背景色 `var(--border-light)`，高度 `1px`

## 8. 图标规范

- 统一使用 `@ant-design/icons` Outlined 风格
- 行内按钮：12px，操作列：14px，空状态：64px
- 颜色跟随文字色

## 9. SplitPanel 组件

详见 [SplitPanel 组件 API](./visual.md)。所有列表+详情页面必须使用 SplitPanel。

## 10. 响应式

统一断点 `@media (max-width: 768px)`。
