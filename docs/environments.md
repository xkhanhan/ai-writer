# Environment Management Standards

## 适用场景

本规范适用于 AI Writer 项目的开发环境配置、多环境一致性管控、功能开关管理及环境间差异处理。确保从本地开发到生产部署的全链路环境可控。

---

## 一、环境定义

### 1.1 环境矩阵

| 环境 | 用途 | 数据库 | 访问方式 | 部署方式 |
|------|------|--------|---------|---------|
| `development` | 本地开发 | `data/novel-writer.db` | `localhost:3000` | `npm run dev` |
| `production` | 生产使用 | `data/novel-writer.db` | 本地/部署地址 | `npm run build && npm start` |

**说明：** 当前项目为本地单用户应用，暂无 staging/test 环境。后续如需部署到服务器，新增：

| 环境 | 用途 | 数据库 | 访问方式 |
|------|------|--------|---------|
| `staging` | 预发布验证 | 独立 SQLite / 共享 DB 只读副本 | 内网地址 |

### 1.2 环境标识

```typescript
// 通过 Next.js 内置变量区分环境
const isDev = process.env.NODE_ENV === "development";
const isProd = process.env.NODE_ENV === "production";
```

**约束：**
- **禁止** 在代码中硬编码环境判断（如 `port === 3000`）
- **禁止** 使用 `window.location.hostname` 判断环境
- 使用 `NODE_ENV` 或显式环境变量

---

## 二、环境变量管理

### 2.1 环境变量分类

| 类别 | 前缀 | 示例 | 提交 Git |
|------|------|------|---------|
| 公开变量 | `NEXT_PUBLIC_` | `NEXT_PUBLIC_APP_NAME` | 允许 |
| 服务端变量 | 无前缀 | `DATABASE_PATH` | 禁止 |
| AI 配置 | `AI_` | `AI_API_KEY` | 禁止 |

### 2.2 环境变量文件

```
.env.example     → 模板文件（提交到 Git，值为空或示例）
.env.local       → 本地覆盖（不提交到 Git）
.env.development → 开发环境专用（不提交到 Git）
.env.production  → 生产环境专用（不提交到 Git）
```

**约束：**
- `.env.example` 必须与实际使用的环境变量同步
- 删除环境变量时，同步更新 `.env.example`
- 新增环境变量时，同步更新 `.env.example`（值留空）

### 2.3 环境变量访问

```typescript
// ✅ — 服务端 API 路由中访问
const apiKey = process.env.AI_API_KEY;

// ✅ — 前端仅访问 NEXT_PUBLIC_ 变量
const appName = process.env.NEXT_PUBLIC_APP_NAME;

// ❌ — 前端访问服务端变量
const apiKey = process.env.AI_API_KEY; // undefined 在客户端
```

### 2.4 变量校验

```typescript
// server/env.ts — 服务端环境变量校验
const requiredServerEnv = ["DATABASE_PATH"] as const;

function validateServerEnv() {
  for (const key of requiredServerEnv) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}
```

**约束：** 服务端启动时必须校验必需的环境变量，缺失时给出明确错误信息。

---

## 三、功能开关（Feature Flags）

### 3.1 开关定义

功能开关用于控制新功能的可见性，支持按环境逐步发布。

```typescript
// shared/types/feature-flags.ts
type FeatureFlag =
  | "ai-chat"           // AI 聊天功能
  | "rich-editor"       // 富文本编辑器
  | "tag-drag-sort"     // 标签拖拽排序
  | "export";           // 数据导出功能

// server/feature-flags.ts
const featureFlags: Record<FeatureFlag, { enabled: boolean; env: string[] }> = {
  "ai-chat": { enabled: true, env: ["development", "production"] },
  "rich-editor": { enabled: false, env: ["development"] },
  "tag-drag-sort": { enabled: false, env: [] },
  "export": { enabled: true, env: ["development", "production"] },
};

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const config = featureFlags[flag];
  if (!config?.enabled) return false;
  return config.env.includes(process.env.NODE_ENV ?? "development");
}
```

### 3.2 开关使用规则

| 规则 | 说明 |
|------|------|
| 开关必须有文档 | 记录功能名称、目的、预计移除时间 |
| 开关必须可清理 | 功能稳定后移除开关，直接启用 |
| 开关数量上限 | 同时活跃的功能开关 ≤ 10 个 |
| 开关不替代分支 | 功能未完成仍需使用 Git 分支隔离 |

### 3.3 开关生命周期

```
开发阶段 → 开关关闭，仅在 development 启用
     ↓
测试阶段 → 开关开启，staging 环境验证
     ↓
发布阶段 → 开关开启，production 灰度
     ↓
稳定阶段 → 移除开关代码，功能永久启用
```

---

## 四、数据库环境一致性

### 4.1 本地开发数据库

**约束：**
- 开发数据库位于 `data/novel-writer.db`
- `data/` 目录在 `.gitignore` 中，不提交到 Git
- 开发数据库可包含测试数据
- 首次运行自动创建数据库和表结构

### 4.2 数据库迁移跨环境

**约束：**

| 规则 | 说明 |
|------|------|
| 迁移幂等 | 同一迁移多次执行不报错 |
| 迁移有序 | 按版本号顺序执行，不可跳过 |
| 迁移可回滚 | 重要迁移提供回滚方案 |
| 迁移前备份 | 生产环境迁移前必须备份数据库 |

