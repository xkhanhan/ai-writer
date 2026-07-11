# Task Board

> **多 Agent 协作任务看板** — 扫描报告产出，Agent 按规则认领执行。
> 最后更新：2026-07-10 (P1 全部完成)

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
| F-002 | 需求 | 过审落库 — 事实/伏笔/角色确认后写入 | review-result-panel 确认后只做了 UI 状态变更，未真正写入数据库 | `app/pages/books/components/review-result-panel/index.tsx`, `app/pages/books/components/creation-zone/components/content-editor/index.tsx`, `app/api/ai/review/route.ts`, `app/pages/books/components/fact-library/` | 1. content-editor 的 handleReviewConfirm 调用事实库/伏笔库 API 批量写入 2. review-result-panel 确认后触发对应 store 的 create 操作 3. 需要 F-001 完成后伏笔才能落库 | tsc 通过; 手动测试：过审→确认事实→事实库新增条目; 确认伏笔→伏笔库新增条目 | pending | none | — |

---

## P1 — 高优先级 / 架构改进

<!-- 提升代码质量和可维护性 -->

| ID | Type | 标题 | 描述 | 涉及文件 | 如何修复 | 如何验证 | Status | Owner | Depends |
|----|------|------|------|----------|----------|----------|--------|-------|---------|
| R-001 | 重构 | context-builder builder 独立性增强 | 已拆分为目录，但各 builder 内部仍直接调用 store 函数。应通过参数注入依赖以支持测试 | `server/ai/context-builder/builders/*.ts` | 将 store 函数作为参数传入 builder，而非直接 import。index.ts 负责注入依赖 | tsc 通过; 所有 builder 可独立单元测试 | done | claude-dev | — |
| R-002 | 重构 | API 路由 Response 布局统一 | 部分路由 GET 返回 `{ entity }`、`{ rule }`、`{ tag }` 等不同字段名，应统一为 `{ data }` 或保持当前模式但加文档 | `app/api/books/[id]/route.ts`, `app/api/setting-entities/[id]/route.ts`, `app/api/world-rules/[id]/route.ts`, `app/api/tags/[id]/route.ts` | 1. 确定统一格式(建议 `{ success: true, data: {...} }`) 2. 所有 GET 路由统一 3. 前端 API client 适配 | tsc 通过; grep 确认所有 route 使用统一格式; 前端页面功能正常 | done | claude-dev | — |
| R-003 | 重构 | shared/api 仅剩 tags.ts，评估是否合并到 app/api-client | `shared/api/tags.ts` 是 shared/api/ 下唯一消费者，`shared/api/client.ts` 已删除。tags.ts 应迁入 app/api-client | `shared/api/tags.ts`, `app/api-client/` | 将 tags.ts 的函数移入 app/api-client/tags.ts，更新所有导入，删除 shared/api/ | tsc 通过; grep 确认无残留导入 | done | claude-dev | — |
| R-004 | 重构 | creation-zone hooks 目录结构化 | `use-creation-zone.ts` 仍 288 行，可进一步拆分为数据层 + 操作层 | `app/pages/books/hooks/use-creation-zone.ts` | 拆为 use-creation-data.ts (查询/加载) + use-creation-actions.ts (CRUD)，主 hook 组合 | tsc 通过; 功能不变 | done | claude-dev | — |
| O-001 | 优化 | PanelGroup memoization | PanelGroup 每次渲染都重新计算子面板，应用 React.memo + useMemo 优化 | `shared/ui/panel-container/panel-group.tsx`, `shared/ui/panel-container/divider.tsx` | 1. PanelGroup 用 React.memo 包裹 2. 子面板列表用 useMemo 3. Divider 的 onDrag 用 useCallback | tsc 通过; React DevTools 确认不必要重渲染减少 | done | claude-dev | — |
| O-002 | 优化 | world-rules / prompt-library 批量操作错误恢复 | AI 批量创建规则/激活模板时逐条操作，一条失败则状态不一致 | `app/pages/books/components/world-rules/index.tsx`, `app/pages/books/components/prompt-library/index.tsx` | 1. world-rules: 用 Promise.allSettled + 部分成功提示 2. prompt-library: 服务端增加原子激活端点 | tsc 通过; 模拟单条失败场景，确认部分成功正确提示 | done | claude-dev | — |

