# Utilities & Shared Components

## 消息工具

从 `@/app/utils/error-handler` 导入：

```typescript
import { showError, showSuccess, showWarning, showInfo } from "@/app/utils/error-handler";
```

| 函数 | 用途 |
|------|------|
| `showError(msg)` | API 失败、验证错误 |
| `showSuccess(msg)` | 保存/创建成功 |
| `showWarning(msg)` | 非关键异常 |
| `showInfo(msg)` | 操作引导 |

**禁止：** 直接使用 `message.error()` / `message.success()` — 使用上述封装函数。

## 日期格式化

使用 `formatDate()` from `app/utils/format-date.ts`。**禁止：** `new Date().toLocaleDateString()` 或原始 Date 格式化。

## 共享类型注册表（`shared/types/`）

全栈共享的类型定义放在这里。前端和后端都从此处导入。

| 文件 | 内容 |
|------|------|
| `shared/types/index.ts` | Entity 类型（TagCategory、WorldRule、SettingEntity 等）+ DTO（Create*DTO、Update*DTO）+ 枚举 |

**规则：**
- `app/types/` 仅保留前端特有的类型（如 `ActivePanel`、`ViewMode`）
- `server/storage/*-store.ts` 中的 Row 类型保留在 store 文件内（仅数据库层使用）
- 新增全栈共享类型时，**必须**添加到 `shared/types/`，在 `app/types/` 中重新导出

## 共享 Hooks 注册表（`shared/hooks/`）

跨多个页面使用的 hooks 放在这里。

| 文件 | 内容 |
|------|------|
| `shared/hooks/use-tag-tree.ts` | 标签树全局缓存 |
| `shared/hooks/use-debounce.ts` | 防抖 hook |

## 共享工具函数注册表（`shared/utils/`）

跨多个文件使用的纯函数放在这里。

| 文件 | 内容 |
|------|------|
| `shared/utils/tree-utils.ts` | `collectAllIds`、`searchMatch`、`findInTree` |

## 共享 UI 组件（`shared/ui/`）

| 组件 | 路径 | 用途 |
|------|------|------|
| `SplitPanel` | `shared/ui/split-panel/` | 左右分栏布局 |
| `EmptyState` | `shared/ui/empty-state/` | 空状态占位 |
| `ConfirmDelete` | `shared/ui/confirm-delete/` | 删除确认弹窗 |
| `BaseModal` | `shared/ui/base-modal/` | 基础弹窗（三层布局） |
| `AiDropdown` | `shared/ui/ai-dropdown/` | AI 操作下拉 |
| `ArrayInput` | `shared/ui/array-input/` | 数组输入组件 |
| `Theme` | `shared/ui/theme/` | 主题切换 Context |
| `TagTree` | `shared/ui/tag-tree/` | 标签树组件 |
| `TagSelector` | `shared/ui/tag-selector/` | 级联标签选择器 |

### BaseModal

- 三层：固定标题 → 可滚动 body（`flex:1`）→ 固定 footer（`flex-shrink:0`）
- `maxHeight: 85vh`，overflow auto
- `closable=false`，通过 footer 按钮关闭
- `destroyOnClose=true`
- 可选 `footer` prop — 传 `null` 隐藏底部栏

### ConfirmDelete

使用 `confirmDelete(action, label, warning?)` 触发删除确认。
内部 loading 防止重复点击。
默认文案：`确定要删除「{name}」吗？此操作不可恢复。`

## 服务器工具

- DB 连接：`server/storage/db.ts` → `getDb()`
- JSON 工具：`server/utils/json.ts` → `parseJsonSafe`
- 查询构建：`server/utils/query-builder.ts` → `buildUpdateQuery`
- **禁止：** 客户端代码导入 `server/`
