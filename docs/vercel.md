# Playground → Vercel

| Playground | 目录 |
|------------|------|
| Element Plus | `playgrounds/vue3-element-plus` |
| element-ui | `playgrounds/vue2-element-ui` |

目录内 `vercel.json`：monorepo 根 `pnpm install` + filter build → `dist`。

## GitHub Actions（推荐）

Workflow：`.github/workflows/vercel-playgrounds.yml`  

Secrets：`VERCEL_TOKEN`、`VERCEL_ORG_ID`、`VERCEL_PROJECT_ID_ELEMENT_PLUS`、`VERCEL_PROJECT_ID_ELEMENT_UI`。

详见 [ci.md](./ci.md)。

## 控制台双项目

同一仓库 Import 两次，Root Directory 分别指上表两目录；勾选 include files outside root。

## 本地

```bash
pnpm build:play:vue3
pnpm build:play:vue2
```
