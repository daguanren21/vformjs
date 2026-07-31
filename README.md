# vformjs

[English](./README.md) | [简体中文](./README.zh-CN.md)

Form **state + validation** for Vue 2.7 / Vue 3.  
UI is a thin adapter (Element Plus / element-ui built-in; others via `defineAdapter`).

## Install

```bash
pnpm add @vformjs/element-plus element-plus vue     # Vue 3
# pnpm add @vformjs/element-ui element-ui vue@^2.7 # Vue 2.7
```

| Package | Role |
|---------|------|
| `@vformjs/element-plus` | Vue 3 + Element Plus — start here |
| `@vformjs/element-ui` | Vue 2.7 + element-ui |
| `@vformjs/vue` | `useForm` / `defineAdapter` for custom UI |
| `@vformjs/zod` | Zod schema bridge |
| `@vformjs/core` | Headless engine (transitive) |

## Quick start

```ts
import { useElForm, r } from '@vformjs/element-plus'

const form = useElForm({
  defaults: { name: '', email: '' },
  rules: {
    name: [r.required(), r.min(2)],
    email: [r.required(), r.email()],
  },
  onSubmit: async (values) => api.save(values),
})
```

```vue
<template>
  <el-form v-bind="form.el" label-width="100px">
    <el-form-item label="Name" prop="name">
      <el-input v-model="form.model.name" />
    </el-form-item>
    <el-form-item label="Email" prop="email">
      <el-input v-model="form.model.email" />
    </el-form-item>
    <el-button type="primary" :loading="form.submitting" @click="form.submit()">
      Submit
    </el-button>
  </el-form>
</template>
```

`form.el` is `{ ref, model, rules }`. `defaults` infers types for `model` / `onSubmit(values)`.

## What you get

- **Modes** — `form.load('create' | 'edit' | 'detail', values?)` in the dialog/page, not the list
- **Rules** — `r.required()`, email, min/max, pattern, custom; or a function of values
- **when / whenRules** — show/hide and conditional rules
- **linkage** — react when other fields change
- **list / fieldArray** — dynamic rows with stable keys
- **Zod** — `useZodForm({ schema, defaults })` from `@vformjs/element-plus/zod`
- **Adapters** — swap UI without rewriting form logic

## Docs

| Doc | Content |
|-----|---------|
| **[guide.md](./docs/guide.md)** | Install → everyday use (modes, rules, arrays, Zod, adapter) |
| **[api.md](./docs/api.md)** | Options, return types, `r.*`, linkage, adapters |

## Local

```bash
pnpm install
pnpm test
pnpm dev:vue3    # Element Plus playground
pnpm dev:vue2
pnpm dev:naive
pnpm dev:antd
```

## License

[MIT](./LICENSE)
