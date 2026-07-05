# 文档整理说明

> 整理时间：2026-07-05
> 操作人：AI 助手

---

## 一、整理目标

对 `docs/` 目录进行全面系统化重构，解决以下问题：

1. **内容混杂**：工作计划与开发规范混在同一目录层级
2. **大量冗余**：CODE_STANDARDS、FRONTEND_STANDARDS、BACKEND_STANDARDS 三者有 30%+ 内容重叠
3. **结构过深**：嵌套层级达 4-5 级（如 `features/visual-redesign/specs/`）
4. **与实际不符**：BACKEND_STANDARDS 描述了不存在的 Service/Repository/Model 分层；GIT_GUIDE 的分支名与 AGENTS.md 不一致
5. **AI 不友好**：叙述性表述多，缺少可直接执行的条款

---

## 二、结构调整

### 旧结构 → 新结构

| 旧路径 | 新路径 | 说明 |
|--------|--------|------|
| `standards/coding/CODE_STANDARDS.md` | `standards/coding.md` | 合并 |
| `standards/coding/FRONTEND_STANDARDS.md` | `standards/coding.md` | 合并 |
| `standards/coding/BACKEND_STANDARDS.md` | `standards/coding.md` | 精简后合并（删除过时架构描述） |
| `standards/engineering/ENGINEERING_STANDARDS.md` | `standards/engineering.md` | 合并 |
| `standards/engineering/ENGINEERING_GUIDE.md` | `standards/engineering.md` | 合并 |
| `standards/engineering/PROJECT_STRUCTURE.md` | `standards/engineering.md` | 合并 |
| `standards/engineering/PROMPT_ENGINE_GUIDE.md` | `standards/ai-prompt.md` | 重命名+条款化 |
| `standards/visual/VISUAL_STANDARDS.md` | `standards/visual.md` | 合并 |
| `standards/visual/FRONTEND_VISUAL_STANDARD.md` | `standards/visual.md` | 合并 |
| `standards/visual/components/SPLITPANEL_SPEC.md` | `standards/visual.md` | 合并为一节 |
| `standards/git/GIT_GUIDE.md` | `standards/git.md` | 重命名+与AGENTS.md对齐 |
| `WORK_PLAN.md` | `plans/work-plan.md` | 移动+修复断裂引用 |
| `features/creation-zone/` | `plans/creation-zone.md` | 合并 spec+plan 为单文件 |
| `features/visual-redesign/` | `plans/workspace-visual.md` | 合并 spec+plan 为单文件 |
| `features/book-metadata/` | `plans/book-metadata.md` | 移动+精简 |
| `features/input-validation/` | `plans/input-validation.md` | 移动+精简 |
| `archive/PRD.md` | `archive/prd-phase1.md` | 重命名 |
| `archive/PHASE_1_DESIGN.md` | `archive/design-phase1.md` | 重命名 |

### 层级变化

- 旧：最深 5 级（`docs/standards/visual/components/SPLITPANEL_SPEC.md`）
- 新：最深 2 级（`docs/standards/coding.md`）

---

## 三、删除的文件（18个）

