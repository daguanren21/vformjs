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

- `createForm` — mutable model, baseline/dirty state, linkage, submit lifecycle
- `defineAdapter` / `adapterOk` / `adapterFail` — host form validation bridge
- `r` / `ruleBuilders` — async-validator-style host rule helpers
- `fieldArray` — list fields with stable keys

```ts
import { createForm } from '@vformjs/core'

const form = createForm({
  defaultValues: { name: '' },
  onSubmit: async (values) => {
    await api.save(values)
  },
})

form.setFieldValue('name', 'Alice')
form.dirty        // true
form.changedPaths // ['name']
```

`rules` are executed by a bound host adapter. Active rules without an adapter
return a configuration error from `validate()` / `submit()`; they never silently
pass. Prefer a UI package, or use `useZodForm` for schema-only validation.

MIT · [Repo](https://github.com/daguanren21/vformjs)
