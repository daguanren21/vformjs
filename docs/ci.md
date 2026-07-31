# CI / CD

| Workflow | 触发 | 内容 |
|----------|------|------|
| **CI** | PR / `main` | lint → Vitest → build → playground build（仅校验，不部署） |
| **Release** | `main` | quality → changesets（Version PR / OIDC publish） |
| **Vercel** | Git 集成 | 两个 playground 自动部署（不在 Actions 里） |

```bash
pnpm ci
```

测试：`vitest`（`packages/*/test/**/*.test.ts`）。

## npm（OIDC）

- `release.yml`：`id-token: write`，无 `NPM_TOKEN`
- 首次：本地 `npm login` 发布 → npm 配 Trusted Publisher（`release.yml`）

## Playground 部署

见 [vercel.md](./vercel.md)。Vercel 控制台 Git 集成，**不要**再配 Vercel 相关 GitHub Secrets。
