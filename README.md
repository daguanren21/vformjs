# vformjs

[English](./README.md) | [简体中文](./README.zh-CN.md)

Headless form **state + validation** for Vue 2.7 / Vue 3.  
UI is plugged in via adapters — Element Plus / element-ui officially, anything else with `defineAdapter`.

```bash
pnpm add @vformjs/element-plus element-plus vue   # Vue 3
# pnpm add @vformjs/element-ui element-ui vue@^2.7
```

## Why

| Pain | vformjs |
|------|---------|
| Host form only validates, no shared state machine | `useElForm` / `useForm` owns model, rules, submit, modes |
| Create / edit / detail copy-pasted | One form: `form.load('create' \| 'edit' \| 'detail', values?)` |
| Switch UI library = rewrite form layer | Core is headless; adapters are thin host bridges |
| Zod + Element rules dual-written | `@vformjs/zod` / `useZodForm` |

## Packages

| Package | Role | Install? |
|---------|------|----------|
| [`@vformjs/element-plus`](https://www.npmjs.com/package/@vformjs/element-plus) | Vue 3 + Element Plus (`useElForm`) | **yes** |
| [`@vformjs/element-ui`](https://www.npmjs.com/package/@vformjs/element-ui) | Vue 2.7 + element-ui (`useElForm`) | **yes** |
| [`@vformjs/vue`](https://www.npmjs.com/package/@vformjs/vue) | `useForm`, `defineAdapter`, `r` | custom UI |
| [`@vformjs/zod`](https://www.npmjs.com/package/@vformjs/zod) | Zod → rules + parsed submit | Zod users |
| [`@vformjs/core`](https://www.npmjs.com/package/@vformjs/core) | Headless engine | transitive |

## Quick start (Element Plus)

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
    <el-form-item label="Name" prop="name">
      <el-input v-model="form.model.name" />
    </el-form-item>
    <el-form-item label="Email" prop="email">
      <el-input v-model="form.model.email" />
    </el-form-item>
    <el-button type="primary" :loading="form.submitting" @click="form.submit()">
      Submit
    </el-button>
    <el-button @click="form.reset()">Reset</el-button>
  </el-form>
</template>
```

`form.el` is `{ ref, model, rules }` — bind once with `v-bind="form.el"`.

## Modes: create / edit / detail

Own the form **inside the dialog or form page**, never on the list page.

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
  <el-descriptions-item label="Name">{{ form.model.name }}</el-descriptions-item>
</el-descriptions>
```

Detail should be **Descriptions / text**, not a disabled form.  
→ [docs/use-form-modes.md](./docs/use-form-modes.md)

## Zod

```ts
import { z } from 'zod'
import { useZodForm } from '@vformjs/element-plus/zod'
// or: import { useZodForm } from '@vformjs/element-plus'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
})

const form = useZodForm({
  schema,
  defaults: { name: '', email: '' },
  onSubmit: async (values) => {
    // values: Zod output
    await api.save(values)
  },
})
```

## Custom UI (Naive / Ant Design Vue / …)

```ts
import { defineAdapter, useForm, r } from '@vformjs/vue'

const createMyAdapter = defineAdapter({
  name: 'my-ui',
  async validate(host, { paths }) {
    await host.validate(/* optional paths */)
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

Runnable references:

| UI | Playground |
|----|------------|
| Naive UI | `pnpm dev:naive` · `playgrounds/vue3-naive-ui` |
| Ant Design Vue | `pnpm dev:antd` · `playgrounds/vue3-antd-vue` |

→ [docs/custom-adapter.md](./docs/custom-adapter.md) · [docs/ecosystem-adapters.md](./docs/ecosystem-adapters.md)

## Features

- **Reactive model** — same object identity for Element `:model`
- **Rules** — static map, function of values, or Zod
- **Conditional fields / rules** — `when`, `whenRules`
- **Linkage** — declarative set/clear when other fields change
- **Field arrays** — `form.list('items')` / `fieldArray` with stable keys
- **Host bridge** — validate / clear / scroll via adapter
- **Submit contract** — `{ ok, values }` or `{ ok: false, errors }`

## Development

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

Monorepo: **pnpm** + **turbo** + **changesets**.  
Publish is CI-only via npm Trusted Publishing (OIDC) — [docs/publish.md](./docs/publish.md).

## Docs

| Doc | Topic |
|-----|--------|
| [use-form-modes.md](./docs/use-form-modes.md) | create / edit / detail ownership |
| [scenarios.md](./docs/scenarios.md) | linkage, arrays, server errors |
| [custom-adapter.md](./docs/custom-adapter.md) | `defineAdapter` |
| [ecosystem-adapters.md](./docs/ecosystem-adapters.md) | other UI libraries |
| [publish.md](./docs/publish.md) | release / OIDC |
| [ci.md](./docs/ci.md) | quality gates |

## License

[MIT](./LICENSE)
