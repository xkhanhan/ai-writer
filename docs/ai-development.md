# AI-Assisted Development Standards

## 适用场景

本规范适用于使用 AI 编码工具（Trae、Cursor、GitHub Copilot 等）辅助 AI Writer 项目开发的全流程。涵盖 AI 工具使用规范、AI 生成代码的质量标准、上下文管理策略、以及 AI 辅助代码审查规则。

---

## 一、AI 工具使用原则

### 1.1 核心理念

- **AI 是辅助，不是替代** — 开发者对所有代码负最终责任
- **理解优先** — 不接受不理解的 AI 生成代码，必须逐行审查
- **渐进式生成** — 小块生成 → 审查 → 集成，避免一次性生成大量代码
- **上下文决定质量** — 提供给 AI 的上下文越精准，生成代码质量越高

### 1.2 适用场景

| 场景 | AI 参与度 | 说明 |
|------|---------|------|
| 新模块脚手架 | 高 | DB → Types → API → UI 全链路生成 |
| 重复模式代码 | 高 | CRUD API、Store 函数、表单组件 |
| Bug 修复 | 中 | AI 辅助定位，开发者确认修复方案 |
| 架构设计 | 低 | AI 提供建议，开发者决策 |
| 复杂业务逻辑 | 低 | AI 辅助参考，核心逻辑手写 |
| 性能优化 | 中 | AI 分析瓶颈，开发者实施优化 |

### 1.3 禁止场景

| 场景 | 原因 |
|------|------|
| 不理解的代码直接合并 | 引入未知风险 |
| 一次性生成 > 300 行代码 | 难以审查，容易引入缺陷 |
| AI 生成的安全相关代码不经审查 | 安全漏洞风险 |
| 用 AI 绕过 code review | 流程违规 |
| 盲目接受 AI 的重构建议 | 可能破坏现有架构 |

---

## 二、上下文管理策略

### 2.1 项目规范上下文

AI 工具应加载以下规范文件作为上下文（优先级从高到低）：

| 文件 | 加载时机 | 用途 |
|------|---------|------|
| `docs/README.md` | 每次会话开始 | 规范索引入口 |
| `docs/architecture.md` | 涉及模块结构时 | 四层架构约束 |
| `docs/api.md` | 涉及 API 开发时 | 漏斗式错误处理 |
| `docs/coding.md` | 编写代码时 | TypeScript/React 规则 |
| `docs/components.md` | UI 开发时 | 组件交互规范 |
| `docs/visual.md` | 样式开发时 | Design Token 约束 |
| `docs/security.md` | 涉及数据/安全时 | 安全约束 |

### 2.2 Prompt 工程最佳实践

**约束：** 向 AI 工具提供 Prompt 时必须遵循以下结构：

```
1. 角色定义 — "你是 AI Writer 项目的开发者"
2. 规范约束 — "请遵循 docs/architecture.md 中的四层架构"
3. 具体任务 — "创建 /api/tasks 路由，实现 GET 和 POST"
4. 参考模式 — "参考 app/api/books/route.ts 的实现模式"
5. 输出要求 — "使用 jsonSuccess/jsonError，包裹 try/catch"
```

**好的 Prompt 示例：**

```
在 AI Writer 项目中，按照 docs/architecture.md 的四层架构，
为"任务系统"创建后端 API。

要求：
1. 参考 server/storage/book-store.ts 的 Store 模式
2. 参考 app/api/books/route.ts 的路由模式
3. 使用 Result<T> 漏斗式错误处理
4. SQL 必须参数化
5. 包含幂等迁移

参考文件：
- server/storage/book-store.ts（Store 模式）
- app/api/books/route.ts（路由模式）
```

**差的 Prompt 示例：**

```
帮我写一个任务管理系统的后端代码
```
（缺少上下文、规范约束、参考模式）

### 2.3 代码上下文注入

**约束：** 使用 AI 生成代码时，必须在 Prompt 中提供：

| 上下文类型 | 必须/建议 | 说明 |
|-----------|----------|------|
| 相关规范文件 | 必须 | 架构/编码/API 规范 |
| 参考实现文件 | 必须 | 相同模式的现有代码 |
| 类型定义 | 必须 | 相关 Entity/DTO 类型 |
| 相邻文件结构 | 建议 | 同目录下的文件列表 |
| 数据库 Schema | 建议 | 相关表结构 |

