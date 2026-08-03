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

- `createForm` — mutable or caller-owned model, baseline/dirty state, linkage, submit lifecycle
- latest-wins resolver validation with `AbortSignal`
- wildcard row rules (`items.*.name`) and conditional row context
- opaque value clone/equality policies for File, URL, and value objects
- joined submissions by default; explicit parallel policy
- `defineAdapter` / `adapterOk` / `adapterFail` — host form validation bridge
- `resolver` — primary validation and successful-value transformation pipeline
- `r` / `ruleBuilders` — async-validator-style host rule helpers
- `form.fieldArray()` — list operations with stable sidecar keys

```ts
import { createForm, submitFail } from '@vformjs/core'

const form = createForm({
  defaultValues: { name: '' },
  onSubmit: async (values) => {
    const result = await api.save(values)
    if (!result.ok)
      return submitFail(result.error, { errors: result.fieldErrors })
  },
})

form.setFieldValue('name', 'Alice')
form.dirty        // true
form.changedPaths // ['name']
```

Expected API failures are returned as `result.submitError`; optional field errors are copied into
the form error state. Returning `void` means success, while thrown or rejected handlers remain
exceptions.

`rules` are executed by a bound host adapter. Active rules without an adapter
return a configuration error from `validate()` / `submit()`; they never silently
pass. Prefer a UI package, or use `useZodForm` for schema-only validation.

MIT · [Repo](https://github.com/daguanren21/vformjs)
