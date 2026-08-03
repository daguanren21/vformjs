# @vformjs/vue

Vue 2.7 / Vue 3 bindings for [vformjs](https://github.com/daguanren21/vformjs): `useForm`, `defineAdapter`, rule helpers `r`.

Prefer an official adapter package when your project uses a supported UI Form:

- Vue 3 + Element Plus → [`@vformjs/element-plus`](https://www.npmjs.com/package/@vformjs/element-plus)
- Vue 2.7 + element-ui → [`@vformjs/element-ui`](https://www.npmjs.com/package/@vformjs/element-ui)
- Vue 3 + Naive UI → [`@vformjs/naive-ui`](https://www.npmjs.com/package/@vformjs/naive-ui)
- Vue 3 + Ant Design Vue → [`@vformjs/ant-design-vue`](https://www.npmjs.com/package/@vformjs/ant-design-vue)

## Install

```bash
pnpm add @vformjs/vue vue
```

## useForm

```ts
import { defineAdapter, r, submitFail, useForm } from '@vformjs/vue'

const form = useForm({
  defaultValues: { name: '' },
  rules: { name: [r.required()] },
  adapter: defineAdapter({
    /* host validate bridge */
  }),
  onSubmit: async (values) => {
    const result = await api.save(values)
    if (!result.ok)
      return submitFail(result.error, { errors: result.fieldErrors })
  },
})
```

`submitFail` preserves the API error type as `result.submitError` and copies optional field errors
into reactive `form.errors`.

## Modes

`create` | `edit` | `detail` share one form instance:

```ts
form.load('create')
form.load('edit', detail)
form.load('detail', detail)
```

## Errors and dirty state

```ts
form.setErrors({ email: ['Already registered'] })
form.errors.email
form.scrollToFirstError()

form.dirty
form.changedPaths
```

## Large and composed forms

Use exact-path writable computeds instead of a deep model watcher:

```ts
const form = useForm({
  defaultValues,
  modelTracking: 'explicit',
})
const email = form.field('profile.email')
```

Compose independently hosted sections explicitly:

```ts
const group = useFormGroup({ base: baseForm, details: detailsForm })
await group.submit(async values => api.save(values))
```

`useFormGroup` aggregates validation, errors, dirty paths, submitting state,
scrolling, and reset without provide/inject registration.

Active `rules` require a bound adapter. Without one, validation returns a
configuration error; use `useZodForm` for schema-only validation.

## Related

| Package | Role |
|---|---|
| `@vformjs/core` | Headless core |
| `@vformjs/zod` | Zod bridge |
| `@vformjs/element-plus` | Element Plus adapter |
| `@vformjs/element-ui` | element-ui adapter |
| `@vformjs/naive-ui` | Naive UI adapter |
| `@vformjs/ant-design-vue` | Ant Design Vue adapter |

MIT · [Repo](https://github.com/daguanren21/vformjs)
