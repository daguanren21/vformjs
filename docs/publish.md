# 发布

## 包

| 包 | npm | 用户装 |
|----|-----|--------|
| `@veform/element-plus` | ✅ | 是 |
| `@veform/element-ui` | ✅ | 是 |
| `@veform/vue` | ✅ | 换 UI |
| `@veform/zod` | ✅ | Zod |
| `@veform/core` | ✅ | 传递依赖 |
| `@veform/shared` · `schema` · playgrounds | ❌ | — |

## 鉴权：OIDC Trusted Publishing（CI）

Release workflow（`.github/workflows/release.yml`）使用 **npm Trusted Publishing + OIDC**。

- `permissions.id-token: write`
- **不**配置 `NPM_TOKEN` / `NODE_AUTH_TOKEN`
- `NPM_CONFIG_PROVENANCE=true`

### 首次发布（你本地做）

Trusted Publisher 只能绑**已存在**的包。第一次要把包推上 registry：

```bash
# 1. 登录（有权限创建 @veform org / 包）
npm login

# 2. 可选：先建 org `veform`（npm 网页）

# 3. 本地质量门禁
pnpm ci

# 4. 有 changeset 后打版本
pnpm changeset
pnpm version-packages

# 5. 构建并发布（access public 已在包 publishConfig）
pnpm build
pnpm exec changeset publish
# 或：pnpm release
```

### 然后在 npm 配 Trust（每个要发的包）

对 **`@veform/core` · `vue` · `zod` · `element-plus` · `element-ui`** 分别：

1. 打开 `https://www.npmjs.com/package/<name>/access`（或 Package Settings → **Trusted Publisher**）
2. 添加 GitHub Actions publisher：
   - **Organization / user**：你的 GitHub 用户或 org  
   - **Repository**：本仓库名  
   - **Workflow filename**：`release.yml`（仅文件名，不要路径）  
   - **Environment**：留空（workflow 未使用 environment）
3. 保存

之后 `main` 上 Changesets 的 publish 步骤走 OIDC，无需 token。

### 日常

```bash
pnpm changeset
# PR → main
# CI: lint + vitest + build
# Release: quality 通过 → Version PR 或 OIDC publish
```

## Changesets

fixed 同版本：`core` · `vue` · `zod` · `element-plus` · `element-ui`

## CI 一览

| Workflow | 作用 |
|----------|------|
| `ci.yml` | lint · Vitest · build · playground build |
| `release.yml` | quality → changesets（OIDC publish） |
| `vercel-playgrounds.yml` | 两 playground 部署 |
