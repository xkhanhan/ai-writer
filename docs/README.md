# 文档索引

> AI 第一入口。所有规范、设计、归档文档的结构化目录。

---

## 前端规范

| 文档 | 内容摘要 |
|------|----------|
| [工程规范](./frontend/engineering.md) | 验证命令（typecheck/lint/build）、依赖管理、项目结构、清理规则 |
| [架构规范](./frontend/architecture.md) | 三层架构（app/server/shared）、依赖方向、组件放置、设计模式 |
| [组件规范](./frontend/components.md) | 按钮/标签/表单/弹窗/侧边栏的交互规则，BaseModal/ConfirmDelete/SaveButton 用法 |
| [API 规范](./frontend/api.md) | 漏斗式错误处理（Result<T>）、API Client、API 函数编写、Hook 层处理 |
| [工具规范](./frontend/utils.md) | 消息工具（showError/showSuccess）、共享 UI 组件清单、工具函数使用规则 |
| [代码规范](./frontend/coding.md) | TypeScript strict、React/Next.js、CSS Modules、命名规范、验证门禁 |
| [视觉规范](./frontend/visual.md) | Design Token（色彩/字体/间距/圆角/阴影）、技术栈约束、响应式断点 |

## 后端规范

| 文档 | 内容摘要 |
|------|----------|
| [架构规范](./backend/architecture.md) | server/ 目录结构、Server-Only 约束、数据访问模式、错误处理、日志、架构红线 |
| [数据库规范](./backend/database.md) | SQLite 选型、store 编码规则、SQL 参数化查询、数据文件管理 |
| [请求规范](./backend/request.md) | RESTful 风格、路由文件职责、响应格式、HTTP 状态码 |
| [代码规范](./backend/coding.md) | API Route 编码、Store 编码、参数化查询、命名规范 |

## 项目管理规范

| 文档 | 内容摘要 |
|------|----------|
| [工作流规范](./management/workflow.md) | Git 分支策略、提交规范（type(scope): summary）、PR 流程、验证门禁 |
| [文档规范](./management/documentation.md) | 文档编写标准（简约放置+详细链接）、目录结构、维护规则 |
| [评审规范](./management/review.md) | 代码评审检查清单、架构评审要点、PRD 评审流程 |
| [计划管理规范](./management/planning.md) | 迭代规划、任务拆解原则、进度跟踪方法 |

## 功能设计文档

| 文档 | 状态 |
|------|------|
| [系统架构设计](./plans/system-architecture.md) | 设计讨论中 |
| [V2 架构设计](./plans/architecture-v2.md) | 设计讨论中 |
| [创作区设计](./plans/creation-zone.md) | 已有方案 |
| [工作区视觉改造](./plans/workspace-visual.md) | 已有方案 |
| [书籍元信息扩展](./plans/book-metadata.md) | 待实现 |
| [输入验证规范](./plans/input-validation.md) | 待实现 |
| [工作计划总览](./plans/work-plan.md) | 进行中 |

## 其他

| 目录 | 说明 |
|------|------|
| [mockups/](./mockups/) | HTML 交互原型页面 |
| [archive/](./archive/) | Phase1 PRD 与设计稿（只读归档） |