```typescript
// 迁移执行顺序 — 在 db.ts 中注册
const migrations = [
  migrateV1,  // 初始表结构
  migrateV2,  // 添加 columns
  migrateV3,  // 添加索引
  migrateV4,  // 标签库表
  migrateV5,  // 设定库表
  // 新迁移追加到末尾
];
```

### 4.3 测试数据管理

**约束：**
- 开发环境可使用测试数据，但测试数据不应包含真实用户内容
- 提供种子数据脚本（未来）用于初始化开发环境
- 测试数据脚本幂等（重复执行不产生重复数据）

---

## 五、构建与部署环境

### 5.1 Node.js 版本

**约束：**
- 项目要求 Node.js >= 18（Next.js 16 要求）
- 使用 `.nvmrc` 或 `.node-version` 锁定版本
- CI 环境使用与开发环境相同的 Node.js 版本

```
# .nvmrc
18
```

### 5.2 npm 版本

**约束：**
- 仅使用 npm（禁止 yarn/pnpm 混用）
- `package-lock.json` 必须提交
- CI 环境使用 `npm ci`（精确安装 lock 文件中的版本）

### 5.3 构建环境一致性

| 项目 | 本地开发 | 生产构建 | CI |
|------|---------|---------|-----|
| NODE_ENV | development | production | production |
| Next.js | Turbopack | Webpack | Webpack |
| TypeScript | strict | strict | strict |
| ESLint | 规则集 | 规则集 | 规则集 |

**约束：** CI 构建必须使用与生产相同的构建配置，确保构建结果一致。

### 5.4 本地开发启动

```bash
# 标准启动流程
npm install          # 安装依赖
cp .env.example .env # 初始化环境变量（如需要）
npm run dev          # 启动开发服务器

# 验证环境
npm run typecheck    # 类型检查
npm run lint         # 代码规范
npm run build        # 生产构建
```

---

## 六、平台差异处理

### 6.1 操作系统差异

AI Writer 项目支持 Windows/macOS/Linux 开发。需注意的差异：

| 差异项 | 处理方式 |
|--------|---------|
| 路径分隔符 | 使用 `/`（Node.js 和 Next.js 自动处理） |
| 换行符 | 统一使用 LF（`.editorconfig` 配置） |
| 文件名大小写 | 统一使用 kebab-case 小写 |
| SQLite 文件锁 | WAL 模式处理跨平台并发 |

### 6.2 `.editorconfig`

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

### 6.3 浏览器兼容性

**约束：**
- 主要支持 Chrome/Edge（>= 100）、Firefox（>= 100）、Safari（>= 16）
- **不支持** IE（已停止维护）
- 使用 `browserslist` 定义目标浏览器范围

```json
// package.json
"browserslist": ["> 1%", "not dead", "not ie 11"]
```

---

## 七、环境监控

### 7.1 开发环境健康检查

| 检查项 | 频率 | 方式 |
|--------|------|------|
| Node.js 版本 | 每次 clone | `.nvmrc` + `nvm use` |
| 依赖完整性 | 每次 install | `npm ls --depth=0` |
| TypeScript 编译 | 每次提交 | `npm run typecheck` |
| ESLint | 每次提交 | `npm run lint` |
| 生产构建 | 每次提交 | `npm run build` |

### 7.2 环境问题排查

| 问题 | 排查步骤 |
|------|---------|
| `npm install` 失败 | 清除 `node_modules` + `package-lock.json` → 重新 install |
| `npm run dev` 启动失败 | 检查端口占用 → 检查 Node.js 版本 |
| 类型错误突然出现 | 检查 `tsconfig.json` 变更 → 检查依赖版本 |
| 样式不生效 | 检查 CSS 变量 → 检查 CSS Modules 导入 |
| 数据库错误 | 检查 `data/` 目录权限 → 检查迁移版本 |

---

## 合规校验标准

| # | 校验项 | 自动化 | 手动 |
|---|--------|--------|------|
| ENV-1 | `.env.example` 与实际环境变量同步 | CI 检查脚本 | — |
| ENV-2 | `.gitignore` 包含 `.env*` 和 `data/` | CI 检查 | — |
| ENV-3 | `.nvmrc` 文件存在且版本正确 | CI 检查 | — |
| ENV-4 | 代码中无硬编码环境判断 | Code Review | — |
| ENV-5 | 功能开关有文档记录 | Code Review | — |
| ENV-6 | CI 使用 `npm ci` 安装依赖 | CI 配置检查 | — |
| ENV-7 | 构建环境与生产一致 | CI 构建验证 | — |
| ENV-8 | `.editorconfig` 存在 | 项目检查 | — |

## 违规整改方案

| 违规 | 整改方式 | 时限 |
|------|---------|------|
| .env 文件提交到 Git | 立即从 Git 移除 + 轮换其中的密钥 | 立即 |
| 代码硬编码环境判断 | 重构为 `NODE_ENV` 或环境变量判断 | 当前迭代 |
| .env.example 不同步 | 补充缺失的变量 / 移除已删除的变量 | 当前迭代 |
| 功能开关无文档 | 添加开关文档记录 | 3 个工作日内 |
| CI 不使用 npm ci | 修改 CI 配置 | 下次 CI 变更时 |
| Node.js 版本不一致 | 统一 .nvmrc + CI 配置 | 下次迭代 |
