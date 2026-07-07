# 开发工作流规范

> Git 分支策略、提交规范、PR 流程、验证门禁。

## 1. 分支策略

| 分支类型 | 命名格式 | 用途 |
|----------|----------|------|
| 主分支 | `master` | 生产代码，仅通过 PR 合并 |
| 功能分支 | `feature/*` | 新功能开发 |
| 修复分支 | `fix/*` | Bug 修复 |
| 文档分支 | `docs/*` | 纯文档变更 |

命名：kebab-case 小写，如 `feature/creation-zone`。

## 2. 工作流

1. 从最新 master 切出：`git checkout -b feature/xxx master`
2. 开发提交（typecheck → lint → add → commit）
3. 推送分支：`git push -u origin feature/xxx`
4. 创建 PR（标题含模块名和变更摘要）
5. Review 通过后 Squash and merge
6. 合并后立即删除分支

## 3. 提交规范

格式：`type(scope): summary`

| 类型 | 用途 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| docs | 文档更新 |
| chore | 构建/工具/依赖 |
| refactor | 重构 |
| style | 样式调整 |

规则：
- 一个提交只做一件事
- 提交前必须通过 typecheck + lint
- 禁止提交 .env / node_modules / .next / data/ 下运行时数据

## 4. PR 规范

标题格式：`feat(scope): 简要描述`

描述必须包含：
- 变更内容简要说明
- 影响的文件路径
- UI 变更截图
- 验证命令及结果

## 5. 验证门禁

| 命令 | 用途 |
|------|------|
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | ESLint 代码检查 |
| `npm run build` | 生产构建验证 |

三项全部通过才能提交/合并。

## 6. 禁止事项

- 禁止直接向 master push
- 禁止在 master 上直接修改文件
- 禁止跳过 PR 流程
- 禁止合并未通过验证的代码
