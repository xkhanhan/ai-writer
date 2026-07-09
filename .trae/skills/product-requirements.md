---
name: product-requirements
description: Use when the user wants to discuss, challenge, refine, or write product requirements, PRDs, feature scope, user flows, interaction states, pain points, acceptance criteria, or a product draft. This skill reads an existing engineering standards document when available, stays product-focused rather than technical or commercial, questions weak user requests, and produces a bounded product requirements document.
---

# product-requirements - 产品需求稿

> 触发方式：`/requirements`、`/prd`、`需求讨论`、`产品稿件`、`梳理需求`、`设计功能`

用于把用户的功能想法收敛成产品需求稿。只要用户在讨论“要做什么、用户怎么用、功能边界是什么”，就使用本 skill。不要用它写技术架构或代码。

---

## 输入契约

先寻找工程规范：

- 用户给了路径：读取该文档。
- 用户没给路径：在 `docs/` 中找 `project-standards.md`、`standards.md`、`engineering*.md` 等明显规范文档。
- 找不到：继续做产品讨论，但在输出里标明“缺少工程规范，以下需求先保持技术中立”。

不要把工程规范写死在 skill 里。只读取项目已有或用户提供的规范。

---

## 目标

产出可交给架构设计使用的产品稿件，内容聚焦用户、场景、痛点、交互、状态和验收标准。不讨论商业模式，不展开技术实现。

---

## 首轮行为

先复述用户意图，再指出你需要确认的关键缺口。问题不要超过 5 个，优先问会改变需求边界的问题：

- 谁会用？
- 用户现在怎么做，具体痛在哪里？
- 用户完成后应该得到什么结果？
- 这个功能的最小可用版本是什么？
- 哪些情况必须有反馈或可恢复？

用户说得不合理时，不要顺着写。先解释为什么它可能不是根需求，再给更小、更清晰的替代需求。

---

## 产品判断原则

- 用户提出的是线索，不等于真实需求。
- 优先解决高频、明确、可验证的痛点。
- 不为了“高级感”增加配置、步骤、状态或概念。
- 每个功能都要能说清楚用户何时进入、如何完成、失败后怎么办。
- 本期边界要窄，后续扩展要留下位置，但不要提前设计成复杂系统。

---

## 必须质疑

遇到这些情况要主动质疑：

- 用户想加很多入口，但没有明确主流程。
- 用户想让一个按钮承担多个含义。
- 用户希望“自动判断一切”，但没有规则和纠错方式。
- 用户要求复杂配置，但目标用户可能不理解。
- 用户把技术动作当成产品需求，例如“加个数据库表”“做个接口”。

---

## 输出模板

```markdown
# 产品需求稿

## 需求结论
[推荐做什么；如果调整或否定用户原始想法，说明原因。]

## 输入依据
- 工程规范：
- 用户对话：
- 当前约束：

## 用户与场景

## 核心痛点

## 用户流程
1. ...
2. ...

## 功能范围
### 本期必须做

### 本期不做

### 后续可评估

## 页面与交互要求

## 状态与反馈
- 空状态：
- 加载中：
- 成功：
- 失败：
- 删除/危险操作：
- 可恢复方式：

## 验收标准

## 风险与待确认问题
```

最后建议保存为 `docs/product-requirements.md`。只有用户明确要求落盘时才写文件。
