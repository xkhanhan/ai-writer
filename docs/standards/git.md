# Git 规范

> AI 直接遵循。违反以下规范的提交不予合并。

## 1. 分支策略

### 1.1 分支类型

| 分支类型 | 命名格式 | 用途 |
|----------|----------|------|
| 主分支 | `master` | 生产代码，仅通过 PR 合并 |
| 功能分支 | `feature/*` | 新功能开发 |
| 修复分支 | `fix/*` | Bug 修复 |
| 文档分支 | `docs/*` | 纯文档变更 |

### 1.2 分支命名

kebab-case 小写，例：feature/creation-zone, fix/scroll-overflow, docs/update-agents

### 1.3 工作流

1. 从最新 master 切出: `git checkout -b feature/xxx master`
2. 开发提交（typecheck → lint → add → commit）
3. 推送分支: `git push -u origin feature/xxx`
4. 创建 PR（标题含模块名和变更摘要）
5. Review 通过后 Squash and merge
6. 合并后立即删除分支:
   ```
   git branch -d feature/xxx
   git push origin --delete feature/xxx
   ```

## 2. 提交规范

### 2.1 格式

`type(scope): summary`

### 2.2 类型

| 类型 | 用途 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| docs | 文档更新 |
| chore | 构建/工具/依赖 |
| refactor | 重构 |
| style | 样式调整 |
| test | 测试 |

### 2.3 规则

- 一个提交只做一件事
- 提交前必须通过 typecheck + lint
- 禁止提交 .env / node_modules / .next / data/ 下运行时数据

## 3. PR 规范

### 3.1 标题格式

`feat(scope): 简要描述` 或 `fix(scope): 简要描述`

### 3.2 描述必须包含

- 变更内容简要说明
- 影响的文件路径
- UI 变更截图
- 验证命令及结果（typecheck / lint / build）

## 4. 禁止事项

- 禁止直接向 master push
- 禁止在 master 上直接修改文件
- 禁止跳过 PR 流程
- 禁止合并未通过验证的代码
