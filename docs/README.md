# 项目文档目录

> 最后更新：2026-07-05

本目录存放 novel-writer 项目的所有文档资料，按文档类型与业务模块分层组织。

---

## 目录结构

```
docs/
├── README.md                              # 本文件：目录说明
├── WORK_PLAN.md                           # 工作计划总表
│
├── standards/                             # 规范标准（持续生效的项目准则）
│   ├── coding/                            #   编码规范
│   │   ├── CODE_STANDARDS.md              #     TypeScript / 通用编码规范
│   │   ├── FRONTEND_STANDARDS.md          #     前端工程规范
│   │   └── BACKEND_STANDARDS.md           #     后端工程规范
│   ├── engineering/                       #   工程实践
│   │   ├── ENGINEERING_STANDARDS.md       #     工程架构标准（目录分层、依赖规则）
│   │   ├── ENGINEERING_GUIDE.md           #     工程实践指南（构建、API、错误处理）
│   │   ├── PROJECT_STRUCTURE.md           #     项目目录结构说明
│   │   └── PROMPT_ENGINE_GUIDE.md         #     提示词工程指导（AI 功能相关）
│   ├── visual/                            #   视觉规范
│   │   ├── VISUAL_STANDARDS.md            #     视觉统一标准（色彩、字体、间距体系）
│   │   ├── FRONTEND_VISUAL_STANDARD.md    #     前端视觉规范（Ant Design 标准化）
│   │   └── components/                    #     组件规范
│   │       └── SPLITPANEL_SPEC.md         #       SplitPanel 左右分栏组件设计规范
│   └── git/                               #   Git 规范
│       └── GIT_GUIDE.md                   #     Git 操作规范（分支、提交、PR）
│
├── features/                              # 功能设计文档（按业务模块划分）
│   ├── visual-redesign/                   #   前端视觉改造
│   │   ├── specs/                         #     设计规范
│   │   │   ├── FRONTEND_REDESIGN_SPEC.md  #       视觉架构改造方案（东方水墨风格）
│   │   │   └── WORKSPACE_VISUAL_SPEC.md   #       工作区视觉改造设计文档
│   │   └── plans/                         #     实施计划
│   │       └── WORKSPACE_VISUAL_PLAN.md   #       工作区视觉改造实施计划
│   ├── creation-zone/                     #   创作区
│   │   ├── specs/                         #     设计规范
│   │   │   └── CREATION_ZONE_SPEC.md      #       创作区设计文档（四层结构）
│   │   └── plans/                         #     实施计划
│   │       └── CREATION_ZONE_PLAN.md      #       创作区改造实施计划
│   └── book-metadata/                     #   书籍元信息
│       └── BOOK_METADATA_SPEC.md          #     书籍元信息扩展设计
│
└── archive/                               # 归档文档（已完成/历史版本）
    ├── PRD.md                             #   第一阶段 PRD
    └── PHASE_1_DESIGN.md                  #   第一阶段设计方案
```

---

## 分类说明

| 目录 | 用途 | 维护频率 |
|------|------|----------|
| `standards/` | 持续生效的编码、工程、视觉、Git 规范 | 低频更新，变更需团队评审 |
| `features/` | 各功能模块的设计文档与实施计划 | 项目开发期间持续更新 |
| `archive/` | 已完成阶段或已废弃的历史文档 | 只读，不做修改 |
| `WORK_PLAN.md` | 项目整体工作计划与进度跟踪 | 每周或每阶段更新 |

---

## 文件命名规范

### 标准文档

- 全大写 + 下划线：`CODE_STANDARDS.md`、`GIT_GUIDE.md`
- 功能设计文档同样使用大写命名：`CREATION_ZONE_SPEC.md`

### 后缀约定

| 后缀 | 含义 |
|------|------|
| `_SPEC.md` | 设计规范 / 需求规格 |
| `_PLAN.md` | 实施计划 / 任务拆分 |
| `_STANDARDS.md` | 持续生效的标准规范 |
| `_GUIDE.md` | 指导性文档（实践指南） |

---

## 维护要求

1. **新增文档**：先确定所属分类（规范 / 功能 / 归档），放入对应子目录
2. **功能文档**：每个功能模块保持 `specs/` + `plans/` 的二级结构
3. **规范变更**：修改 `standards/` 下的文档后，需同步检查 AGENTS.md 中的引用是否一致
4. **归档规则**：已完成的功能文档移至 `archive/`，保留原始内容不做修改
5. **根目录原则**：`docs/` 根目录仅放置 `README.md` 和 `WORK_PLAN.md`，不存放其他文档
