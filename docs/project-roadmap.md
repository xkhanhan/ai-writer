# 项目开发计划

> 最后更新：2026-07-10
> 当前阶段：Phase 0 完成，准备进入 Phase 1（正文生成）

---

## 已完成

### PanelContainer 重构 ✅

| 任务 | 状态 | Commit |
|------|------|--------|
| PanelContainer 组件系统 | ✅ | 8f476dd..cb32b0c |
| fact-library 迁移 | ✅ | 6355543 |
| world-rules 迁移 | ✅ | 94dbe2a6 |
| tag-library 迁移 | ✅ | 6db235d |
| settings-library 迁移 | ✅ | c5f224f |
| 旧 SplitPanel 删除 | ✅ | 98cfe75 |

### 架构治理 ✅

| 任务 | 状态 | Commit |
|------|------|--------|
| story_facts 表补充 | ✅ | 62fd65b |
| 类型迁移 app/types → shared/types | ✅ | a6b10db |
| fetchTagTree 依赖方向修复 | ✅ | 2eb1d77 |
| Panel title string → ReactNode | ✅ | be565fd |

### 文档整理 ✅

| 任务 | 状态 |
|------|------|
| AI 系统架构设计文档 | ✅ docs/ai-system-design.md |
| PanelContainer 设计文档 | ✅ docs/panel-container-design.md |
| docs 目录重组 | ✅ |
| 项目开发计划 | ✅ docs/project-roadmap.md |

### AI Phase 0: 基础设施 ✅

| 任务 | 状态 | Commit |
|------|------|--------|
| prompt_templates 表 + store | ✅ | bfa21c6 |
| ai_generation_sessions 表 + store | ✅ | 3bc74cb |
| ContextBuilder 核心框架（858行） | ✅ | 8d3a20f |
| 提示词模板管理 API | ✅ | d5a38e3 |

---

## 待做

### 治理遗留（P1/P2）

| 优先级 | 任务 | 说明 | 预估 |
|--------|------|------|------|
| P1 | API 响应格式统一 | 统一 jsonSuccess/jsonError，消除本地重定义 | 1天 |
| P1 | 验证逻辑下沉到 store | 路由层验证移到 store 函数 | 1天 |
| P1 | JS 时间戳 → SQL datetime | book-store, folder-file-store | 0.5天 |
| P2 | CSS 硬编码清理 | rgba、fallback 色值对齐 token | 1天 |
| P2 | PanelGroup 性能优化 | memoization + Divider 检测 | 1天 |

### AI 系统开发（两阶段闭环）

#### 阶段 A：最小闭环（2-3 天）— 能用

**目标：用户点按钮 → AI 生成正文 → 看到结果 → 采纳**

| 任务 | 依赖 | 说明 |
|------|------|------|
| /api/ai/chat 扩展上下文参数 | Phase 0 | 接收 bookId/chapterId/functionKey，调用 ContextBuilder |
| ContentEditor "生成内容" 按钮接通 | API 扩展 | 从 message.info 改为真正调 AI |
| 内嵌结果面板组件 | API 扩展 | 加载态 → 结果展示 → 采纳/放弃 |
| GenerationSession 记录 | API 扩展 | 每次生成记录到 ai_generation_sessions |

**验证点：** ContextBuilder 数据质量 + AI 输出质量 + 端到端链路

#### 阶段 B：完整闭环（5-7 天）— 好用

**目标：提示词可定制 + AI 面板 + 过审流水线 + 文本处理**

| 任务 | 依赖 | 说明 |
|------|------|------|
| **提示词库** | | |
| 提示词库 UI（列表+编辑+变量说明） | Phase 0 API | 一级 Tab 按场景分类，二级 Tab 按功能 |
| 变量检查能力 | 提示词库 UI | 验证 $变量 是否能正确替换 |
| 测试能力 | 提示词库 UI | 发送测试数据，查看 AI 输出 |
| **AI 面板** | | |
| AI 面板 UI（PanelContainer Tab） | PanelContainer Phase 2 | 右侧可折叠 AI 助手面板 |
| 上下文感知（useAIContext hook） | AI 面板 | 监听自定义事件，自动收集当前面板+选中项 |
| 对话功能（useChat + 流式响应） | AI 面板 + 现有 AI provider | 流式对话，感知上下文 |
| **过审流水线** | | |
| 过审 ContextBuilder（一次性提取） | Phase 0 | 同时提取事实/伏笔/角色状态 |
| 过审结果结构化 JSON | 过审 ContextBuilder | AI 返回结构化数据 |
| 过审结果 UI（批量确认） | JSON 结构 | 一次展示所有提取结果，用户勾选确认 |
| 数据落库（事实/伏笔/角色状态） | 过审 UI | 确认后写入对应数据库 |
| **文本处理** | | |
| 润色/去AI味/扩写接通 | Phase 0 | 正文库 AI 按钮接通 |
| AI 检查角色 | Phase 0 | 角色设定+规则+事实 → 问题列表 |
| 事实一致性检查 | Phase 0 | 全量事实+规则 → 矛盾列表 |

### 创作区增强

| 任务 | 依赖 | 说明 |
|------|------|------|
| 卷纲工作台（关联统计仪表盘） | 无 | 显示角色/伏笔/事实统计 |
| 章纲自定义开头/结尾 | 无 | 用户写开头，AI 必须衔接 |
| 章纲 → AI 快速生成建议 | 阶段 A | AI 根据卷纲建议章纲 |
| 回退机制 Phase 1（标记+重新过审） | 阶段 B 过审 | 修改章纲后标记受影响章节 |

### PanelContainer 增强

| 任务 | 依赖 | 预估 |
|------|------|------|
| Phase 2: Tab 支持 | Phase 1 Done | 2天 |
| 消费者标准化（标题/搜索/操作栏统一） | Phase 1 Done | 2天 |
| 布局持久化（localStorage） | Phase 1 Done | 1天 |
| Phase 4: 嵌套拆分（创作区垂直 PanelGroup） | Phase 2 | 2天 |

---

## 开发路线图

```
当前 ─────────────────────────────────────────────────→

Phase 0 ✅ → 阶段 A: 最小闭环 → 验证 → 阶段 B: 完整闭环
             (2-3天)            (数据    (5-7天)
                                 质量)     ├── 提示词库 UI
                                           ├── AI 面板
                                           ├── 过审流水线
                                           └── 文本处理+检查

同时穿插:
  治理遗留 P1/P2（顺手修）
  创作区增强（卷纲工作台、章纲自定义开头结尾）
  PanelContainer Phase 2（Tab 支持）
```

### 里程碑

| 里程碑 | 内容 | 目标 |
|--------|------|------|
| M0 | AI 基础设施 ✅ | ContextBuilder + 模板存储 + API |
| M1 | 最小闭环 | 用户点击生成，AI 根据章纲+角色+规则生成正文，可采纳 |
| M2 | 完整闭环 | 提示词可定制 + AI 面板 + 过审流水线 + 文本处理 |
| M3 | 创作区增强 | 卷纲工作台、章纲快速生成、自定义开头结尾 |
| M4 | 回退机制 | 章节修改后自动标记受影响章节 |
