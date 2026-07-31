# CI / CD

| Workflow | 触发 | 内容 |
|----------|------|------|
| **CI** | PR / `main` | lint → **Vitest** → build → playground build |
| **Release** | `main` | quality 同上 → **changesets**（Version PR / **OIDC publish**） |
| **Vercel** | PR / `main` | Element Plus + element-ui playground |

```bash
pnpm ci   # 本地对齐：lint + vitest + build + playgrounds
```

测试：`vitest`（`vitest.config.ts`，`packages/*/test/**/*.test.ts`）。

## npm 发布（OIDC）

- Workflow：`release.yml`，`id-token: write`，**无 `NPM_TOKEN`**
- **首次**：本地 `npm login` → `changeset publish` → 到 npm 各包配置 Trusted Publisher（workflow：`release.yml`）
- 之后：CI 自动 OIDC + provenance

详见 [publish.md](./publish.md)。

## Vercel Secrets

`VERCEL_TOKEN` · `VERCEL_ORG_ID` · `VERCEL_PROJECT_ID_ELEMENT_PLUS` · `VERCEL_PROJECT_ID_ELEMENT_UI`
