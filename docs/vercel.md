# Playground → Vercel（Git 集成）

两个 Vercel 项目，**GitHub 连同一仓库**，靠 Root Directory 区分：

| 项目 | Root Directory | 生产域名 |
|------|----------------|----------|
| `veform-element-plus` | `playgrounds/vue3-element-plus` | https://veform-element-plus.vercel.app |
| `veform-element-ui` | `playgrounds/vue2-element-ui` | https://veform-element-ui.vercel.app |

目录内 `vercel.json`：从 monorepo 根 `pnpm install`，再 filter 构建当前 playground。

## 行为

- push / PR 到 `main` → Vercel 自动构建部署（无需 GitHub Secrets、无 Actions 部署 job）
- 不需要 `VERCEL_TOKEN` / project id

## 本地预览生产包

```bash
pnpm build:play:vue3
pnpm build:play:vue2
```
