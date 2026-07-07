# Automated Validation & CI/CD Standards

## 适用场景

本规范定义 AI Writer 项目的自动化校验体系、CI/CD 流水线配置、规范落地的自动化检测机制。确保所有规范条目可通过自动化手段验证，实现"规范即代码"。

---

## 一、验证层级体系

### 1.1 三级验证

```
Level 1: 本地验证（开发者提交前）
         ├── typecheck（类型安全）
         ├── lint（代码规范）
         └── build（构建验证）
              ↓
Level 2: CI 验证（PR 自动触发）
         ├── Level 1 全部检查
         ├── 安全扫描
         ├── 依赖审计
         └── 规范合规检查
              ↓
Level 3: 发布验证（合并到 master 后）
         ├── Level 2 全部检查
         ├── 生产构建
         └── 部署预检
```

### 1.2 验证门禁

| 门禁 | 阻断级别 | 说明 |
|------|---------|------|
| typecheck 失败 | **阻断合并** | 零错误，无例外 |
| lint 错误 | **阻断合并** | 零错误 |
| build 失败 | **阻断合并** | 生产构建必须通过 |
| 安全漏洞 (Critical) | **阻断合并** | 必须修复后合并 |
| 安全漏洞 (High) | **阻断合并** | 必须修复后合并 |
| lint 警告 | 不阻断 | 记录，建议修复 |

---

## 二、本地验证脚本

### 2.1 标准验证命令

```bash
# 完整验证（提交前必须执行）
npm run typecheck && npm run lint && npm run build

# 快速验证（开发过程中）
npm run typecheck  # 类型检查（最快）
npm run lint       # 代码规范

# 单独构建验证
npm run build
```

### 2.2 package.json 脚本定义

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "next lint",
    "build": "next build",
    "validate": "npm run typecheck && npm run lint && npm run build",
    "lint:fix": "next lint --fix"
  }
}
```

### 2.3 Git Pre-commit Hook

**约束：** 使用 `husky` + `lint-staged` 在提交前自动运行检查：

```bash
# 安装（一次性）
npm install -D husky lint-staged
npx husky init
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "tsc --noEmit --incremental"],
    "*.{css}": ["stylelint --fix"]
  }
}
```

```bash
# .husky/pre-commit
npm run lint-staged
```

**约束：**
- pre-commit hook 运行 lint-staged
- 仅检查暂存文件（高效）
- 检查失败则阻止提交
- **禁止** `git commit --no-verify` 绕过检查

---

## 三、CI/CD 流水线

### 3.1 GitHub Actions 配置

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [master]
  push:
    branches: [master]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
          cache: "npm"

      - run: npm ci

      - name: Type Check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

  security:
    runs-on: ubuntu-latest
    needs: validate
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
          cache: "npm"

      - run: npm ci

      - name: Dependency Audit
        run: npm audit --audit-level=high

      - name: Check Sensitive Files
        run: |
          # 检查是否有 .env 文件被提交
          if git ls-files | grep -E '\.env$|\.env\.' | grep -v '\.env\.example'; then
            echo "ERROR: .env files found in repository"
            exit 1
          fi

      - name: Check data/ Directory
        run: |
          if git ls-files | grep -E '^data/'; then
            echo "ERROR: data/ directory files found in repository"
            exit 1
          fi
```

### 3.2 CI 流水线阶段

```
PR 提交 → Validate (typecheck + lint + build)
                ↓
          Security (audit + 敏感文件检查)
                ↓
          通过 → 允许合并
          失败 → 阻止合并，通知开发者
```

### 3.3 PR 自动检查清单

CI 通过后，PR 中自动附带以下信息：

| 检查项 | 展示方式 |
|--------|---------|
| typecheck 结果 | Pass / Fail |
| lint 结果 | Pass / Fail + warnings 数量 |
| build 结果 | Pass / Fail |
| 安全审计 | Critical / High / Medium / Low 数量 |
| Bundle 大小变化 | 增减百分比（未来） |
| 测试覆盖率 | 覆盖率百分比（未来） |

---

## 四、规范自动化校验

### 4.1 架构依赖方向校验

```bash
# 自定义脚本：检查 import 方向违规
# scripts/check-architecture.js

const fs = require("fs");
const path = require("path");
const glob = require("glob");

const rules = [
  { from: "shared/", to: "app/", message: "shared/ 不得导入 app/" },
  { from: "shared/", to: "server/", message: "shared/ 不得导入 server/" },
  { from: "server/", to: "app/", message: "server/ 不得导入 app/" },
];

function checkImports() {
  const violations = [];
  const files = glob.sync("{app,server,shared}/**/*.{ts,tsx}");

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const imports = content.match(/from\s+["']([^"']+)["']/g) || [];

    for (const imp of imports) {
      const path = imp.match(/from\s+["']([^"']+)["']/)[1];
      for (const rule of rules) {
        if (file.startsWith(rule.from) && path.startsWith(rule.to)) {
          violations.push({ file, import: path, message: rule.message });
        }
      }
    }
  }

  return violations;
}
```

### 4.2 CSS 硬编码颜色检测

```bash
# 检查 CSS Modules 文件中的硬编码颜色
# scripts/check-css-colors.js

const forbidden = /#[0-9a-fA-F]{3,8}\b|rgba?\(\d|hsla?\(\d/g;

function checkCssFiles(files) {
  const violations = [];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const matches = content.match(forbidden);
    if (matches) {
      violations.push({ file, colors: matches });
    }
  }
  return violations;
}
```

### 4.3 安全规则检测

