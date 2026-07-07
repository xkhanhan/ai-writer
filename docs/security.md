# Security & Privacy Standards

## 适用场景

本规范适用于 AI Writer 项目中所有涉及数据安全、隐私保护、输入验证、API 安全及敏感信息管理的场景。项目为本地单用户应用，但仍需遵循安全最佳实践，为未来多用户扩展预留基础。

---

## 一、输入验证与注入防护

### 1.1 SQL 注入防护

**约束：** 所有 SQL 查询必须使用参数化查询，**严禁**字符串拼接。

```typescript
// ✅ — 参数化查询
db.prepare("SELECT * FROM books WHERE id = ?").get(id);

// ❌ — 字符串拼接（SQL 注入风险）
db.prepare(`SELECT * FROM books WHERE id = '${id}'`).get();
```

**校验标准：**
- ESLint 自定义规则禁止模板字符串中包含 SQL 关键字
- Code Review 检查所有 `db.prepare()` 调用
- 搜索 `db.prepare(\`` 标记可疑拼接

**违规整改：** 立即重构为参数化查询。此为 **P0 级别**，不可带入后续迭代。

### 1.2 XSS 防护

**约束：**

| 层级 | 措施 | 说明 |
|------|------|------|
| React 默认转义 | JSX 自动转义 `{variable}` | 无需额外处理 |
| 危险渲染 | **禁止** `dangerouslySetInnerHTML` | 如必须使用，先用 `DOMPurify` 净化 |
| URL 协议 | 校验 `href`/`src` 仅允许 `http:`/`https:`/`mailto:` | 防止 `javascript:` 伪协议 |
| 用户输入 | 服务端校验 + 长度限制 | 防止超长内容导致存储型 XSS |

```typescript
// ✅ — 安全的 HTML 渲染（如需要）
import DOMPurify from "dompurify";
const safeHtml = DOMPurify.sanitize(userHtml, {
  ALLOWED_TAGS: ["p", "br", "strong", "em"],
});

// ❌ — 未净化直接渲染
<div dangerouslySetInnerHTML={{ __html: userContent }} />
```

### 1.3 API 输入校验

**约束：** API 路由层必须校验所有入参：

```typescript
// ✅ — 路由层完整校验
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. 必填字段检查
    if (!body.title || typeof body.title !== "string") {
      return jsonError("INVALID_PARAM", "title is required and must be string", 400);
    }

    // 2. 长度限制
    if (body.title.length > 200) {
      return jsonError("INVALID_PARAM", "title exceeds 200 characters", 400);
    }

    // 3. 格式校验
    if (body.title.trim().length === 0) {
      return jsonError("INVALID_PARAM", "title cannot be blank", 400);
    }

    const book = await createBook(body);
    return jsonSuccess({ book }, 201);
  } catch (e) {
    return jsonError("INTERNAL_ERROR", "创建失败", 500);
  }
}
```

**校验层级表：**

| 校验类型 | 位置 | 示例 |
|---------|------|------|
| 类型校验 | API 路由 | `typeof body.title === "string"` |
| 必填校验 | API 路由 | `!body.name` → 400 |
| 长度限制 | API 路由 | `body.title.length > 200` → 400 |
| 格式校验 | API 路由 | `body.email.includes("@")` |
| 业务规则 | Server Store | 唯一性检查、外键存在性 |
| 前端即时校验 | Form 组件 | antd Form rules |

---

## 二、敏感信息管理

### 2.1 环境变量与密钥

**约束：**

| 信息类型 | 存储位置 | 提交到 Git | 示例 |
|---------|---------|-----------|------|
| AI API Key | `data/` 目录或环境变量 | **禁止** | OpenAI/Anthropic API Key |
| 数据库文件 | `data/novel-writer.db` | **禁止** | SQLite 数据文件 |
| `.env` 文件 | 项目根目录 | **禁止** | 本地环境配置 |
| `.env.example` | 项目根目录 | **允许** | 环境变量模板（无实际值） |

**`.gitignore` 必须包含：**
```
.env
.env.*
data/
*.db
```

**校验标准：** CI 流水线检查是否有敏感文件被意外提交（见 [validation.md](./validation.md)）。

