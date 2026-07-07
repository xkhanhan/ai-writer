# Git Workflow

## 分支策略

| 类型 | 模式 | 用途 |
|------|------|------|
| 主分支 | `master` | 生产分支 — 仅 PR 合并 |
| 功能 | `feature/*` | 新功能开发 |
| 修复 | `fix/*` | Bug 修复 |
| 文档 | `docs/*` | 纯文档变更 |

命名：kebab-case 小写，如 `feature/creation-zone`。

## 工作流

1. 从最新 master 切分支：`git checkout -b feature/xxx master`
2. 每个任务完成后提交（typecheck → lint → add → commit）
3. 推送：`git push -u origin feature/xxx`
4. 创建 PR（标题：模块 + 摘要）
5. Review → Squash and merge
6. 合并后立即删除分支（本地 + 远程）

## Commit 格式

`type(scope): summary`

| Type | 用途 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| docs | 文档 |
| chore | 构建/工具/依赖 |
| refactor | 代码重构 |
| style | 样式调整 |

规则：
- 一个 commit = 一个逻辑变更
- 提交前必须通过 typecheck + lint
- **禁止提交：** `.env`、`node_modules`、`.next`、`data/` 运行时文件

## PR 要求

标题：`feat(scope): 简要描述`

描述必须包含：
- 变更摘要
- 影响的文件路径
- UI 变更截图（如适用）
- 验证命令及结果

## 禁止事项

- **禁止**直接 push 到 master
- **禁止**在 master 上修改文件
- **禁止**跳过 PR review
- **禁止**合并未通过验证的代码

## 数据库迁移规范

当需要修改数据库 schema 时：

1. 在 `server/storage/migrations/` 中创建新的迁移函数
2. 迁移必须**幂等** — 通过 PRAGMA 检查列/表是否存在，重复执行不报错
3. 新表必须定义外键约束（`ON DELETE CASCADE`）
4. 新增的外键列和高频查询列必须建索引
5. 多步写操作包裹在 `db.transaction()` 中
6. 在 `server/storage/db.ts` 的迁移序列中注册新迁移

```typescript
// ✅ — 幂等迁移
function migrateV5(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(books)").all() as { name: string }[];
  if (!columns.some(c => c.name === "new_column")) {
    db.exec("ALTER TABLE books ADD COLUMN new_column TEXT DEFAULT ''");
  }
}
```
