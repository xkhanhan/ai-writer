# Task Board

> **多 Agent 协作任务看板** — 扫描报告产出，Agent 按规则认领执行。
> 最后更新：2026-07-10

---

## 认领协议

```powershell
# 认领（原子锁，防竞态）
.\scripts\claim-task.ps1 claim <TASK-ID> <AGENT-NAME>

# 查看所有认领状态
.\scripts\claim-task.ps1 status

# 标记完成
.\scripts\claim-task.ps1 done <TASK-ID>

# 释放认领（放弃时）
.\scripts\claim-task.ps1 clear <TASK-ID>
```

**规则：**
- 每个 Agent 启动时先 `status` 查看全局，再领取不冲突的任务
- 共享 `files` 的任务互斥，同一时间只能有一个 Agent 认领
- 完成后必须通过 `typecheck + lint + build` 才算 done
- 被 BLOCKED 的任务不要强行推进，先解决依赖

---

## 任务类型说明

| 类型 | 标记 | 说明 |
|------|------|------|
| 需求 | `F-NNN` | 新功能开发 |
| 重构 | `R-NNN` | 不改行为的结构优化 |
| 优化 | `O-NNN` | 性能、体验、流程改进 |
| 修复 | `B-NNN` | Bug 修复 |
| 审计 | `A-NNN` | 待扫描确认的问题 |

## 状态说明

| 状态 | 含义 |
|------|------|
| `pending` | 待认领 |
| `claimed` | 已认领，未开始 |
| `in-progress` | 执行中 |
| `review` | 待审查（已提交，等验证） |
| `done` | 已完成并验证 |
| `blocked` | 被依赖阻塞 |
| `skipped` | 暂不处理 |

---

## P0 — 阻塞性 / 核心功能

<!-- 以下任务阻塞后续开发，必须优先完成 -->

| ID | Type | 标题 | 描述 | 涉及文件 | 如何修复 | 如何验证 | Status | Owner | Depends |
|----|------|------|------|----------|----------|----------|--------|-------|---------|
| F-001 | 需求 | 伏笔库后端持久化 | 当前 foreshadow-library 纯客户端状态，刷新即丢失。需要新建 DB 表 + API + Store | `server/storage/foreshadow-store.ts`(新建), `app/api/books/[id]/foreshadows/`(新建), `app/pages/books/components/foreshadow-library/` | 1. 新建 `foreshadows` 表(id, book_id, content, chapter_id, status, created_at, updated_at) 2. 创建 foreshadow-store.ts (CRUD) 3. 创建 API routes 4. 前端对接 API 替换客户端状态 | tsc 通过; 手动测试：创建伏笔→刷新页面→数据仍在; 通过 API 直接验证 CRUD | done | claude-dev | — |
| F-002 | 需求 | 过审落库 — 事实/伏笔/角色确认后写入 | review-result-panel 确认后只做了 UI 状态变更，未真正写入数据库 | `app/pages/books/components/review-result-panel/index.tsx`, `app/pages/books/components/creation-zone/components/content-editor/index.tsx`, `app/api/ai/review/route.ts`, `app/pages/books/components/fact-library/` | 1. content-editor 的 handleReviewConfirm 调用事实库/伏笔库 API 批量写入 2. review-result-panel 确认后触发对应 store 的 create 操作 3. 需要 F-001 完成后伏笔才能落库 | tsc 通过; 手动测试：过审→确认事实→事实库新增条目; 确认伏笔→伏笔库新增条目 | pending | none | F-001 |

---

## P1 — 高优先级 / 架构改进

<!-- 提升代码质量和可维护性 -->

