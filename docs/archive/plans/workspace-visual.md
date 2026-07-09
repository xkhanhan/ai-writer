# 书籍工作区视觉改造

> **状态：已有方案**（2026-07-04）

## 设计原则

1. **内容简约** — 主区域不堆叠过多按钮/标签，复杂操作用折叠、下拉、弹窗收拢
2. **AI 统一入口** — 所有 AI 功能收拢在一个 `AI ▾` 下拉按钮中，根据上下文动态控制可用状态
3. **创作区纯编辑** — 创作区不存在观看模式，全部编辑状态，右上角固定「保存」按钮
4. **面包屑导航** — 所有面板使用 antd 面包屑 + Outlined 图标，替代面板标题
5. **删除二次确认** — 所有删除操作使用 antd Modal.confirm

## 8 个面板改造清单

| 序号 | 面板 | 图标 | 布局类型 | 改造要点 |
|------|------|------|---------|---------|
| 0 | ActivityBar 导航 | — | 侧边栏 | 从 5 面板扩展到 7 面板 |
| 1 | 书籍信息 | ReadOutlined | A: 单列表单 | 分区表单 + Cascader + 新元信息字段 |
| 2 | 世界规则 | LayersOutlined | B: 列表+编辑器 | 平铺结构，规则等级标识（核心/重要/一般） |
| 3 | 设定库 | FileTextOutlined | B: 分类列表+编辑器 | 角色/势力/地点等分类管理 |
| 4 | 标签库 | TagsOutlined | B: 树形分类+详情 | **新增面板**，树形分类标签体系 |
| 5 | 创作区 | EditOutlined | C: 导航树+多视图 | 两栏布局，8种视图切换 |
| 6 | 伏笔库 | PushpinOutlined | D: 搜索列表 | **新增面板**，伏笔跟踪与管理 |
| 7 | 正文库 | BookOutlined | D: 搜索列表 | 存稿备份，搜索与版本管理 |

## 共享 UI 组件

- `shared/ui/ai-dropdown` — AI 下拉按钮（生成/去AI味/润色/扩写）
- `shared/ui/empty-state` — 统一空状态（图标+提示+引导按钮）
- `shared/ui/confirm-delete` — 删除确认弹窗工具函数
- `shared/ui/save-button` — 保存按钮组件
- `shared/ui/array-input` — 数组输入组件（添加/删除标签项）

## 实施任务概要

| Task | 内容 | 说明 |
|------|------|------|
| Task 1 | 类型定义 + 全局 CSS 变量 | ActivePanel 扩展到 7 个，补充语义变量 |
| Task 2 | 共享 UI 组件 | AiDropdown / EmptyState / ConfirmDelete / SaveButton / ArrayInput |
| Task 3 | 面板配置 + ActivityBar 更新 | workspace-panels 配置 7 面板，侧边栏导航适配 |
| Task 4 | 书籍信息面板重构 | 分区表单 + 元信息字段 + Cascader 题材选择 |
| Task 5 | 世界规则 + 设定库面板 | 替代 FolderFileEditor，平铺规则+分类设定 |
| Task 6 | 标签库 + 伏笔库面板 | 新建两个面板组件 |
| Task 7 | 正文库面板 | 重写 ArchiveView，搜索+列表+详情 |
| Task 8 | 创作区重构 | 去掉 view 模式，纯编辑态，AI 下拉+保存 |
| Task 9 | 面板渲染适配 + 全局清理 | books/index.tsx 适配 7 面板渲染 |

## 相关文件

- 设计文档：`docs/features/visual-redesign/specs/WORKSPACE_VISUAL_SPEC.md`
- 实施计划：`docs/features/visual-redesign/plans/WORKSPACE_VISUAL_PLAN.md`