**违规整改：** 发现 API Key 泄露时：
1. 立即轮换（revoke + 重新生成）密钥
2. 从 Git 历史中清除（`git filter-branch` 或 BFG）
3. 更新 `.gitignore` 确保不再泄露

### 2.2 数据库安全

**约束：**
- SQLite 文件权限：仅服务端进程可读写
- **禁止** 将数据库文件暴露为静态资源
- 数据库文件不通过 API 提供下载
- 迁移脚本中**禁止**打印敏感数据

```typescript
// ✅ — 安全的迁移日志
console.log("Migration v5 applied successfully");

// ❌ — 泄露数据的迁移日志
console.log("Migrated data:", JSON.stringify(sensitiveRows));
```

### 2.3 AI API Key 管理

**约束：**
- API Key 存储在 `book_options` 表中（加密存储，未来）
- 前端**永不**直接访问 API Key
- API Key 仅在 `server/ai/` 层使用
- 日志中**禁止**打印 API Key

```typescript
// ✅ — 安全的 key 使用
const apiKey = getApiKey(provider); // 从 server/ai/ 获取
const response = await callAI({ apiKey });

// ❌ — 前端暴露 key
const apiKey = await fetchApiKey(); // 前端不应获取 key
```

---

## 三、API 安全

### 3.1 错误信息控制

**约束：** API 错误响应**禁止**暴露内部实现细节。

```typescript
// ✅ — 安全的错误响应
catch (e) {
  console.error("DB error:", e); // 服务端日志包含完整信息
  return jsonError("INTERNAL_ERROR", "操作失败，请重试", 500);
}

// ❌ — 泄露内部信息
catch (e) {
  return jsonError("INTERNAL_ERROR", e.message, 500); // 暴露 SQL 错误
}
```

**泄露信息对照表：**

| 禁止暴露 | 原因 |
|---------|------|
| SQL 错误消息 | 暴露表结构、字段名 |
| 文件路径 | 暴露服务器目录结构 |
| 堆栈跟踪 | 暴露代码结构 |
| 数据库版本 | 便于攻击者利用已知漏洞 |
| 内部 IP/端口 | 暴露网络拓扑 |

### 3.2 请求大小限制

**约束：**
- API 请求 body 最大 1MB
- 查询参数总长度 ≤ 2048 字符
- 文件上传（未来）单文件 ≤ 10MB

```typescript
// ✅ — 在 API 路由中检查
const contentLength = request.headers.get("content-length");
if (contentLength && parseInt(contentLength) > 1_000_000) {
  return jsonError("PAYLOAD_TOO_LARGE", "请求体超过 1MB 限制", 413);
}
```

### 3.3 HTTP 安全头

**约束：** `next.config.js` 中配置安全响应头：

```typescript
// next.config.ts
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];
```

---

## 四、数据隐私

### 4.1 数据分类

| 分类 | 数据示例 | 保护级别 | 措施 |
|------|---------|---------|------|
| 用户创作内容 | 小说文本、大纲、设定 | 高 | 本地存储，不上传 |
| 配置信息 | 书籍元数据、标签 | 中 | 本地存储，可导出 |
| 系统配置 | AI API Key | **机密** | 加密存储，禁止前端暴露 |
| 运行时数据 | 数据库文件 | 中 | 仅服务端访问 |

### 4.2 数据收集约束

**约束：**
- 项目**不收集**任何用户行为数据（analytics、telemetry）
- 项目**不向外部服务发送**用户创作内容（除非用户主动使用 AI 功能）
- AI 功能调用时，**仅发送**用户明确选择的文本内容
- **禁止** 隐式上传本地数据到任何第三方服务

### 4.3 数据备份

**约束：** 提供数据导出能力（未来功能），确保用户可随时备份。

| 数据 | 备份方式 | 频率建议 |
|------|---------|---------|
| SQLite 数据库 | 文件复制 | 每日 |
| AI 配置 | 导出为 JSON | 按需 |
| 创作内容 | 全库导出 | 每周 |

---

## 五、依赖安全

### 5.1 依赖审计

```bash
# 检查已知漏洞
npm audit

# 自动修复（仅修复非破坏性更新）
npm audit fix

# 严重漏洞需要手动评估
npm audit --audit-level=critical
```