---

## P1.5 — 提示词库与设置页重做

<!-- 用户体验重做：设置页活动栏 + 提示词库三栏布局 + 变量体系 + 测试预览 -->

| ID | Type | 标题 | 描述 | 涉及文件 | 如何修复 | 如何验证 | Status | Owner | Depends |
|----|------|------|------|----------|----------|----------|--------|-------|---------|
| F-008 | 需求 | 设置页活动栏改造 | 当前设置页是两个 Tab（AI配置/提示词库）切换，改为 workspace 风格的活动栏 + 内容区布局。活动栏放左侧，内容区根据选中项切换。底部增加返回上一页按钮。AI 配置改为列表+详情模式（预留多配置扩展），新建/编辑走 Modal，删除二次确认，保存时自动测试连接 | `app/pages/settings-ai/index.tsx`, `app/pages/settings-ai/layout.tsx`(新建) | 1. 外层活动栏组件（AI配置、提示词库、预留扩展位） 2. 底部返回按钮（history.back + fallback 回首页） 3. AI配置：左侧配置列表+右侧详情展示（API Key 掩码+眼睛切换） 4. 新建/编辑 Modal（厂商→自动填充联动、模型拉取按钮） 5. 创建/保存时自动测试连接，失败阻止保存 6. 提示词库→三栏布局（见 F-009） 7. 视觉对齐 workspace 活动栏 | tsc 通过; 设置页活动栏切换正常; AI配置列表 CRUD + 自动测试; 返回按钮导航正确 | pending | none | — |
| F-009 | 需求 | 提示词库三栏布局重做 | 当前为两栏（函数列表+编辑器），改为三栏：活动栏(外层F-008) → 函数分组列表(左侧) → 编辑器/预览左右分栏(右侧，IDE 风格)。用户编写完整提示词（无"系统指令前缀"概念），系统内部过滤+拼接 JSON 格式。变量语法 `${variableName}`，可折叠变量面板（2列网格+复制按钮）。去掉 per-book override，保留"复制为自定义" | `app/pages/books/components/prompt-library/index.tsx`, `prompt-list.tsx`(新建), `prompt-editor.tsx`(新建), `prompt-preview.tsx`(新建) | 1. 拆分三个子组件：列表/编辑器/预览 2. 左侧函数分组列表（6个group，可折叠，border-left选中态） 3. 右侧编辑器/预览左右分栏（全高IDE风格，等宽字体，可滚动） 4. 可折叠变量面板（max-height 200px 滚动，2列网格，点击复制 `${name}`） 5. 顶部工具栏：函数名+书籍选择器+变量按钮+操作按钮+保存 6. 删除 per-book 逻辑 7. 自动选中第一个函数 8. 激活逻辑：一 functionKey 一激活，系统默认兜底 | tsc 通过; 三栏布局正确; 编辑器/预览左右分栏; 变量面板折叠+复制; 自动选中; 保存提醒 | pending | none | F-008 |
| F-010 | 需求 | 提示词变量体系与校验 | 暴露完整内置变量：书籍名称、题材类型、简介、核心卖点、字符数量、用户补充、输出格式要求。变量语法 `${variableName}`，正则 `\$\{(\w+)\}`，前后端统一。不可用户配置，固定内置。可折叠变量面板展示（2列网格+复制按钮）。保存时校验变量完整性 | `shared/types/prompt-template.ts`, `server/storage/prompt-template-store.ts`, `app/pages/books/components/prompt-library/prompt-editor.tsx` | 1. 定义 PROMPT_VARIABLES 常量（name, label, description, source, required） 2. 可折叠变量面板：max-height 200px 滚动，2列网格，每个变量展示 `${name}`+描述+复制按钮 3. 输出格式要求按 functionKey 区分，只读 4. 保存前用正则扫描模板，未定义变量弹窗提醒 | tsc 通过; 变量面板可折叠滚动; 点击复制 `${name}` 到剪贴板; 保存缺变量弹窗提醒 | pending | none | — |
| F-011 | 需求 | 测试预览功能 | 编辑器/预览左右分栏（IDE 风格），预览选一本书作为数据源，实时渲染完整提示词（`${variableName}` 替换为真实值）。只读不可编辑。编辑模板时预览自动同步。头部工具栏含书籍选择器 | `app/pages/books/components/prompt-library/prompt-preview.tsx`, `prompt-editor.tsx`, `app/api/books/route.ts`(复用) | 1. 预览面板：头部工具栏含书籍选择器（Select） 2. 选书后获取书籍数据，用 `${variableName}` 正则替换为真实值渲染 3. 编辑器修改模板时，预览自动同步更新 4. 预览内容全高可滚动（IDE 风格，等宽字体） 5. 无书时提示"请先选择一本书" | tsc 通过; 选书→预览渲染→修改模板→同步; 切换书籍→预览变化; 变量正确替换 | pending | none | F-009, F-010 |
| F-012 | 需求 | 移除 per-book 提示词覆盖 | 去掉"为本书创建提示词"功能（用户复制提示词→指定某本书→该书专用）。此功能收益低，全局+自定义已足够。清理相关 UI 入口和后端逻辑 | `app/pages/books/components/prompt-library/index.tsx`, `app/api/ai/templates/route.ts`, `server/storage/prompt-template-store.ts` | 1. 删除"为本书创建"按钮及相关 UI 2. 删除 API 中 bookId scope 逻辑（保留全局 bookId=null） 3. 删除 DB 中 book_scoped 相关字段/查询 4. 确保"复制为自定义"仍可用（无 bookId 参数） | tsc 通过; grep 确认无 per-book 覆盖残留; 复制为自定义→激活→全局生效 | pending | none | — |
| F-013 | 需求 | 提示词交互优化 | 进入提示词库时自动选中第一个函数（当前空白不友好）；离开编辑页时若有未保存修改则弹窗提醒保存 | `app/pages/books/components/prompt-library/prompt-editor.tsx`, `app/pages/books/components/prompt-library/index.tsx` | 1. 组件 mount 时 useEffect 自动选中第一个 functionKey 2. 编辑器维护 dirty 状态（模板内容变更时标记） 3. 切换函数或离开页面时，dirty=true 则弹 confirm 对话框 4. 确认离开则丢弃修改，取消则留在当前 | tsc 通过; 进入→自动选第一个→编辑→不保存切换→弹窗提醒; 确认离开→丢弃; 取消→留下 | pending | none | F-009 |

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

