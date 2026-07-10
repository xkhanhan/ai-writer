# Documentation Index

> **AI 入口文件**。Claude agent 执行任务前，必须先阅读此文件确定需要加载哪些文档。

---

## 快速导航：按任务类型选择文档

| 你的任务 | 必读文档 | 可选参考 |
|----------|----------|----------|
| **新增功能模块** | architecture.md → coding.md → components.md → engineering.md | visual.md, api.md, plans/ 下相关设计 |
| **UI/样式开发** | visual.md → components.md → coding.md | mockups/ 下对应 HTML 原型 |
| **API/后端开发** | api.md → architecture.md → coding.md | performance.md, security.md |
| **AI 能力开发** | ai-system-design.md → ai-development.md → ai-panels-design.md | plans/ 下相关设计 |
| **修复 Bug** | coding.md → architecture.md | ui-issues.md（如果是 UI 问题） |
| **重构/优化** | engineering.md → architecture.md → performance.md | validation.md |
| **安全/验证** | security.md → validation.md → environments.md | — |
| **Git/提交** | workflow.md | engineering.md（校验门禁） |
| **了解项目全貌** | HANDOFF.md → architecture.md → project-roadmap.md | product-requirements.md |
| **领取开发任务** | **TASKS.md**（认领任务后读对应必读文档） | — |

---

## Task Board（任务看板）

> 多 Claude 窗口协作时，先读此文件认领任务，再按任务指定的文档阅读。

| 文档 | 内容概要 |
|------|----------|
| [TASKS.md](./TASKS.md) | 开发任务清单：认领协议、任务列表、文件归属、依赖关系 |

---

## Standards（编码与工程规范，强制遵守）

| 文档 | 内容概要 | 何时阅读 |
|------|----------|----------|
| [architecture.md](./architecture.md) | 四层架构、依赖方向、数据库规范 | 所有开发任务 |
| [coding.md](./coding.md) | TypeScript/React/CSS Modules/Store/API 编码规范 | 所有开发任务 |
| [api.md](./api.md) | 漏斗式错误处理、Result\<T\>、RESTful 约定 | API 开发 |
| [visual.md](./visual.md) | Design Token、4 主题系统、响应式、CSS 约束 | UI/样式开发 |
| [components.md](./components.md) | 按钮/表单/弹窗/空状态规则、提取阈值、无障碍 | UI 开发 |
| [utils.md](./utils.md) | 消息工具、共享 UI 组件/hook/utils 注册表 | 查找可复用组件 |
| [workflow.md](./workflow.md) | Git 分支策略、提交格式、PR/合并流程 | 提交代码 |
| [engineering.md](./engineering.md) | 新模块 Checklist、扩展指南、性能预算、拆分规则 | 新模块/重构 |
| [performance.md](./performance.md) | 前后端性能优化、渲染优化、缓存策略 | 性能相关 |
| [security.md](./security.md) | 输入验证、XSS/SQL 注入防护、密钥管理 | 安全审查 |
| [ai-development.md](./ai-development.md) | AI 工具使用原则、Prompt 工程、AI 代码质量标准 | AI 功能开发 |
| [environments.md](./environments.md) | 环境变量、功能开关、构建一致性 | 环境配置 |
| [validation.md](./validation.md) | CI/CD 流水线、自动化校验、Pre-commit Hook | 质量保障 |

---

## Design Documents（架构与功能设计）

| 文档 | 内容概要 | 状态 |
|------|----------|------|
| [ai-system-design.md](./ai-system-design.md) | AI 系统架构：数据模块、ContextBuilder、提示词系统、过审流水线 | Active |
| [ai-panels-design.md](./ai-panels-design.md) | AI 能力全面接入：8 个面板的 AI 功能规划与详细设计 | Active |
| [panel-container-design.md](./panel-container-design.md) | IDE 式面板容器系统设计：PanelContainer API、交互规范 | Phase 1 Done |
| [product-requirements.md](./product-requirements.md) | 产品需求稿：八大模块、三阶段规划、验收标准 | Active |
| [project-roadmap.md](./project-roadmap.md) | 项目开发计划：里程碑、阶段任务、路线图 | Active |
| [HANDOFF.md](./HANDOFF.md) | 项目交接：技术栈、架构、数据库、已完成功能、设计模式 | 参考 |
| [ui-issues.md](./ui-issues.md) | UI 待优化项：视觉/交互/主题/响应式问题清单 | Backlog |

---

## Plans（实施计划）

| 文档 | 内容概要 | 状态 |
|------|----------|------|
| [plans/system-architecture.md](./plans/system-architecture.md) | 七大模块关联关系设计 | Active |
| [plans/architecture-v2.md](./plans/architecture-v2.md) | 系统架构 V2 演进路线 | Active |
| [plans/creation-zone.md](./plans/creation-zone.md) | 创作区设计与实施计划 | Ready |
| [plans/book-metadata.md](./plans/book-metadata.md) | 书籍元信息扩展 | Pending |
| [plans/input-validation.md](./plans/input-validation.md) | 输入限制与文本截断规范 | Pending |

---

## Mockups（HTML 视觉原型）

> 实现 UI 时**必须先读**对应 mockup。使用 `@ant-design/icons`，遵循 `docs/visual.md` 设计规范。

| 文件 | 内容 |
|------|------|
| [mockups/creation-zone-v2.html](./mockups/creation-zone-v2.html) | 创作区 V2（三栏布局 + AI 侧边栏） |
| [mockups/creation-zone.html](./mockups/creation-zone.html) | 创作区 V1（AiPanel 设计） |
| [mockups/tag-library.html](./mockups/tag-library.html) | 标签库（SplitPanel + TagSelector 级联） |
| [mockups/tag-tree.html](./mockups/tag-tree.html) | TagTree 视觉规范 v2 |
| [mockups/fact-library.html](./mockups/fact-library.html) | 事实库 |
| [mockups/settings-library-v1.html](./mockups/settings-library-v1.html) | 设定库 |
| [mockups/world-rules-v3.html](./mockups/world-rules-v3.html) | 世界规则 V3（最新） |
| [mockups/world-rules-v2.html](./mockups/world-rules-v2.html) | 世界规则 V2 |
| [mockups/world-rules.html](./mockups/world-rules.html) | 世界规则 V1 |
| [mockups/ai-panels.html](./mockups/ai-panels.html) | AI 面板（4 种交互模式） |

---

## Archive（历史文档，只读参考）

| 路径 | 说明 |
|------|------|
| [archive/prd-phase1.md](./archive/prd-phase1.md) | Phase 1 PRD（已完成） |
| [archive/design-phase1.md](./archive/design-phase1.md) | Phase 1 设计文档（已完成） |
| [archive/engineering-scan-report.md](./archive/engineering-scan-report.md) | 工程扫描问题报告 |
| [archive/plans/](./archive/plans/) | 已完成或过期的计划文档（7 份） |

---

## 文档维护说明

- **规范文档**（Standards）：内容应与代码保持同步，代码变更后及时更新
- **设计文档**（Design）：记录设计决策，实现后状态改为 Done/Phase N Done
- **计划文档**（Plans）：实施后移入 `archive/plans/`
- **Mockups**：HTML 原型是 UI 实现的 source of truth，多版本时保留最新版
- **Archive**：只读，不再修改