**约束：**
- 每次 `npm install` 后检查 `npm audit` 输出
- Critical/High 级别漏洞必须在当前迭代修复
- Medium 级别漏洞在 3 个工作日内修复
- Low 级别漏洞记录在案，下次大版本更新时处理

### 5.2 依赖引入评估

**约束：** 新增第三方依赖前必须评估：

| 评估项 | 标准 | 不通过则 |
|--------|------|---------|
| npm 周下载量 | > 10,000 | 寻找替代方案 |
| 维护状态 | 最近 6 个月有更新 | 评估 fork 或自行实现 |
| 已知漏洞 | npm audit 无 Critical | 不引入 |
| Bundle 大小 | < 50KB gzip | 评估轻量替代 |
| 依赖链深度 | < 3 层 | 评估是否可简化 |

---

## 六、本地应用安全

### 6.1 服务端绑定

**约束：**
- 开发服务器仅绑定 `localhost`（默认行为）
- **禁止** `npm run dev -- --hostname 0.0.0.0` 暴露到局域网
- 生产部署时使用反向代理，不直接暴露 Node.js 进程

### 6.2 文件系统访问

**约束：**
- 服务端文件操作仅限 `data/` 目录
- **禁止** 通过 API 读写用户系统上的任意文件
- 用户上传的文件（未来）存放在 `data/uploads/` 并限制类型

### 6.3 SQLite 安全

**约束：**
- 使用 WAL 模式提高并发安全性（已在 `db.ts` 中配置）
- 外键约束必须启用（`PRAGMA foreign_keys = ON`）
- 定期备份数据库文件
- 数据库迁移必须在事务中执行

---

## 七、安全事件响应

### 7.1 安全事件分级

| 级别 | 定义 | 响应时间 | 示例 |
|------|------|---------|------|
| P0 | 数据泄露/远程代码执行 | 立即 | API Key 泄露到 Git |
| P1 | 权限提升/注入攻击 | 24 小时 | SQL 注入漏洞 |
| P2 | 信息泄露 | 3 个工作日 | 错误信息暴露内部路径 |
| P3 | 安全加固 | 下次迭代 | 缺少安全头 |

### 7.2 响应流程

```
发现 → 评估级别 → 修复 → 验证 → 记录
  ↓
P0/P1: 立即停止当前工作 → 修复 → 验证 → 提交修复
P2/P3: 记录到待办 → 当前迭代内修复
```

---

## 合规校验标准

| # | 校验项 | 自动化 | 手动 |
|---|--------|--------|------|
| S-1 | 无 SQL 字符串拼接 | ESLint 自定义规则 / Code Review | — |
| S-2 | 无 `dangerouslySetInnerHTML` 未净化 | ESLint `react/no-danger` | — |
| S-3 | `.gitignore` 包含 `.env`/`data/` | CI 检查 | — |
| S-4 | API 错误不暴露内部信息 | Code Review | — |
| S-5 | `npm audit` 无 Critical 漏洞 | CI 自动检查 | — |
| S-6 | 服务端仅绑定 localhost | — | 部署检查 |
| S-7 | API Key 不出现在前端代码 | 搜索 `api_key`/`apiKey` 在前端文件中 | — |
| S-8 | 日志中不打印敏感信息 | Code Review | — |
| S-9 | API body 有大小限制 | 代码检查 | — |
| S-10 | 安全响应头已配置 | Lighthouse Security 审计 | — |

## 违规整改方案

| 违规 | 级别 | 整改方式 | 时限 |
|------|------|---------|------|
| SQL 拼接 | P0 | 立即重构为参数化查询 | 立即 |
| API Key 泄露 | P0 | 轮换密钥 + 清除 Git 历史 + 更新 .gitignore | 立即 |
| 未净化 HTML 渲染 | P1 | 添加 DOMPurify 净化 | 当天 |
| API 暴露内部错误 | P2 | 统一错误格式，仅返回安全信息 | 当前迭代 |
| 缺失安全头 | P3 | 在 next.config.ts 中添加 | 下次迭代 |
| 依赖漏洞 | P1-P3 | 按级别在对应时限内修复 | 按级别 |
| 请求无大小限制 | P2 | 添加 content-length 检查 | 当前迭代 |
