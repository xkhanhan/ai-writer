# 项目开发计划

> 最后更新：2026-07-10
> 当前阶段：治理完成，准备进入 AI 系统开发

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

### AI 系统开发（核心功能）

| Phase | 任务 | 依赖 | 预估 |
|-------|------|------|------|
| **Phase 0: 基础设施** | | | |
| | prompt_templates 表 + store | 无 | 1天 |
| | ai_generation_sessions 表 + store | 无 | 1天 |
| | ContextBuilder 核心框架 | 无 | 2天 |
| | 提示词模板管理 API | prompt_templates | 1天 |
| **Phase 1: 正文生成** | | | |
| | 正文生成 ContextBuilder | Phase 0 | 2天 |
| | 正文生成提示词模板 | Phase 0 | 1天 |
| | /api/ai/chat 扩展上下文参数 | Phase 0 | 1天 |
| | ContentEditor AI 按钮接通 | Phase 1 | 1天 |
| | AI 结果面板组件 | Phase 1 | 1天 |
| **Phase 2: 过审流水线** | | | |
| | 过审 ContextBuilder（一次性提取） | Phase 0 | 2天 |
| | 过审结果结构化 JSON | Phase 0 | 1天 |
| | 过审结果 UI（批量确认） | Phase 2 | 2天 |
| | 数据落库（事实/伏笔/角色状态） | Phase 2 | 2天 |
| **Phase 3: 文本处理** | | | |
| | 润色/去AI味/扩写 ContextBuilder | Phase 0 | 1天 |
| | 正文库 AI 按钮接通 | Phase 3 | 1天 |
| **Phase 4: AI 面板** | | | |
| | AI 面板 UI（PanelContainer Tab） | Phase 1 | 2天 |
| | 上下文感知（useAIContext hook） | Phase 1 | 1天 |
| | 对话功能（useChat + 流式响应） | Phase 2 | 2天 |
| **Phase 5: 检查能力** | | | |
| | AI 检查角色 | Phase 0 | 1天 |
| | 事实一致性检查 | Phase 2 | 2天 |
| | 伏笔状态检查 | Phase 2 | 1天 |

### 创作区增强

| 任务 | 依赖 | 预估 |
|------|------|------|
| 卷纲工作台（关联统计仪表盘） | 无 | 2天 |
| 章纲自定义开头/结尾 | 无 | 1天 |
| 章纲 → AI 快速生成建议 | AI Phase 1 | 2天 |
| 回退机制 Phase 1（标记+重新过审） | AI Phase 2 | 3天 |

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

治理收尾 ──→ AI 基础设施 ──→ 正文生成 ──→ 过审流水线
  (P1/P2)     (Phase 0)      (Phase 1)    (Phase 2)
                                        ↓
                              AI 面板 ←── 文本处理
                             (Phase 4)   (Phase 3)
                                ↓
                          检查能力 ←── 创作区增强
                         (Phase 5)    (卷纲/章纲)
                                ↓
                          回退机制
                         (Phase 2 plan)
```

### 里程碑

| 里程碑 | 内容 | 目标 |
|--------|------|------|
| M1 | AI 正文生成可用 | 用户点击生成，AI 根据章纲+角色+规则生成正文 |
| M2 | 过审流水线可用 | AI 提取事实/伏笔/状态，用户确认后落库 |
| M3 | AI 面板上线 | 右侧 AI 助手面板，上下文感知+对话 |
| M4 | 创作区增强 | 卷纲工作台、章纲快速生成、自定义开头结尾 |
| M5 | 回退机制 | 章节修改后自动标记受影响章节 |
