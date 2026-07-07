# 前端工具规范

> 前端工具函数与共享 UI 组件的使用规范。

## 1. 工具函数

### 1.1 消息工具 (`app/utils/error-handler.ts`)

```typescript
import { showError, showSuccess, showWarning, showInfo } from "@/app/utils/error-handler";
```

| 函数 | 用途 | 场景 |
|------|------|------|
| `showError(msg)` | 错误提示 | API 失败、表单校验失败 |
| `showSuccess(msg)` | 成功提示 | 保存成功、创建成功 |
| `showWarning(msg)` | 警告提示 | 非关键异常 |
| `showInfo(msg)` | 信息提示 | 操作引导 |

- 底层使用 antd `message` API。
- 禁止直接调用 `message.error()` / `message.success()`。

### 1.2 日期格式化 (`app/utils/format-date.ts`)

统一使用项目提供的 `formatDate()` 函数，禁止使用 `new Date().toLocaleDateString()` 等原生方式。

## 2. 共享 UI 组件 (`shared/ui/`)

| 组件 | 路径 | 用途 |
|------|------|------|
| `SplitPanel` | `shared/ui/split-panel/` | 左右分栏布局 |
| `EmptyState` | `shared/ui/empty-state/` | 空状态占位 |
| `ConfirmDelete` | `shared/ui/confirm-delete/` | 删除二次确认弹窗 |
| `SaveButton` | `shared/ui/save-button/` | 保存按钮（antd Button） |
| `BaseModal` | `shared/ui/base-modal/` | 基础弹窗（三层布局） |
| `AiDropdown` | `shared/ui/ai-dropdown/` | AI 操作下拉菜单 |
| `ArrayInput` | `shared/ui/array-input/` | 数组输入组件 |
| `Theme` | `shared/ui/theme/` | 主题切换上下文 |

### 2.1 BaseModal

所有编辑/创建弹窗（除删除确认外）必须使用 BaseModal：

- 三层布局：固定标题 → 可滚动内容（flex:1） → 固定底栏（flex-shrink:0）
- `maxHeight: 85vh`，内容超出自动滚动
- `closable=false`，通过底部按钮关闭
- `destroyOnClose=true`

### 2.2 ConfirmDelete

- 统一使用 `confirmDelete(name, onOk)` 触发删除确认。
- 内部处理 loading 状态，防止重复点击。
- 文案固定：`确定要删除「{名称}」吗？此操作不可撤销。`

### 2.3 SaveButton

- 基于 antd `Button`，支持 `loading` prop。
- 独立保存场景使用，表单保存使用 Modal 的 `confirmLoading`。

## 3. 通用工具函数

- ID 生成：使用 `server/utils/id-generator.ts`（服务端）。
- 数据库连接：使用 `server/storage/db.ts` 的 `getDb()`。
- 客户端禁止直接导入 `server/` 下的任何函数。
