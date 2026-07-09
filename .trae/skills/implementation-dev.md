# implementation-dev - 开发执行

> 触发方式：`/dev`、`/implement`、`开发`、`实现功能`、`修复 bug`、`按方案开发`、`改代码`

用于根据工程规范、产品需求稿、架构方案和现有代码执行开发。只要用户明确要“实现、修复、改代码、按方案落地”，就使用本 skill。

---

## 输入契约

优先读取：

- `AGENTS.md`
- 工程规范文档：用户提供路径，或 `docs/` 中的规范文档
- 产品需求稿：用户提供路径，或 `docs/` 中的需求文档
- 架构方案：用户提供路径，或 `docs/` 中的架构文档
- 当前任务对话
- 相关源码目录

缺少文档时：

- 小 bug、小调整：可以继续，但先写清楚理解、边界和风险。
- 中大型功能：先要求补齐需求稿或架构方案，避免直接写成临时补丁。

---

## 开发目标

写出能长期维护的代码：清晰、健壮、局部可改、符合项目边界。不要为了一个小问题引入复杂设计，也不要把一次性脏逻辑塞进核心路径。

---

## 执行流程

1. 查看工作区状态，识别用户已有改动，不覆盖无关文件。
2. 读取规范、需求、架构和相关源码。
3. 给出简短实施计划：
   - 要改哪些文件
   - 每个文件承担什么职责
   - 哪些边界不能碰
   - 风险和验证方式
4. 修改代码。
5. 自查：
   - 是否破坏 client/server 边界
   - 是否有清晰类型和 DTO
   - 状态流、错误流是否可信
   - 是否有无用抽象或重复逻辑
   - 是否只改了任务相关范围
6. 验证并报告结果。

---

## 文件落点规则

```text
跨页面 UI 组件       -> shared/ui/{name}/
页面内专用组件       -> app/pages/{feature}/components/{name}/
页面 hook            -> app/pages/{feature}/hooks/
客户端工具函数       -> app/utils/
共享类型             -> app/types/
API route            -> app/api/{route}/
服务端业务逻辑       -> server/{domain}/
数据持久化           -> server/storage/
```

不要因为“以后可能复用”提前放进 `shared/`。出现第二个真实消费者后再抽象。

---

## 质量底线

- TypeScript strict 通过。
- 文件名 kebab-case；组件导出 PascalCase。
- 2 空格缩进。
- UI 使用 Ant Design v6。
- 样式用 CSS Modules，并优先复用 `app/globals.css` 变量。
- API route 保持薄层：parse request -> call server -> return JSON。
- client 组件不能导入 `server/*`。

---

## 验证命令

使用 PowerShell：

```powershell
npm run typecheck
npm run lint
npm run build
```

验证失败时，先判断是否由本次改动引起。本次引起的要修；既有问题要说明证据。

---

## Git 行为

- 只暂存和本次任务有关的文件。
- commit message 使用项目规范：`feat(scope): summary`、`fix(scope): summary`、`docs(scope): summary`、`refactor(scope): summary`。
- 如果用户明确授权 AI 在当前 feature 工作分支提交，可以提交。
- 不 push、不 merge、不直接操作 `master`，除非用户明确要求且项目规则允许。

---

## 最终输出

```markdown
## 完成内容

## 修改文件

## 验证结果

## 未处理/需注意
```

只写用户需要知道的结果、验证和风险，不输出冗长开发日志。