## CSS 清理（扫描报告：docs/scans/css-audit-2026-07-10.md）

### CRITICAL

| ID | Type | 标题 | 描述 | 涉及文件 | 如何修复 | 如何验证 | Status | Owner | Depends |
|----|------|------|------|----------|----------|----------|--------|-------|---------|
| CSS-001 | 修复 | 未定义变量 `--bg-base` 导致主题失效 | `var(--bg-base)` 未在 globals.css 定义，调试区域背景色不显示 | `ai-result-panel/index.module.css:107`, `review-result-panel/index.module.css:209` | 替换为 `var(--bg-muted)` 或 `var(--bg-elevated)` | grep 确认无 `--bg-base` 残留; 深色主题调试区域有背景 | pending | none | — |

### HIGH

| ID | Type | 标题 | 描述 | 涉及文件 | 如何修复 | 如何验证 | Status | Owner | Depends |
|----|------|------|------|----------|----------|----------|--------|-------|---------|
| CSS-002 | 重构 | 6 个 creation-zone 组件内联样式转 CSS Module | chapter-view(20+), volume-view(18+), outline-editor(10+), volume-form(12+), markdown-editor(8+), archive-view(5+) 共 80+ 处内联 style，无 CSS Module | `creation-zone/components/chapter-view/`, `volume-view/`, `outline-editor/`, `volume-form/`, `folder-file-editor/components/markdown-editor/`, `archive-view/` | 1. 每个组件创建 index.module.css 2. 布局/颜色迁移为 CSS 类 3. 仅保留动态值为内联 | tsc 通过; grep "style={{" 确认这些文件无残留; 深色主题正常 | pending | none | — |
| CSS-003 | 修复 | tag-selector !important + 硬编码阴影 | `border-radius` 和 `box-shadow` 使用 !important，且 shadow 用硬编码 rgba | `shared/ui/tag-selector/index.module.css:35-36` | 1. 移除 !important，用更具体选择器 2. box-shadow 改用 `var(--shadow-md)` | 无 !important 残留; 深色主题下阴影正常 | pending | none | — |
| CSS-004 | 重构 | :global(.ant-xxx) 违规迁移 | 9 处直接覆盖 antd 内部样式，绕过 ConfigProvider | `tag-selector/index.module.css:40-63`, `ai-scene-modal/index.module.css:12,16`, `book-info-form/index.module.css:61,67` | tag-selector: 通过 ConfigProvider theme.components.TreeSelect 覆盖; 其余可后续 | grep ":global(.ant-" 确认减少; 视觉不变 | pending | none | — |
| CSS-005 | 修复 | 硬编码 rgba 颜色替换为 CSS 变量 | 4 处 rgba 硬编码不随主题变化 | `review-result-panel/index.module.css:169`, `review-section/index.module.css:75`, `tag-selector/index.module.css:36`, `home/index.module.css:143` | 1. 定义 `--color-success-border` 2. 定义 `--shadow-md` 3. 替换硬编码值 | 四套主题下 border/shadow 正常 | pending | none | CSS-001 |
| CSS-006 | 修复 | TSX 中硬编码颜色迁移 | dashboard-charts 3 处 rgba + home 1 处 hex | `dashboard-charts.tsx:136-138`, `home/index.tsx:249` | 1. 定义 `--color-primary-15/35/60` 2. Progress strokeColor 用 CSS 变量 | 深色主题下颜色正确 | pending | none | — |
| CSS-007 | 修复 | 导航树 error 色 fallback 不一致 | `#ff4d4f`(antd 红) 应为 `#ba1a1a`(项目红) | `navigation-tree/index.module.css:83,110,113,119` | 改 fallback 为 `var(--color-error, #ba1a1a)` | grep 确认无 #ff4d4f 残留 | pending | none | — |