---

## 三、AI 生成代码质量标准

### 3.1 必须满足的约束

AI 生成的代码必须满足项目所有规范（`docs/` 下的所有文件），额外增加以下 AI 专属约束：

| 约束 | 说明 | 校验方式 |
|------|------|---------|
| 类型安全 | 零 `any`，零 `@ts-ignore` | `npm run typecheck` |
| 漏斗式错误处理 | API 错误通过 Result\<T\> 传递 | Code Review |
| 参数化 SQL | 禁止字符串拼接 | 搜索检查 |
| 正确的 import 路径 | 四层架构依赖方向 | `npm run lint` |
| useEffect cleanup | 所有副作用有清理 | ESLint + Review |
| CSS 变量 | 禁止硬编码颜色 | 搜索 hex/rgb 值 |
| 消息工具 | showError/showSuccess 替代 message.xxx | 搜索 message.error |

### 3.2 代码审查清单（AI 生成代码）

AI 生成的代码在合并前，必须额外检查：

- [ ] **理解每一行代码** — 不接受不理解的逻辑
- [ ] **无幻觉 API** — AI 可能生成不存在的 API/方法，验证每个 API 是否存在
- [ ] **import 路径正确** — AI 可能生成错误的 import 路径
- [ ] **类型匹配** — AI 生成的类型定义与现有类型一致
- [ ] **错误处理完整** — 没有遗漏的异常路径
- [ ] **无硬编码** — 魔法数字、硬编码字符串、硬编码颜色
- [ ] **符合项目模式** — 与现有代码风格一致
- [ ] **无冗余代码** — 无未使用的变量、导入、函数

### 3.3 常见 AI 生成缺陷模式

| 缺陷类型 | 表现 | 预防措施 |
|---------|------|---------|
| 幻觉 API | 使用不存在的方法/属性 | 提供现有 API 参考文件 |
| 错误类型 | 推断的类型与实际不符 | 提供完整类型定义 |
| 遗漏错误处理 | 正常路径完整，异常路径缺失 | Prompt 中明确要求 error handling |
| 过度抽象 | 简单场景引入复杂设计模式 | 明确要求简单实现 |
| 模式不一致 | 使用不同的代码模式 | 提供参考实现文件 |
| 遗漏 cleanup | useEffect 中无 cleanup | Prompt 中明确要求 |
| 硬编码值 | 从示例中复制的硬编码值 | Prompt 中明确使用变量 |

---

## 四、AI 辅助开发工作流

### 4.1 新模块开发流程

```
1. 准备上下文（规范 + 参考实现）
         ↓
2. AI 生成 DB 迁移 + Store → 审查 → 运行测试
         ↓
3. AI 生成 Types（Entity + DTO）→ 审查 → 类型检查
         ↓
4. AI 生成 API 路由 → 审查 → curl 测试
         ↓
5. AI 生成 API Client → 审查 → 类型检查
         ↓
6. AI 生成前端页面 → 审查 → 手动测试
         ↓
7. 整体审查 → typecheck + lint + build → 提交
```

### 4.2 Bug 修复流程

```
1. 描述症状 + 复现步骤
         ↓
2. AI 辅助定位（提供错误日志 + 相关代码）
         ↓
3. AI 提出修复方案 → 评估合理性
         ↓
4. 实施修复 → 验证 → typecheck + lint
         ↓
5. 回归测试 → 提交
```

### 4.3 重构流程

```
1. 明确重构目标和约束
         ↓
2. AI 分析现有代码 → 提出重构方案
         ↓
3. 评估方案影响范围 → 确认不破坏现有功能
         ↓
4. 分步重构（每步可验证）
         ↓
5. 每步完成后 typecheck + lint + build
         ↓
6. 全部完成后整体测试 → 提交
```

---

## 五、AI 辅助代码审查

### 5.1 AI 审查的适用范围

| 审查类型 | AI 适用度 | 说明 |
|---------|----------|------|
| 类型安全检查 | 高 | TypeScript 编译器 + AI 补充 |
| 规范合规性 | 高 | 根据规范文件逐条检查 |
| 安全漏洞 | 中 | AI 辅助识别，人工确认 |
| 逻辑正确性 | 中 | AI 可识别常见模式，复杂逻辑需人工 |
| 架构合规性 | 中 | AI 检查依赖方向，架构决策需人工 |
| 性能问题 | 中 | AI 可识别常见反模式 |
| 业务正确性 | 低 | 业务逻辑需领域知识判断 |

