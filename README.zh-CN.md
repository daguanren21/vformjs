# vformjs

[English](./README.md) | [简体中文](./README.zh-CN.md)

Vue 2.7 / Vue 3 的 **表单状态 + 校验** 层。  
UI 通过 adapter 接入：官方 Element Plus / element-ui，其它库用 `defineAdapter`。

```bash
pnpm add @vformjs/element-plus element-plus vue   # Vue 3
# pnpm add @vformjs/element-ui element-ui vue@^2.7
```

## 为什么用

| 痛点 | vformjs |
|------|---------|
| 宿主表单只管校验，没有统一状态机 | `useElForm` / `useForm` 管 model、rules、submit、模式 |
| 新增 / 编辑 / 详情逻辑复制粘贴 | 一份 form：`form.load('create' \| 'edit' \| 'detail', values?)` |
| 换 UI 库等于重写表单层 | core 无头；adapter 只是薄宿主桥 |
| Zod 与 Element rules 双写 | `@vformjs/zod` / `useZodForm` |

## 包

| 包 | 作用 | 用户装？ |
|----|------|----------|
| [`@vformjs/element-plus`](https://www.npmjs.com/package/@vformjs/element-plus) | Vue 3 + Element Plus（`useElForm`） | **是** |
| [`@vformjs/element-ui`](https://www.npmjs.com/package/@vformjs/element-ui) | Vue 2.7 + element-ui（`useElForm`） | **是** |
| [`@vformjs/vue`](https://www.npmjs.com/package/@vformjs/vue) | `useForm`、`defineAdapter`、`r` | 换 UI |
| [`@vformjs/zod`](https://www.npmjs.com/package/@vformjs/zod) | Zod → rules + 解析后 submit | 用 Zod |
| [`@vformjs/core`](https://www.npmjs.com/package/@vformjs/core) | 无头引擎 | 传递依赖 |

## 快速开始（Element Plus）

```ts
import { useElForm, r } from '@vformjs/element-plus'

const form = useElForm({
  defaults: { name: '', email: '' },
  rules: {
    name: [r.required(), r.min(2)],
    email: [r.required(), r.email()],
  },
  onSubmit: async (values) => {
    await api.save(values)
  },
})
```

```vue
<template>
  <el-form v-bind="form.el" label-width="100px">
    <el-form-item label="姓名" prop="name">
      <el-input v-model="form.model.name" />
    </el-form-item>
    <el-form-item label="邮箱" prop="email">
      <el-input v-model="form.model.email" />
    </el-form-item>
    <el-button type="primary" :loading="form.submitting" @click="form.submit()">
      提交
    </el-button>
    <el-button @click="form.reset()">重置</el-button>
  </el-form>
</template>
```

`form.el` 即 `{ ref, model, rules }`，一次 `v-bind="form.el"` 即可。

## 模式：新增 / 编辑 / 详情

form **放在弹窗或表单页内部**，列表页永远不要 `useForm`。

```ts
form.load('create')
form.load('edit', detail)
form.load('detail', detail)

form.mode      // 'create' | 'edit' | 'detail'
form.editable  // create | edit
form.readonly  // detail
```

```vue
<el-form v-if="form.editable" v-bind="form.el">...</el-form>
<el-descriptions v-else-if="form.readonly" border>
  <el-descriptions-item label="姓名">{{ form.model.name }}</el-descriptions-item>
</el-descriptions>
```

详情用 **Descriptions / 纯文本**，不要 `:disabled` 表单。  
→ [docs/use-form-modes.md](./docs/use-form-modes.md)

## Zod

```ts
import { z } from 'zod'
import { useZodForm } from '@vformjs/element-plus/zod'
// 或: import { useZodForm } from '@vformjs/element-plus'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
})

const form = useZodForm({
  schema,
  defaults: { name: '', email: '' },
  onSubmit: async (values) => {
    // values 为 Zod output
    await api.save(values)
  },
})
```

## 自定义 UI（Naive / Ant Design Vue / …）

```ts
import { defineAdapter, useForm, r } from '@vformjs/vue'

const createMyAdapter = defineAdapter({
  name: 'my-ui',
  async validate(host, { paths }) {
    await host.validate(/* 可选 paths */)
  },
  clearValidate(host) {
    host.restoreValidation?.()
  },
})

const form = useForm({
  defaultValues: { name: '' },
  rules: { name: [r.required()] },
  adapter: createMyAdapter(),
  onSubmit: async (values) => api.save(values),
})
```

可运行参考：

| UI | 命令 / 路径 |
|----|-------------|
| Naive UI | `pnpm dev:naive` · `playgrounds/vue3-naive-ui` |
| Ant Design Vue | `pnpm dev:antd` · `playgrounds/vue3-antd-vue` |

→ [docs/custom-adapter.md](./docs/custom-adapter.md) · [docs/ecosystem-adapters.md](./docs/ecosystem-adapters.md)

## 能力

- **响应式 model** — 与 Element `:model` 同一对象身份
- **Rules** — 静态 map、values 函数，或 Zod
- **条件显隐 / 条件规则** — `when`、`whenRules`
- **联动** — 字段变化时声明式 set/clear
- **数组字段** — `form.list('items')` / `fieldArray`，稳定 key
- **宿主桥** — adapter 负责 validate / clear / scroll
- **Submit 约定** — `{ ok, values }` 或 `{ ok: false, errors }`

## 本地开发

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build

pnpm dev:vue3    # Element Plus playground  :5283
pnpm dev:vue2    # element-ui playground
pnpm dev:naive   # Naive UI
pnpm dev:antd    # Ant Design Vue
```

Monorepo：**pnpm** + **turbo** + **changesets**。  
发包走 CI + npm Trusted Publishing（OIDC）— [docs/publish.md](./docs/publish.md)。

## 文档

| 文档 | 内容 |
|------|------|
| [use-form-modes.md](./docs/use-form-modes.md) | 新增 / 编辑 / 详情归属 |
| [scenarios.md](./docs/scenarios.md) | 联动、数组、服务端错误 |
| [custom-adapter.md](./docs/custom-adapter.md) | `defineAdapter` |
| [ecosystem-adapters.md](./docs/ecosystem-adapters.md) | 其它 UI 库评估 |
| [publish.md](./docs/publish.md) | 发布 / OIDC |
| [ci.md](./docs/ci.md) | 质量门禁 |

## License

[MIT](./LICENSE)
