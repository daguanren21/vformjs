# 发布

## 包

| 包 | npm | 用户装 |
|----|-----|--------|
| `@veform/element-plus` | ✅ | 是 |
| `@veform/element-ui` | ✅ | 是 |
| `@veform/vue` | ✅ | 换 UI |
| `@veform/zod` | ✅ | Zod |
| `@veform/core` | ✅ | 传递依赖 |
| shared · schema · playgrounds | ❌ | — |

## npm：OIDC Trusted Publishing

`release.yml` 使用 OIDC，**不**使用 `NPM_TOKEN`。

### 首次

```bash
npm login
pnpm ci
pnpm changeset
pnpm version-packages
pnpm release
```

然后在每个包的 npm 设置里绑定 Trusted Publisher：workflow = `release.yml`。

### 日常

```bash
pnpm changeset
# merge main → CI + Release
```

## Changesets

fixed：`core` · `vue` · `zod` · `element-plus` · `element-ui`

## 其它

- Playground 部署：Vercel Git 集成 → [vercel.md](./vercel.md)
- 质量门禁：`pnpm ci` / `.github/workflows/ci.yml`