| 文件 | 删除原因 |
|------|----------|
| `standards/coding/CODE_STANDARDS.md` | 合并至 `coding.md` |
| `standards/coding/FRONTEND_STANDARDS.md` | 合并至 `coding.md`，内容与 CODE_STANDARDS 重叠 30% |
| `standards/coding/BACKEND_STANDARDS.md` | 合并至 `coding.md`，**删除了不存在的 Service/Repository/Model 分层描述** |
| `standards/engineering/ENGINEERING_STANDARDS.md` | 合并至 `engineering.md` |
| `standards/engineering/ENGINEERING_GUIDE.md` | 合并至 `engineering.md` |
| `standards/engineering/PROJECT_STRUCTURE.md` | 合并至 `engineering.md` |
| `standards/engineering/PROMPT_ENGINE_GUIDE.md` | 重命名为 `ai-prompt.md` |
| `standards/visual/VISUAL_STANDARDS.md` | 合并至 `visual.md` |
| `standards/visual/FRONTEND_VISUAL_STANDARD.md` | 合并至 `visual.md`，内容与 VISUAL_STANDARDS 重叠 |
| `standards/visual/components/SPLITPANEL_SPEC.md` | 合并至 `visual.md` 的 SplitPanel 章节 |
| `standards/git/GIT_GUIDE.md` | 重命名为 `git.md`，**修正分支名为 master/feature/*** |
| `features/visual-redesign/specs/FRONTEND_REDESIGN_SPEC.md` | 合并至 `plans/workspace-visual.md`，**删除了过时的 CSS 变量定义** |
| `features/visual-redesign/specs/WORKSPACE_VISUAL_SPEC.md` | 合并至 `plans/workspace-visual.md` |
| `features/visual-redesign/plans/WORKSPACE_VISUAL_PLAN.md` | 合并至 `plans/workspace-visual.md` |
| `features/creation-zone/specs/CREATION_ZONE_SPEC.md` | 合并至 `plans/creation-zone.md` |
| `features/creation-zone/plans/CREATION_ZONE_PLAN.md` | 合并至 `plans/creation-zone.md`（57KB 实施计划精简为任务概要） |
| `features/book-metadata/BOOK_METADATA_SPEC.md` | 移动至 `plans/book-metadata.md` |
| `features/input-validation/INPUT_VALIDATION_SPEC.md` | 移动至 `plans/input-validation.md` |
| `WORK_PLAN.md` | 移动至 `plans/work-plan.md` |

---

## 四、核心内容修改点

### 1. 编码规范（coding.md）

- **删除**：BACKEND_STANDARDS 中描述的 Service/Repository/Model 分层架构（项目实际使用 `server/storage/` 直接操作 SQLite，无分层）
- **删除**：Zod 验证、依赖注入、Jest 测试等非实际使用的技术描述
- **修正**：文件组织从"四层架构"改为实际的三层架构（app/server/shared）
- **新增**：AI 条款化格式，每个规则为独立可执行条款

### 2. 工程规范（engineering.md）

- **合并**：3 个文件合并为 1 个，消除 API 设计、错误处理部分的重复
- **修正**：目录结构描述与实际项目完全一致
- **新增**：验证命令强制执行条款

### 3. 视觉规范（visual.md）

- **合并**：3 个文件合并为 1 个，消除视觉标准间的定位模糊
- **保留**：VISUAL_STANDARDS 为色彩/字体/间距的权威参考
- **保留**：FRONTEND_VISUAL_STANDARD 的 Ant Design 组件使用映射
- **保留**：SPLITPANEL_SPEC 的完整组件规范
- **修正**：CSS 变量命名与 `globals.css` 实际定义完全一致

### 4. Git 规范（git.md）

- **修正**：主分支名 `main` → `master`（与 AGENTS.md 一致）
- **修正**：功能分支前缀 `feat/*` → `feature/*`（与 AGENTS.md 一致）
- **新增**：`docs/*` 分支类型
- **新增**：PR 合并后立即删除分支的强制要求
- **新增**：Squash and merge 合并策略

### 5. 工作计划（plans/）

- **修复**：所有断裂引用（指向不存在的文件路径）
- **清理**：外部工具路径引用（`.superpowers/brainstorm/content/`）
- **精简**：CREATION_ZONE_PLAN 从 57KB 代码蓝图精简为任务概要

### 6. 功能设计文档

- **合并**：每个功能的 spec + plan 合并为单文件
- **精简**：删除已实现功能的详细代码实现，保留设计概要和任务清单

---

## 五、最终文件统计

| 类别 | 旧文件数 | 新文件数 | 变化 |
|------|---------|---------|------|
| 规范标准 | 11 | 5 | -6（合并精简） |
| 工作计划 | 1 (根目录) + 7 (features/) | 6 (plans/) | -2（合并精简） |
| 归档文档 | 2 | 2 | 0（仅重命名） |
| 索引/说明 | 1 | 3 | +2（新增 README + MIGRATION_NOTES） |
| **总计** | **22** | **16** | **-6** |