### MEDIUM

| ID | Type | 标题 | 描述 | 涉及文件 | 如何修复 | 如何验证 | Status | Owner | Depends |
|----|------|------|------|----------|----------|----------|--------|-------|---------|
| CSS-008 | 清理 | 删除 11 个未使用 CSS 变量/别名 | `--color-jade/gold/indigo`, `--accent-10/20`, `--success/warning/error`, `--jade/gold/indigo` 无任何引用 | `app/globals.css:88-113` | grep 确认未使用后删除 | tsc+lint 通过; grep 确认无残留引用 | pending | none | — |
| CSS-009 | 重构 | CSS 变量别名迁移到规范名 | 旧别名 `--text`(198处), `--bg`(54处), `--panel`(48处) 等与规范名并存 | `app/globals.css` + 50+ 消费者文件 | 分阶段: 1. 标记旧别名 deprecated 2. 逐文件替换为规范名 3. 删除旧别名 | grep 确认旧别名引用归零 | pending | none | — |
| CSS-010 | 重构 | 提取共享列表样式模式 | `.listCount`, `.listToolbar`, `.filterBtn` 等在 6+ 组件中重复 | `fact-library`, `foreshadow-library`, `tag-library`, `world-rule-list`, `settings-list-panel`, `prompt-library` | 提取到 `shared/ui/list-patterns/index.module.css` | 新工具类被引用; 原组件 CSS 行数减少 | pending | none | — |
| CSS-011 | 重构 | 8 个超大 CSS Module 拆分 | 46% CSS 行数集中在 8 个 >200 行的文件中 | prompt-library(372), home(361), navigation-tree(300), foreshadow-library(289) 等 | 按子组件拆分到独立 CSS Module | 各文件 <200 行; 功能不变 | pending | none | CSS-010 |
| CSS-012 | 规范 | 字号规范补充 10px 层级 | `font-size: 10px` 在 8 个文件中使用 16 次，规范最小 11px | `docs/visual.md` + 8 个 CSS 文件 | 在排版规范中增加 10px 为 "micro" 层级 | docs/visual.md 更新; 一致性 | pending | none | — |
| CSS-013 | 规范 | 间距规范补充微间距 | 大量 1px/2px/3px/5px/6px 值不在 --space-* scale 中 | 多个 CSS 文件 | 定义 `--space-half: 2px` 等; 逐步替换 | grep 确认硬编码间距减少 | pending | none | — |
| CSS-014 | 重构 | 统一 EmptyState 组件 | 5+ 个组件自行定义 .emptyState，未使用 shared/ui/empty-state | `home/`, `creation-zone/`, `folder-file-editor/`, `review-result-panel/`, `world-rule-detail/` | 替换为 `shared/ui/empty-state/` 组件 | grep 确认独立 .emptyState 减少 | pending | none | — |
| CSS-015 | 优化 | 提取 TextTruncate 工具类 | `text-overflow: ellipsis` 三件套在 17 处重复 | 多个 CSS 文件 | 在 globals.css 添加 `.textTruncate` 工具类 | 原位置改用工具类 | pending | none | — |
| CSS-016 | 优化 | 定义 Transition Duration 变量 | transition 时长硬编码 0.15s/0.2s/0.25s/0.3s | 全局 CSS 文件 | 添加 `--duration-fast: 0.15s`, `--duration-normal: 0.2s` | grep 确认硬编码时长减少 | pending | none | — |
| CSS-017 | 优化 | 定义 Z-Index Token | z-index 值散乱无统一管理 | 全局 CSS 文件 | 添加 `--z-overlay: 1`, `--z-drag: 10`, `--z-shell: 100` | grep 确认使用 token | pending | none | — |
| CSS-018 | 修复 | 深色主题阴影适配 | rgba(0,0,0,*) 阴影在深色背景对比度不足 | `tag-selector/index.module.css:36`, `home/index.module.css:143` | 替换为 `var(--shadow-md)` | 深色主题下阴影可见 | pending | none | — |

