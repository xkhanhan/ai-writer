# Git 与工程规范

## 1. 仓库目标

本仓库用于开发本地运行的 AI 小说创作工具。

当前阶段以产品文档和第一阶段最小工程为主，避免提前引入复杂架构。

## 2. Git 初始化

标准初始化命令：

```bash
git init
git branch -M main
```

当前环境注意：

- 目录中已有一个异常 `.git` 目录。
- 该目录存在 Windows ACL 拒绝写入规则。
- 在该权限修复前，`git init` 无法完成。

处理方式：

1. 手动删除当前异常 `.git` 目录，或修复它的写入权限。
2. 重新执行 `git init`。
3. 确认 `git status` 可以正常运行。

## 3. 分支规范

主分支：

```text
main
```

功能分支命名：

```text
feature/phase-1-home
feature/phase-1-ai-config
feature/phase-1-ai-test
```

修复分支命名：

```text
fix/ai-config-save
fix/book-create-validation
```

文档分支命名：

```text
docs/phase-1-prd
docs/engineering-standards
```

## 4. Commit 规范

提交信息使用简洁中文或英文均可，但必须说明变更目的。

推荐格式：

```text
type(scope): summary
```

常用 type：

- `docs`：文档。
- `feat`：新功能。
- `fix`：修复。
- `refactor`：重构。
- `test`：测试。
- `chore`：工程配置。

示例：

```text
docs(prd): 完成第一阶段需求文档
feat(books): 添加创建书籍接口
fix(ai): 修复配置保存校验
chore(git): 添加忽略文件规则
```

## 5. 目录规范

第一阶段建议目录：

```text
app/
  api/
    ai/
      chat/
      config/
    books/
  page.tsx
data/
  books.json
docs/
  PHASE_1_DESIGN.md
  ENGINEERING_STANDARDS.md
lib/
  ai/
  storage/
PRD.md
```

说明：

- `app/` 放前端页面和后端 API Route。
- `lib/storage/` 放本地 JSON 读写逻辑。
- `lib/ai/` 放 AI 调用逻辑。
- `data/` 放本地运行数据。
- `docs/` 放设计和规范文档。
- `PRD.md` 放当前阶段产品需求。

## 6. 文件命名规范

文档：

- 顶层产品需求使用 `PRD.md`。
- 设计文档使用大写英文和下划线，例如 `PHASE_1_DESIGN.md`。

代码：

- TypeScript 文件使用小写或 kebab-case。
- React 组件使用 PascalCase。
- 工具函数文件按领域放入 `lib/`。

## 7. 环境变量规范

第一阶段需要：

```env
AI_API_KEY=
AI_BASE_URL=
AI_MODEL=
```

要求：

- `.env.local` 不提交 Git。
- `.env.example` 可以提交，但不能包含真实密钥。
- API Key 只能在后端读取。

## 8. 忽略文件规范

建议 `.gitignore` 至少包含：

```gitignore
node_modules
.next
out
dist
.env
.env*.local
data/ai-config.json
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*
```

如果 `data/books.json` 只是本地测试数据，也可以不提交。后续可改为提交 `data/books.example.json`。

## 9. 代码规范

第一阶段代码原则：

- TypeScript 开启严格模式。
- 接口返回结构统一。
- 前端不直接调用 AI 平台。
- 后端不返回完整 API Key。
- 本地文件读写集中封装，不散落在接口中。
- 错误信息要可读，不把堆栈返回给前端。

## 10. 验收规范

每次完成一个阶段性功能后，至少手动验证：

- 页面是否能打开。
- 接口成功路径是否可用。
- 接口失败路径是否有可读错误。
- 刷新页面后本地数据是否还在。
- AI 配置不会泄露完整 API Key。
- AI 调用失败时前端能显示错误。

## 11. 禁止提前实现

第一阶段不要提前实现：

- 正文编辑器。
- 章节管理。
- 提示词模板。
- 工作流编排。
- 上下文包组装。
- 状态事件。
- 回滚。

这些内容等对应阶段文档明确后再实现。
