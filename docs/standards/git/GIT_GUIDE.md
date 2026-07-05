# Git 规范

本文档定义 novel-writer 项目的 Git 使用规范，包括分支策略、提交规范和 PR 流程。

---

## 一、分支策略

### 1.1 分支类型

| 分支类型 | 命名格式 | 用途 | 示例 |
|----------|----------|------|------|
| 主分支 | `main` | 生产就绪的代码 | `main` |
| 功能分支 | `feat/*` | 新功能开发 | `feat/creation-zone` |
| 修复分支 | `fix/*` | Bug 修复 | `fix/scroll-issue` |
| 维护分支 | `chore/*` | 构建、依赖更新等维护工作 | `chore/update-deps` |

### 1.2 分支命名规则

- 使用 **kebab-case**（小写，用 `-` 连接）
- `feat/`、`fix/`、`chore/` 前缀后接简洁描述
- 描述应当能一眼看出分支目的

```
✅ 正确
feat/book-card-layout
feat/creation-zone
fix/world-rules-scroll
chore/update-antd
chore/eslint-config

❌ 错误
feature/添加书籍卡片
fix-bug-123
newBranch
```

### 1.3 分支工作流

```
1. 从 main 创建功能分支
   git checkout -b feat/my-feature main

2. 在功能分支上开发并提交

3. 开发完成后合并回 main
   git checkout main
   git merge feat/my-feature

4. 删除已合并的功能分支
   git branch -d feat/my-feature
```

---

## 二、提交规范

### 2.1 提交格式

```
type(scope): summary
```

### 2.2 类型说明

| 类型 | 用途 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(home): add book card layout toggle` |
| `fix` | Bug 修复 | `fix(world-rules): fix scroll issue in rule list` |
| `docs` | 文档更新 | `docs(standards): add visual standards document` |
| `chore` | 构建/工具/依赖变更 | `chore(deps): update antd to 5.18` |
| `refactor` | 重构（不改变功能） | `refactor(ai): extract config store` |
| `style` | 样式调整（不影响逻辑） | `style(book-card): update hover effect` |
| `test` | 测试相关 | `test(book): add unit tests for BookService` |

### 2.3 Scope 说明

Scope 对应项目中的功能模块：

| Scope | 对应模块 |
|-------|----------|
| `home` | 首页 |
| `books` | 书籍管理 |
| `creation-zone` | 创作区 |
| `world-rules` | 世界设定 |
| `ai` | AI 功能 |
| `settings` | 设置页面 |
| `shared` | 公共组件/工具 |
| `server` | 服务端逻辑 |
| `docs` | 文档 |

### 2.4 提交示例

```bash
# 新功能
git commit -m "feat(home): add book card layout toggle"
git commit -m "feat(creation-zone): add volume management"
git commit -m "feat(ai): add provider selector component"

# Bug 修复
git commit -m "fix(world-rules): fix scroll issue in rule list"
git commit -m "fix(book-info): validate empty title before save"

# 文档
git commit -m "docs(standards): add visual standards document"
git commit -m "docs(git): add git guide document"

# 维护
git commit -m "chore(deps): update antd to latest version"
git commit -m "chore(config): add ESLint rules for unused imports"
```

### 2.5 提交规则

1. **一个提交只做一件事**：每个提交只包含一个逻辑变更，不要把不相关的改动混在一起
2. **提交前必须通过验证**：确保 `npm run typecheck` 和 `npm run lint` 通过
3. **不要提交以下文件**：
   - `.env` / `.env.local`（环境变量和密钥）
   - `node_modules/`（依赖目录）
   - `.next/`（构建产物）
   - `data/` 下的运行时数据文件
4. **语言**：提交信息使用中文或英文均可，保持简洁明了

---

## 三、Pull Request 规范

### 3.1 PR 描述模板

```markdown
## 变更说明

简要描述本次变更的内容和目的。

## 影响路径

- `features/home/components/book-card.tsx`
- `shared/ui/empty-state/index.tsx`

## UI 变更截图

（如有 UI 变更，附上截图）

## 验证命令

- [ ] `npm run typecheck` 通过
- [ ] `npm run lint` 通过
- [ ] `npm run build` 通过
```

### 3.2 PR 规则

1. **描述清晰**：说明用户可感知的变化或架构层面的调整
2. **列出影响路径**：明确标注受影响的文件和目录
3. **附截图**：UI 变更必须附上前后对比截图
4. **验证命令**：列出实际运行过的验证命令及其结果

---

## 四、提交前检查清单

每次提交前，对照以下清单逐项检查：

### 必检项

| # | 检查项 | 命令 |
|---|--------|------|
| 1 | TypeScript 类型检查通过 | `npm run typecheck` |
| 2 | ESLint 检查通过 | `npm run lint` |
| 3 | 生产构建通过 | `npm run build` |

### 代码质量检查

| # | 检查项 |
|---|--------|
| 4 | 代码中没有遗留的 `console.log`（调试日志已清理） |
| 5 | 没有未使用的 import |
| 6 | 变更按逻辑分组（一个提交做一件事） |

### 安全检查

| # | 检查项 |
|---|--------|
| 7 | 没有提交 `.env` 文件 |
| 8 | 没有在代码中硬编码密钥或密码 |
| 9 | 没有提交 `node_modules/` 或 `.next/` |

---

## 五、常用 Git 操作

### 5.1 创建功能分支

```bash
git checkout main
git pull origin main
git checkout -b feat/my-feature
```

### 5.2 提交代码

```bash
# 查看变更
git status

# 按逻辑分组添加
git add app/page.tsx
git add features/home/components/book-card.tsx
git add features/home/hooks/use-books.ts

# 提交
git commit -m "feat(home): add book card with toggle layout"
```

### 5.3 同步 main 分支

```bash
# 在功能分支上
git fetch origin
git rebase origin/main
# 解决冲突（如有）后继续
git rebase --continue
```

### 5.4 推送并创建 PR

```bash
git push -u origin feat/my-feature
```

然后在 GitHub/GitLab 上创建 Pull Request。