| ID | Type | 标题 | 描述 | 涉及文件 | 如何修复 | 如何验证 | Status | Owner | Depends |
|----|------|------|------|----------|----------|----------|--------|-------|---------|
| R-001 | 重构 | context-builder builder 独立性增强 | 已拆分为目录，但各 builder 内部仍直接调用 store 函数。应通过参数注入依赖以支持测试 | `server/ai/context-builder/builders/*.ts` | 将 store 函数作为参数传入 builder，而非直接 import。index.ts 负责注入依赖 | tsc 通过; 所有 builder 可独立单元测试 | pending | none | — |
| R-002 | 重构 | API 路由 Response 布局统一 | 部分路由 GET 返回 `{ entity }`、`{ rule }`、`{ tag }` 等不同字段名，应统一为 `{ data }` 或保持当前模式但加文档 | `app/api/books/[id]/route.ts`, `app/api/setting-entities/[id]/route.ts`, `app/api/world-rules/[id]/route.ts`, `app/api/tags/[id]/route.ts` | 1. 确定统一格式(建议 `{ success: true, data: {...} }`) 2. 所有 GET 路由统一 3. 前端 API client 适配 | tsc 通过; grep 确认所有 route 使用统一格式; 前端页面功能正常 | pending | none | — |
| R-003 | 重构 | shared/api 仅剩 tags.ts，评估是否合并到 app/api-client | `shared/api/tags.ts` 是 shared/api/ 下唯一消费者，`shared/api/client.ts` 已删除。tags.ts 应迁入 app/api-client | `shared/api/tags.ts`, `app/api-client/` | 将 tags.ts 的函数移入 app/api-client/tags.ts，更新所有导入，删除 shared/api/ | tsc 通过; grep 确认无残留导入 | pending | none | — |
| R-004 | 重构 | creation-zone hooks 目录结构化 | `use-creation-zone.ts` 仍 288 行，可进一步拆分为数据层 + 操作层 | `app/pages/books/hooks/use-creation-zone.ts` | 拆为 use-creation-data.ts (查询/加载) + use-creation-actions.ts (CRUD)，主 hook 组合 | tsc 通过; 功能不变 | pending | none | — |
| O-001 | 优化 | PanelGroup memoization | PanelGroup 每次渲染都重新计算子面板，应用 React.memo + useMemo 优化 | `shared/ui/panel-container/panel-group.tsx`, `shared/ui/panel-container/divider.tsx` | 1. PanelGroup 用 React.memo 包裹 2. 子面板列表用 useMemo 3. Divider 的 onDrag 用 useCallback | tsc 通过; React DevTools 确认不必要重渲染减少 | pending | none | — |
| O-002 | 优化 | world-rules / prompt-library 批量操作错误恢复 | AI 批量创建规则/激活模板时逐条操作，一条失败则状态不一致 | `app/pages/books/components/world-rules/index.tsx`, `app/pages/books/components/prompt-library/index.tsx` | 1. world-rules: 用 Promise.allSettled + 部分成功提示 2. prompt-library: 服务端增加原子激活端点 | tsc 通过; 模拟单条失败场景，确认部分成功正确提示 | pending | none | — |

---

## P2 — 中优先级 / 功能增强

| ID | Type | 标题 | 描述 | 涉及文件 | 如何修复 | 如何验证 | Status | Owner | Depends |
|----|------|------|------|----------|----------|----------|--------|-------|---------|
| F-003 | 需求 | AI 面板 UI | PanelContainer Tab 右侧可折叠 AI 助手面板 | `shared/ui/panel-container/`, `app/pages/books/` | 1. PanelContainer 新增可折叠侧边栏 2. AI 面板组件含对话列表+输入框 | tsc 通过; 手动测试面板折叠/展开; 对话正常 | pending | none | — |
| F-004 | 需求 | AI 上下文感知 hook | 监听自定义事件，自动收集当前面板+选中项作为 AI 上下文 | `app/pages/books/hooks/` | 1. 创建 useAIContext hook 2. 各面板 dispatch 选中事件 3. hook 汇总为 ContextInput | tsc 通过; 切换面板后 AI 获取正确的上下文 | pending | none | F-003 |
| F-005 | 需求 | 书籍简介扩写 | 接入 book_synopsis_expand 功能 | `app/pages/books/components/book-info-form/` | 在书籍信息编辑弹窗中增加"AI扩写简介"按钮 | tsc 通过; 输入简介→点击扩写→AI返回扩展内容 | pending | none | — |
| F-006 | 需求 | 世界规则 AI 建议 | 新增 world_rule_suggest 功能 | `app/pages/books/components/world-rules/`, `server/ai/context-builder/builders/world-rule-suggest.ts` | 1. builder 已存在，需前端对接 2. 世界规则面板增加"AI建议"按钮 3. 结果展示+确认落库 | tsc 通过; 点击AI建议→返回规则列表→确认写入 | pending | none | — |
| F-007 | 需求 | 标签库 AI 自动打标 | 基于设定内容自动分配标签 | `app/pages/books/components/tag-library/` | 1. 调用 AI 分析设定实体 2. 返回建议标签 3. 用户确认后批量打标 | tsc 通过; 选择实体→AI建议标签→确认→标签更新 | pending | none | F-006 |
| O-003 | 优化 | 创作区卷纲工作台统计仪表盘 | 关联统计：角色/伏笔/事实分布 | `app/pages/books/components/creation-zone/components/volume-view/` | 1. 新增统计组件 2. 从各库查询关联数据 3. 可视化展示 | tsc 通过; 卷纲视图显示统计数据 | pending | none | — |
| O-004 | 优化 | 章纲自定义开头/结尾 | chapter-form 增加 opening/closing 字段 | `app/pages/books/components/creation-zone/components/chapter-form/` | 1. 章纲表增加 opening, closing 字段 2. chapter-form 增加输入框 3. 存入 DB | tsc 通过; 创建章纲→填写开头/结尾→保存→刷新仍在 | pending | none | — |
| O-005 | 优化 | 章纲回退机制 Phase 1 | 标记+重新过审 | `app/pages/books/components/creation-zone/` | 1. 章纲状态增加 revert 能力 2. 标记为"需重审" 3. 重新触发过审流程 | tsc 通过; 已过审章纲→标记回退→重新过审 | pending | none | F-002 |

