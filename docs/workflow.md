# Workflow Standards

## 适用场景

本规范适用于 AI Writer 项目的 Git 分支管理、提交格式、合并流程、角色权限及数据库迁移规范。

> **开发模式**：单人开发 + AI 协作。所有脚本命令以 `.ps1` 为准，禁止使用 bash/Linux 语法。

---

# Git Workflow

## 分支策略

| 类型 | 模式 | 用途 |
|------|------|------|
| 主分支 | `master` | 稳定分支，始终保持可运行状态 |
| 功能 | `feature/*` | 新功能开发（AI 在此分支提交） |
| 修复 | `fix/*` | Bug 修复 |

命名：kebab-case 小写，如 `feature/creation-zone`、`fix/scroll-overflow`。

## 角色与权限

| 角色 | 可以做 | 禁止做 |
|------|--------|--------|
| AI | 在 `feature/*` 上 commit | 直接 commit/push/merge `master` |
| 人 | 在 `master` 上直接编辑、merge feature 分支 | — |

## AI 提交流程

AI 每次完成一个独立任务后，在 feature 分支上提交：

```powershell
npm run typecheck
npm run lint
git add <相关文件>
git commit -m "type(scope): summary" -m "详细说明"
```

**禁止** AI 直接操作 `master` 分支（不 commit、不 push、不 merge）。

## 人（你）的合并流程

feature 分支开发完成、确认功能正常后，一条命令合并到 master：

```powershell
# 在 feature 分支上直接执行，自动推送到 master 并同步本地指针
.\scripts\merge-to-master.ps1
```

> 合并前建议跑一下 `npm run typecheck && npm run lint` 确认无误。

## 回滚方式

- **回滚单个 commit**：`git revert <commit-hash>`
- **回滚整个 feature**：合并前直接删除分支，master 不受影响
- **回滚已合并的 feature**：`git revert <merge-commit>`

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

## 禁止事项

- **禁止** AI 直接 commit/push `master` 分支
- **禁止**合并未通过验证（typecheck + lint + build）的代码
- **禁止**使用 bash/Linux 语法（Windows + PowerShell 环境）

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

---

## 合规校验标准

| # | 校验项 | 自动化 | 手动 |
|---|--------|--------|------|
| W-1 | 分支命名符合 kebab-case 规范 | Git hooks / Code Review | — |
| W-2 | Commit 格式符合 type(scope): summary | Commitlint | — |
| W-3 | 提交前通过 typecheck + lint | CI 流水线 | — |
| W-4 | 未提交 .env / data/ 等敏感文件 | CI 检查脚本 | — |
| W-5 | AI 未直接操作 master 分支 | Git hooks | Code Review |
| W-6 | 数据库迁移幂等 | Code Review | — |
| W-7 | 新表有外键约束 | 迁移脚本审查 | — |
| W-8 | 迁移在 db.ts 中注册 | Code Review | — |

## 违规整改方案

| 违规 | 整改方式 | 时限 |
|------|---------|------|
| AI 直接 commit master | 立即停止，改在 feature 分支操作 | 立即 |
| Commit 格式不规范 | 使用 `git commit --amend` 修正 | 提交前 |
| 提交未通过验证的代码 | 回退 → 修复 → 重新验证 → 提交 | 立即 |
| 迁移不幂等 | 重构为幂等迁移（PRAGMA 检查） | 当前迭代 |
| 新表无外键约束 | 补充 FOREIGN KEY 定义 | 当前迭代 |
| 迁移未注册 | 在 db.ts 迁移序列中添加 | 当前迭代 |
