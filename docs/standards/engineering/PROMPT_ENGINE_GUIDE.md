# 提示词工程指导文件

## 1. 目标

本项目里的提示词不是一段普通字符串，而是一类可维护的工程资产。

提示词工程要解决的问题：

- 不同任务使用不同提示词模板。
- 同一个任务支持切换不同版本提示词。
- 程序负责组装变量和知识包，不让前端和 AI 随意拼接。
- 用户可以预览最终 Prompt。
- 后续接入工作流时，不需要推倒重来。

一句话：

**提示词模板、知识包、变量、模型参数、版本信息，必须拆开管理。**

## 2. 提示词工程边界

提示词工程负责：

- 模板管理
- 变量定义
- 知识包注入
- 模型默认参数
- Prompt 预览
- 模板版本切换

提示词工程不负责：

- 多节点执行编排
- 工作流调度
- 结果验收合并

工作流引擎后面可以接，但提示词工程应该先独立成立。

## 3. 推荐目录

建议新增一套专门的提示词工程目录：

```text
prompt-engine/
  templates/
    volume-outline/
      volume-outline.v1.md
      volume-outline.v2.md
    chapter-outline/
      chapter-outline.v1.md
    chapter-draft/
      chapter-draft.v1.md
    extract-facts/
      extract-facts.v1.md
  knowledge-packs/
    volume-outline/
      xuanhuan.md
      dushi.md
    chapter-outline/
      xianxia.md
      yandian.md
  profiles/
    active-templates.json
```

说明：

- `templates/`：提示词模板
- `knowledge-packs/`：按任务和题材组织的知识包
- `profiles/`：当前启用哪个模板

## 4. 模板格式

推荐使用：

**Markdown + YAML frontmatter**

原因：

- 人能直接读
- 方便版本管理
- 方便后续编辑器预览
- 结构化字段和正文模板可分离

示例：

```md
---
id: volume-outline.v1
name: 卷纲设计
taskType: volume_outline
version: 1
model:
  temperature: 0.9
  maxTokens: 4000
variables:
  - key: genre
    label: 题材
    type: text
    required: true
  - key: subGenre
    label: 子题材
    type: text
    required: false
  - key: platform
    label: 平台
    type: text
    required: true
  - key: chapterOutline
    label: 章纲内容
    type: long_text
    required: true
knowledgePack:
  mode: by-genre
  key: volume-outline
---

## 身份
你是一个精通 {{genre}}{{subGenre}} 的网文作家，有十多年网文创作经验，以及主编经验。

## 知识包
{{knowledgePack}}

## 你要做的
请你仔细阅读以下内容，帮我设计卷纲。

## 主要内容
- 故事题材：{{genre}} {{subGenre}}
- 发布平台：{{platform}}
- 章纲内容：{{chapterOutline}}
```

## 5. 变量系统

变量不能只做简单字符串替换，必须带定义。

建议数据结构：

```ts
type PromptVariable = {
  key: string;
  label: string;
  type: "text" | "long_text" | "number" | "select";
  required: boolean;
  defaultValue?: string | number;
};
```

用途：

- 前端自动渲染输入表单
- 后端自动校验缺失字段
- 预览 Prompt 时统一替换变量

## 6. 知识包设计

知识包不要写死在模板正文里。

应该由程序根据：

- `taskType`
- `genre`
- `subGenre`
- `platform`

去匹配对应知识包，再注入 `{{knowledgePack}}`。

这样做的好处：

- 同一个模板可以适配多个题材
- 知识内容更新时不需要改模板正文
- 后期可扩展平台差异化写法

## 7. 模型参数

模型参数属于模板元信息，不属于正文模板。

建议最少支持：

- `model`
- `temperature`
- `maxTokens`

后续可扩展：

- `topP`
- `presencePenalty`
- `frequencyPenalty`

如果页面已经有 AI 配置，这里要注意分层：

- 全局 AI 配置：默认模型供应方和基础参数
- 模板默认参数：某类任务推荐参数
- 运行时参数：本次任务临时覆盖

优先级建议：

```text
运行时参数 > 模板默认参数 > 全局 AI 配置
```

## 8. 程序执行流程

每次提示词执行必须走统一流程：

1. 选择任务类型
2. 找到当前启用模板
3. 收集变量输入
4. 匹配知识包
5. 校验变量是否完整
6. 渲染最终 Prompt
7. 前端预览 Prompt
8. 用户确认
9. 调用 AI
10. 返回结果

不要允许页面自己直接拼 Prompt 再发请求。

## 9. 前后端职责

### 前端

负责：

- 展示模板列表
- 展示变量输入表单
- 展示 Prompt 预览
- 提交执行请求
- 展示结果

### 后端

负责：

- 加载模板
- 加载知识包
- 校验变量
- 渲染 Prompt
- 调用 AI
- 记录模板版本与执行日志

## 10. 建议接口

建议后续至少有这些接口：

```text
GET    /api/prompts/templates
GET    /api/prompts/templates/:id
POST   /api/prompts/preview
POST   /api/prompts/run
GET    /api/prompts/knowledge-packs
POST   /api/prompts/active-template
```

## 11. 第一阶段落地顺序

不要一次把所有任务都做完。

建议按顺序：

1. 做模板文件格式
2. 做变量定义结构
3. 做知识包匹配逻辑
4. 做 Prompt 预览接口
5. 做单任务执行接口
6. 先落地一类任务：卷纲设计
7. 再扩到章纲设计、正文生成、事实提取

## 12. 当前推荐结论

对你现在这个项目，最合理的做法不是先做工作流引擎，而是先把提示词工程做成下面这套：

- 有模板
- 有变量
- 有知识包
- 有版本
- 有预览
- 可切换
- 可复用

只要这套成立，后面接工作流会顺很多。