---

## 已完成（历史参考）

以下任务已在之前的 commit 中完成，保留在此作为参考：

| ID | 原始任务 | 对应 Commit | 完成时间 |
|----|---------|------------|---------|
| ~~G-001~~ | API 响应格式统一 | `88a888e1` | 2026-07-10 |
| ~~F-001~~ | 伏笔库后端持久化 | `6d3cb32d` | 2026-07-10 |
| ~~R-001~~ | context-builder builder 独立性增强 | `288a3e2` | 2026-07-10 |
| ~~R-002~~ | API 路由 Response 布局统一 | `ce3bfc9` | 2026-07-10 |
| ~~R-003~~ | shared/api 合并到 app/api-client | `5d88e3e` | 2026-07-10 |
| ~~R-004~~ | creation-zone hooks 目录结构化 | `7fc46f6` | 2026-07-10 |
| ~~O-001~~ | PanelGroup memoization | `7ad9dd4` | 2026-07-10 |
| ~~O-002~~ | 批量操作错误恢复 | `289cab9` | 2026-07-10 |
| ~~G-002~~ | 验证逻辑下沉到 store | `88a888e1` | 2026-07-10 |
| ~~G-004~~ | CSS 硬编码清理 | `88a888e1` + `068ca4f8` | 2026-07-10 |
| ~~A-001~~ | /api/ai/chat 扩展上下文参数 | `3a4844df` | — |
| ~~A-002~~ | ContentEditor AI 接通 | `b6764394` | — |
| ~~A-003~~ | 内嵌结果面板组件 | `c1e19e33` | — |
| ~~A-004~~ | GenerationSession 记录 | `3bc74cbf` | — |
| ~~B-001~~ | 提示词库 UI | `9d6be35f` + `8e7845a7` + `c9d31b39` | — |
| ~~F-014~~ | 内容过滤架构（收口层） | 架构设计，暂不开发 | 2026-07-10 |
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
