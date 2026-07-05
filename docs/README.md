# 项目文档目录

> 最后更新：2026-07-05

---

## 目录结构

```
docs/
├── README.md                # 本文件：目录索引
│
├── standards/               # 开发规范（AI 直接遵循）
│   ├── coding.md           #   编码规范（TypeScript / React / CSS Modules / 架构）
│   ├── engineering.md      #   工程规范（验证命令 / 目录结构 / API / 错误处理）
│   ├── visual.md           #   视觉规范（色彩 / 字体 / 按钮 / 弹窗 / SplitPanel）
│   ├── git.md              #   Git 规范（分支 / 提交 / PR）
│   └── ai-prompt.md        #   提示词工程规范（模板 / 变量 / 知识包）
│
├── plans/                   # 工作计划与功能设计
│   ├── README.md           #   计划文档索引
│   ├── work-plan.md        #   项目总工作计划表
│   ├── creation-zone.md    #   创作区设计与实施计划
│   ├── workspace-visual.md #   工作区视觉改造设计与计划
│   ├── book-metadata.md    #   书籍元信息扩展设计
│   └── input-validation.md #   输入限制与文本截断规范
│
└── archive/                 # 归档文档（只读）
    ├── prd-phase1.md       #   第一阶段 PRD
    └── design-phase1.md    #   第一阶段设计方案
```

---

## 分类说明

| 目录 | 用途 | 维护频率 |
|------|------|----------|
| `standards/` | 持续生效的编码、工程、视觉、Git 规范 | 低频更新 |
| `plans/` | 功能模块的设计文档与实施计划 | 开发期间持续更新 |
| `archive/` | 已完成阶段的历史文档 | 只读 |

---

## 文件命名规范

- 标准文档：小写 kebab-case（`coding.md`、`git.md`）
- 功能计划：小写 kebab-case（`creation-zone.md`、`book-metadata.md`）
- 归档文档：小写 kebab-case + 阶段后缀（`prd-phase1.md`）

---

## 维护要求

1. **新增规范**：放入 `standards/`，使用条款化格式，确保 AI 可直接遵循
2. **新增计划**：放入 `plans/`，更新 `plans/README.md` 索引
3. **规范变更**：修改后需同步检查 `AGENTS.md` 中的引用是否一致
4. **归档规则**：已完成的功能文档移至 `archive/`，不做修改
