# 前端架构规范

> 三层架构的文件组织和依赖方向。详见 [后端架构](../backend/architecture.md)。

## 1. 三层架构

```
novel-writer/
├── app/          # 前端层：Next.js 入口、页面、API 路由
├── server/       # 后端层：存储、AI Provider、工具函数
├── shared/       # 跨层复用：UI 组件、AI 合约类型
├── data/         # 运行时数据
└── docs/         # 项目文档
```

## 2. 依赖方向（不可违反）

```
允许:
  app/    →  server/   （通过 API 路由调用）
  app/    →  shared/   （导入可复用组件和类型）
  server/ →  shared/   （导入共享类型）
  server/ →  data/     （读写数据库和文件）

禁止:
  server/ →  app/
  shared/ →  app/
  shared/ →  server/
  app/ 直接导入 server/storage/*
```

**核心原则**：客户端组件永远不能直接导入 `server/` 下的代码。前后端通信只能通过 `app/api/` 路由。

## 3. 页面间通信

页面与顶栏通过自定义事件通信（如 `navigate-settings`），不使用直接导入。

## 4. 组件放置规则

| 组件类型 | 放置位置 |
|----------|----------|
| 跨页面复用的 UI 组件 | `shared/ui/` |
| 单页面专用组件 | `app/pages/{page}/components/` |
| 应用壳组件 | `app/components/` |

## 5. 设计模式

- **单一职责**：每个组件只做一件事，复杂逻辑提取到自定义 Hook。
- **组合优于配置**：优先使用 children / compound components，避免大量配置 props。
- **页面入口精简**：`index.tsx` 只负责组合，不包含复杂逻辑。
