# @vformjs/core

Headless form state, validation, linkage, and field-array helpers for [vformjs](https://github.com/daguanren21/vformjs).

Most apps should depend on a higher-level package instead of installing this directly:

| Use case | Install |
|---|---|
| Vue 3 + Element Plus | `@vformjs/element-plus` |
| Vue 2.7 + element-ui | `@vformjs/element-ui` |
| Custom UI | `@vformjs/vue` |

## Install

```bash
pnpm add @vformjs/core
```

## Surface

- `createForm` — mutable model, rules, `when` / `whenRules`, linkage, submit
- `defineAdapter` / `adapterOk` / `adapterFail` — host form bridge
- `r` / `ruleBuilders` — async-validator-style rule helpers
- `fieldArray` — list fields with stable keys

```ts
import { createForm, r } from '@vformjs/core'

const form = createForm({
  defaultValues: { name: '' },
  rules: { name: [r.required()] },
  onSubmit: async (values) => {
    await api.save(values)
  },
})
```

MIT · [Repo](https://github.com/daguanren21/vformjs)
