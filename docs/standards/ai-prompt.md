# 提示词工程规范

> 本文档为 AI 直接遵循的条款化规范。
> 提示词模板、知识包、变量、模型参数、版本信息必须拆开管理，不得合并为单一字符串。

---

## 1. 工程边界

### 1.1 提示词工程负责

- 模板管理（创建、存储、版本切换）
- 变量定义与校验
- 知识包注入
- 模型默认参数
- Prompt 预览
- 模板版本切换

### 1.2 提示词工程不负责

- 多节点执行编排
- 工作流调度
- 结果验收合并

> 工作流引擎可后续接入，提示词工程应先独立成立。

---

## 2. 目录结构

所有提示词资产必须按以下结构组织：

```text
prompt-engine/
  templates/          # 提示词模板（Markdown + YAML frontmatter）
  knowledge-packs/    # 按 taskType / genre 组织的知识包
  profiles/           # 当前启用模板配置（active-templates.json）
```

### 2.1 templates/ 目录

- 子目录按 taskType 命名，如 `volume-outline/`、`chapter-outline/`。
- 同一 taskType 下可有多个版本文件，如 `volume-outline.v1.md`、`volume-outline.v2.md`。

### 2.2 knowledge-packs/ 目录

- 子目录按 taskType 命名。
- 每个题材一个文件，如 `xuanhuan.md`、`dushi.md`。

### 2.3 profiles/ 目录

- 存放 `active-templates.json`，记录每个 taskType 当前启用的模板 ID。

---

## 3. 模板格式

### 3.1 文件格式

使用 **Markdown + YAML frontmatter**，原因：

- 人可直接阅读
- 方便版本管理
- 方便编辑器预览
- 结构化字段与正文模板分离

### 3.2 必需 Frontmatter 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 模板唯一标识，格式 `taskType.vN` |
| `name` | string | 模板显示名称 |
| `taskType` | string | 任务类型，如 `volume_outline` |
| `version` | number | 版本号 |
| `model` | object | 模型参数（见第 6 节） |
| `variables` | array | 变量定义列表（见第 4 节） |
| `knowledgePack` | object | 知识包匹配规则（见第 5 节） |

### 3.3 模板正文

- 使用 `{{变量名}}` 作为变量占位符。
- 使用 `{{knowledgePack}}` 作为知识包注入点。
- 正文不得硬编码知识内容或平台特定写法。

---

## 4. 变量系统

### 4.1 变量类型定义

每个模板的 `variables` 数组中，每项必须包含以下字段：

```ts
type PromptVariable = {
  key: string;                          // 变量标识，对应正文 {{key}}
  label: string;                        // 前端表单显示标签
  type: "text" | "long_text" | "number" | "select";
  required: boolean;                    // 是否必填
  defaultValue?: string | number;       // 可选默认值
};
```

### 4.2 变量用途

- 前端根据 `type` 自动渲染对应输入控件（文本框、长文本、数字输入、下拉选择）。
- 后端根据 `required` 自动校验缺失字段。
- 预览时统一替换所有变量占位符。

### 4.3 约束

- 禁止在模板正文中使用未在 `variables` 中定义的占位符。
- 禁止在前端或后端代码中硬编码变量替换逻辑，必须读取模板 frontmatter。

---

## 5. 知识包

### 5.1 注入方式

- 知识包由程序根据 `taskType` + `genre` + `subGenre` + `platform` 匹配。
- 匹配结果注入到模板的 `{{knowledgePack}}` 占位符。
- **禁止**在模板正文中直接写入知识内容。

### 5.2 匹配规则

模板 frontmatter 中的 `knowledgePack` 字段指定匹配模式：

```yaml
knowledgePack:
  mode: by-genre          # 匹配模式
  key: volume-outline     # 知识包子目录
```

- `mode: by-genre` — 按题材匹配知识包文件。
- `key` — 知识包子目录名称。

### 5.3 优势

- 同一模板可适配多个题材，无需修改模板正文。
- 知识内容更新时只需修改知识包文件，不影响模板。
- 后期可扩展平台差异化写法。

---

## 6. 模型参数分层

### 6.1 模板级参数

模板 frontmatter 中的 `model` 字段定义该模板的推荐参数：

```yaml
model:
  temperature: 0.9
  maxTokens: 4000
```

### 6.2 参数分层与优先级

模型参数按三层管理，优先级从高到低：

```text
运行时参数（本次任务临时覆盖）> 模板默认参数（模板 frontmatter）> 全局 AI 配置（settings）
```

### 6.3 支持的参数

- 必须支持：`model`、`temperature`、`maxTokens`
- 可扩展：`topP`、`presencePenalty`、`frequencyPenalty`

---

## 7. 执行流程

每次提示词执行必须走以下统一流程，**禁止**页面直接拼 Prompt 发请求。

| 步骤 | 动作 | 说明 |
|------|------|------|
| 1 | 选择任务类型 | 确定 taskType |
| 2 | 找到当前启用模板 | 从 profiles 读取 |
| 3 | 收集变量输入 | 前端表单收集 |
| 4 | 匹配知识包 | 按 taskType + genre + subGenre + platform |
| 5 | 校验变量 | 检查 required 字段是否完整 |
| 6 | 渲染最终 Prompt | 替换变量和知识包占位符 |
| 7 | 前端预览 Prompt | 用户可见预览区域 |
| 8 | 用户确认 | 显式确认后方可执行 |
| 9 | 调用 AI | 带上模型参数发起请求 |
| 10 | 返回结果 | 展示并记录日志 |

---

## 8. 落地顺序

按以下顺序逐步实现，每步完成后再进入下一步：

1. **模板文件格式** — 定义 Markdown + YAML frontmatter 规范，写入示例模板
2. **变量定义** — 实现 PromptVariable 类型，前端表单自动渲染
3. **知识包匹配** — 实现按 taskType + genre 匹配并注入 `{{knowledgePack}}`
4. **预览接口** — `POST /api/prompts/preview`，渲染并返回完整 Prompt
5. **执行接口** — `POST /api/prompts/run`，调用 AI 并返回结果
6. **先做卷纲** — 以 `volume_outline` 任务类型作为首个落地场景
7. **扩展其他** — 依次扩展到章纲设计、正文生成、事实提取