---

## P3 — 低优先级 / UI 打磨

| ID | Type | 标题 | 描述 | 涉及文件 | 如何修复 | 如何验证 | Status | Owner | Depends |
|----|------|------|------|----------|----------|----------|--------|-------|---------|
| O-006 | 优化 | PanelContainer Tab 支持 | 面板支持多 Tab 切换 | `shared/ui/panel-container/` | 1. PanelContainer 新增 Tab 模式 2. Tab 状态持久化 | tsc 通过; Tab 切换正常; 刷新后 Tab 状态保留 | pending | none | — |
| O-007 | 优化 | 布局持久化 localStorage | 面板尺寸/位置持久化 | `shared/ui/panel-container/` | 1. Divider 拖拽结束后存入 localStorage 2. 初始化时读取恢复 | tsc 通过; 拖拽面板→刷新→布局保持 | pending | none | O-006 |
| O-008 | 优化 | 右侧面板视觉重新设计 | 统一右侧面板视觉风格 | `app/pages/books/components/*/index.module.css` | 参考 mockup 重新设计右侧面板样式 | 四套主题下视觉一致; 与 mockup 对齐 | pending | none | — |
| O-009 | 优化 | 设定库人物卡片展示优化 | 角色实体用卡片而非列表展示 | `app/pages/books/components/settings-library/` | 1. 新增角色卡片组件 2. 根据 level 选择展示模式 | tsc 通过; 不同 level 的角色有对应展示 | pending | none | — |
| O-010 | 优化 | 左侧面板交互反馈 | hover/active 视觉反馈 | `app/pages/books/components/*/index.module.css` | 1. 列表项增加 hover 背景色 2. 选中项高亮 | 四套主题下 hover/active 样式正确 | pending | none | — |
| O-011 | 优化 | 搜索栏样式统一 | 各面板搜索栏统一样式 | `app/pages/books/components/*/index.module.css` | 提取共享搜索栏样式到 shared | 视觉一致; CSS 变量主题适配 | pending | none | — |
| O-012 | 优化 | 深色主题适配检查 | 全面检查深色主题下的视觉问题 | `app/**/*.module.css`, `app/globals.css` | 逐组件检查深色主题下的颜色/对比度 | 四套主题切换无异常 | pending | none | — |
| O-013 | 优化 | 响应式布局小屏幕适配 | 768px 以下布局适配 | `app/**/*.module.css` | 1. 检查各面板小屏表现 2. 调整 PanelContainer 断点 3. 移动端友好的交互 | Chrome DevTools 模拟 375px/768px 无溢出 | pending | none | — |

---

## 已完成（历史参考）

以下任务已在之前的 commit 中完成，保留在此作为参考：

| ID | 原始任务 | 对应 Commit | 完成时间 |
|----|---------|------------|---------|
| ~~G-001~~ | API 响应格式统一 | `88a888e1` | 2026-07-10 |
| ~~F-001~~ | 伏笔库后端持久化 | `6d3cb32d` | 2026-07-10 |
| ~~G-002~~ | 验证逻辑下沉到 store | `88a888e1` | 2026-07-10 |
| ~~G-004~~ | CSS 硬编码清理 | `88a888e1` + `068ca4f8` | 2026-07-10 |
| ~~A-001~~ | /api/ai/chat 扩展上下文参数 | `3a4844df` | — |
| ~~A-002~~ | ContentEditor AI 接通 | `b6764394` | — |
| ~~A-003~~ | 内嵌结果面板组件 | `c1e19e33` | — |
| ~~A-004~~ | GenerationSession 记录 | `3bc74cbf` | — |
| ~~B-001~~ | 提示词库 UI | `9d6be35f` + `8e7845a7` + `c9d31b39` | — |
| ~~B-002~~ | 变量检查能力 | `c2413d52` | — |
| ~~B-003~~ | 测试能力 | `c9d31b39` | — |
| ~~B-006~~ | 对话功能（流式响应） | `9950fe43` | — |
| ~~B-007~~ | 过审 ContextBuilder | `8d3a20f1` | — |
| ~~B-008~~ | 过审结果结构化 JSON | `08fc9978` | — |
| ~~B-009~~ | 过审结果 UI（批量确认） | `5f1edf2e` | — |
| ~~B-011~~ | 润色/去AI味/扩写接通 | `f26c81e3` | — |
| ~~B-012~~ | AI 检查角色 | `f26c81e3` | — |
| ~~B-013~~ | 事实一致性检查 | `f26c81e3` | — |
| ~~PC-002~~ | 消费者标准化 | `258d797a` + `9cab90ad` | — |
| ~~R-FULL~~ | 代码质量全面修复 (两轮) | `88a888e1` + `222c1972` | 2026-07-10 |
