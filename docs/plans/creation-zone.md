# 创作区设计与实施计划

> **状态：已有方案**（2026-07-03）

## 设计概要

将书籍工作区的"内容区域"改造为"创作区"，并新增"正文库"面板。采用滚动规划型四层结构，支持手动创建总纲、卷纲、章纲、正文，后续接入 AI 辅助生成。

### 四层结构（滚动规划型）

| 层次 | 清晰度 | 规划范围 | 说明 |
|------|--------|---------|------|
| 总纲 | 模糊 | 整本书方向 | 只有方向，不细化细节 |
| 卷纲 | 详细 | 当前一卷 | 核心冲突、发展弧线、重要节点 |
| 章纲 | 滚动 | 接下来 3-5 章 | 写完几章，再规划下一批 |
| 正文 | 实时 | 基于章纲写作 | 写作可反哺调整上层规划 |

### 两栏布局

- **左侧导航栏**（280px）：总纲入口 + 卷折叠树形章纲列表 + 新建卷按钮
- **右侧内容区**（flex: 1）：根据点击展示 8 种视图

### 8 种视图

1. **空状态引导** — 新书首次进入，引导创作流程
2. **卷纲内容卡片** — 只读展示卷纲信息（核心冲突、发展弧线、重要节点、预计看点）
3. **章纲内容卡片** — 只读展示章纲字段（情节概要、场景设定、出场人物、重要情节、伏笔设置、预计看点、字数）
4. **卷纲编辑表单** — 编辑卷标题、核心冲突、发展弧线、重要节点列表、预计看点
5. **章纲编辑表单** — 编辑章标题、情节概要、场景/人物标签、伏笔、预计字数等
6. **正文编辑器** — 基于章纲的正文写作
7. **总纲编辑** — 编辑整体方向、阶段划分、核心卖点
8. **正文库** — 存稿备份列表，独立于创作区

## 核心数据结构

```typescript
// 总纲（每本书一条）
interface BookOutline {
  bookId: string;
  direction: string;       // 整体方向
  stages: string;          // 阶段划分
  sellingPoints: string;   // 核心卖点
}

// 卷纲
interface Volume {
  id: string;
  bookId: string;
  title: string;
  coreConflict: string;    // 核心冲突
  developmentArc: string;  // 发展弧线
  keyPoints: string[];     // 重要节点
  highlights: string;      // 预计看点
  sortOrder: number;
}

// 章纲
interface Chapter {
  id: string;
  volumeId: string;
  title: string;
  summary: string;         // 情节概要
  scenes: string[];        // 场景设定
  characters: string[];    // 出场人物
  keyEvents: string[];     // 重要情节
  foreshadowings: string[];// 伏笔设置
  highlights: string;      // 预计看点
  expectedWords: number;   // 预计字数
  content: string;         // 正文
  status: "draft" | "generated" | "approved";
  sortOrder: number;
}

// 存稿
interface ArchivedChapter {
  id: string;
  bookId: string;
  chapterId: string;
  title: string;
  content: string;
  wordCount: number;
  archivedAt: string;
}
```

## 实施任务清单

| Task | 内容 | 层级 |
|------|------|------|
| Task 1 | 数据库表结构（volumes / chapters / book_outlines / archived_chapters） | 后端 |
| Task 2 | 类型定义（ActivePanel 扩展、数据接口） | 共用 |
| Task 3 | 存储层 outline-store.ts（CRUD） | 后端 |
| Task 4 | API 路由 - 总纲 GET/PUT | 后端 |
| Task 5 | API 路由 - 卷纲列表/新建/单卷 CRUD | 后端 |
| Task 6 | API 路由 - 章纲列表/新建/单章 CRUD | 后端 |
| Task 7 | API 路由 - 正文库列表/存稿/删除 | 后端 |
| Task 8 | 客户端 API 封装（creation.ts） | 前端 |
| Task 9 | 创作区状态管理 Hook（use-creation-zone） | 前端 |
| Task 10 | 创作区主容器 + 两栏布局样式 | 前端 |
| Task 11 | 左侧导航树组件（Tree 结构） | 前端 |
| Task 12 | 总纲视图 / 卷纲视图 / 章纲视图组件 | 前端 |
| Task 13 | 卷纲编辑表单 | 前端 |
| Task 14 | 章纲编辑表单 | 前端 |
| Task 15 | 正文编辑器 | 前端 |
| Task 16 | 正文库视图 | 前端 |
| Task 17 | 工作区面板配置接入 | 前端 |
| Task 18 | 联调验证（typecheck + lint + build + 手动测试） | 验证 |

## 技术栈

- Next.js App Router + TypeScript strict
- SQLite（better-sqlite3）
- Ant Design 组件库 + @ant-design/icons
- CSS Modules

## 相关文件

- 完整设计文档：`docs/features/creation-zone/specs/CREATION_ZONE_SPEC.md`
- 完整实施计划：`docs/features/creation-zone/plans/CREATION_ZONE_PLAN.md`