### 5.2 AI 审查 Prompt 模板

```
请审查以下代码变更，检查项：
1. 是否遵循 docs/architecture.md 的四层架构和依赖方向
2. 是否遵循 docs/api.md 的漏斗式错误处理
3. 是否遵循 docs/coding.md 的 TypeScript/React 规则
4. 是否遵循 docs/security.md 的安全约束
5. 是否有硬编码颜色（应使用 CSS 变量）
6. 是否有遗漏的错误处理
7. 是否有潜在的性能问题

变更文件：
[list of changed files]
```

### 5.3 审查结果分级

| 级别 | 定义 | 处理 |
|------|------|------|
| 必须修复 | 类型错误、安全漏洞、架构违规 | 合并前必须修复 |
| 建议修复 | 性能问题、代码质量 | 当前迭代修复 |
| 可选优化 | 代码风格、命名改进 | 记录，后续优化 |

---

## 六、AI 工具配置规范

### 6.1 项目级 AI 配置

在项目根目录维护 AI 工具配置文件：

| 文件 | 用途 |
|------|------|
| `AGENTS.md` | 项目级 AI Agent 指引（已存在） |
| `docs/` | 规范文档作为 AI 上下文 |
| `.cursorrules`（可选） | Cursor 专用规则 |
| `.github/copilot-instructions.md`（可选） | Copilot 指引 |

### 6.2 AI 上下文文件维护

**约束：**
- 规范文档更新时，同步检查 AI 配置文件是否需要更新
- AI 工具配置文件中的规范引用必须指向最新版本
- 定期（每月）审查 AI 配置的有效性

---

## 七、AI 辅助写作集成

### 7.1 AI 功能开发约束

AI Writer 项目本身包含 AI 辅助创作功能。开发 AI 功能时的额外约束：

| 约束 | 说明 |
|------|------|
| AI 调用超时 | 30s 超时，使用 AbortController |
| 流式响应 | 使用 ReadableStream，支持中途取消 |
| 错误重试 | 最多重试 2 次，间隔指数递增 |
| 用户知情 | AI 生成中显示加载状态 |
| 内容审核 | AI 输出需基础过滤（暴力、色情等） |
| 费用提示 | 大量文本生成前提示用户 token 消耗 |

### 7.2 AI Provider 抽象

```typescript
// shared/ai/ — 定义 provider 契约
interface AiProvider {
  id: string;
  name: string;
  models: AiModel[];
  generate(prompt: string, options: AiOptions): Promise<AiResponse>;
  generateStream(prompt: string, options: AiOptions): ReadableStream;
}
```

**约束：** 新增 AI Provider 时必须实现 `AiProvider` 接口，禁止直接调用第三方 SDK。

---

## 合规校验标准

| # | 校验项 | 自动化 | 手动 |
|---|--------|--------|------|
| AI-1 | AI 生成代码通过 typecheck + lint + build | CI 流水线 | — |
| AI-2 | AI 生成代码不包含 `any`/`@ts-ignore` | ESLint | — |
| AI-3 | AI 生成的 API 使用 Result\<T> 模式 | Code Review | — |
| AI-4 | AI 生成的 SQL 使用参数化查询 | 搜索检查 | — |
| AI-5 | AI 生成的 useEffect 有 cleanup | ESLint | — |
| AI-6 | AI 审查覆盖安全+架构+规范 | Review 记录 | — |
| AI-7 | AI 工具配置文件与规范同步 | 月度检查 | — |

## 违规整改方案

| 违规 | 整改方式 | 时限 |
|------|---------|------|
| 接受了不理解的 AI 代码 | 回退 → 逐行理解 → 重新生成 | 立即 |
| AI 生成代码含安全漏洞 | 按 security.md 整改 | 立即 |
| AI 代码不符合项目模式 | 重构为项目标准模式 | 当前迭代 |
| AI 配置文件过期 | 更新配置文件 | 3 个工作日内 |
| AI 审查流程被跳过 | 补充审查记录 | 当前迭代 |