```bash
# scripts/check-security.js

const checks = [
  {
    name: "SQL string concatenation",
    pattern: /db\.prepare\(`[^`]*\$\{/g,
    level: "critical",
  },
  {
    name: "dangerouslySetInnerHTML without DOMPurify",
    pattern: /dangerouslySetInnerHTML(?![\s\S]*DOMPurify)/g,
    level: "high",
  },
  {
    name: "console.log with sensitive data",
    pattern: /console\.log\([^)]*(?:password|apiKey|secret|token)/gi,
    level: "medium",
  },
];
```

### 4.4 规范合规仪表板

**约束：** 所有自动化校验脚本的输出汇总为规范合规报告：

```bash
# scripts/validate-all.js
async function validateAll() {
  const results = {
    architecture: checkArchitecture(),
    css: checkCssFiles(),
    security: checkSecurity(),
    imports: checkImports(),
  };

  // 生成报告
  const report = generateReport(results);
  console.log(report);

  // 有 critical 级别违规则失败
  if (results.security.some(r => r.level === "critical")) {
    process.exit(1);
  }
}
```

---

## 五、代码质量门禁

### 5.1 ESLint 规则集

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "eslint:recommended",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "no-any": "error",
    "no-console": ["warn", { "allow": ["error", "warn"] }],
    "react-hooks/exhaustive-deps": "warn",
    "react/no-danger": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
}
```

### 5.2 TypeScript 严格配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": false
  }
}
```

### 5.3 构建分析

```bash
# Bundle 大小检查
# 在 CI 中比较当前构建与基准构建的 JS 大小
npm run build
# 分析 .next/static/ 目录中的文件大小
```

---

## 六、自动化测试（规划）

### 6.1 测试分层策略

| 层级 | 工具 | 覆盖范围 | 优先级 |
|------|------|---------|--------|
| 单元测试 | Vitest | Store 函数、工具函数、纯逻辑 | P1 |
| 组件测试 | Vitest + Testing Library | 共享 UI 组件 | P2 |
| 集成测试 | Vitest | API 路由 + Store | P2 |
| E2E 测试 | Playwright | 关键用户流程 | P3 |

### 6.2 测试覆盖目标

| 覆盖范围 | 当前 | 目标 |
|---------|------|------|
| Store 函数 | 0% | > 80% |
| 工具函数 | 0% | > 90% |
| API 路由 | 0% | > 60% |
| 共享 UI 组件 | 0% | > 70% |

### 6.3 测试文件组织

```
server/storage/__tests__/    → Store 单元测试
shared/utils/__tests__/      → 工具函数测试
shared/ui/__tests__/         → 组件测试
app/api/__tests__/           → API 集成测试
```

### 6.4 测试命名规范

```typescript
// 文件命名：{module}.test.ts
book-store.test.ts

// 测试描述：describe + it 层级
describe("createBook", () => {
  it("should create a book with valid data", () => { ... });
  it("should throw on missing title", () => { ... });
});
```

---

## 七、规范迭代更新机制

### 7.1 规范版本管理

| 规则 | 说明 |
|------|------|
| 规范随代码迭代 | 每次重大变更同步更新规范 |
| PR 规范变更 | 规范修改需在 PR 中说明原因 |
| 规范审查 | 每季度审查所有规范的有效性 |
| 废弃规范标记 | 废弃条目标记 `[DEPRECATED]` 而非删除 |

### 7.2 规范更新流程

```
1. 发现规范不适用 / 缺失 / 冲突
         ↓
2. 提出修改方案（PR 形式）
         ↓
3. Review 规范变更的合理性
         ↓
4. 合并变更，同步更新受影响的规范文件
         ↓
5. 通知团队（如有团队协作）
```

### 7.3 规范文档命名与组织

```
docs/
├── README.md           → 规范索引入口
├── architecture.md     → 架构规范
├── api.md              → API 规范
├── coding.md           → 编码规范
├── visual.md           → 视觉规范
├── components.md       → 组件规范
├── utils.md            → 工具规范
├── workflow.md         → 工作流规范
├── engineering.md      → 工程化规范
├── performance.md      → 性能规范
├── security.md         → 安全规范
├── ai-development.md   → AI 开发规范
├── environments.md     → 环境管理规范
├── validation.md       → 校验与 CI/CD 规范
└── plans/              → 设计与重构计划
```

---

## 合规校验标准

| # | 校验项 | 自动化 | 手动 |
|---|--------|--------|------|
| V-1 | CI 流水线配置正确 | GitHub Actions 配置检查 | — |
| V-2 | pre-commit hook 已安装 | `test -f .husky/pre-commit` | — |
| V-3 | lint-staged 配置存在 | package.json 检查 | — |
| V-4 | npm audit 无 High/Critical | CI 自动检查 | — |
| V-5 | 敏感文件未提交 | CI 脚本检查 | — |
| V-6 | 构建分析通过 | CI 构建 | — |
| V-7 | 规范文档索引与实际文件同步 | 脚本检查 | 月度审查 |
| V-8 | .nvmrc 文件存在 | CI 检查 | — |

## 违规整改方案

| 违规 | 整改方式 | 时限 |
|------|---------|------|
| CI 流水线失败 | 修复导致失败的代码，不可绕过 | 立即 |
| pre-commit hook 被绕过 | 检查原因，修复 hook 配置 | 当天 |
| 依赖有 High/Critical 漏洞 | `npm audit fix` 或手动升级 | 当前迭代 |
| 敏感文件被提交 | 立即从 Git 移除 + 轮换泄露密钥 | 立即 |
| 规范文档过期 | 更新文档，PR 合并 | 3 个工作日内 |
| 测试覆盖率不足 | 补充测试用例 | 当前迭代 |