# @vformjs/vue

Vue 2.7 / Vue 3 bindings for [vformjs](https://github.com/daguanren21/vformjs): `useForm`, `defineAdapter`, rule helpers `r`.

Prefer a UI package when you use Element:

- Vue 3 + Element Plus → [`@vformjs/element-plus`](https://www.npmjs.com/package/@vformjs/element-plus)
- Vue 2.7 + element-ui → [`@vformjs/element-ui`](https://www.npmjs.com/package/@vformjs/element-ui)

## Install

```bash
pnpm add @vformjs/vue vue
```

## useForm

```ts
import { useForm, r, defineAdapter } from '@vformjs/vue'

const form = useForm({
  defaultValues: { name: '' },
  rules: { name: [r.required()] },
  adapter: defineAdapter({
    /* host validate bridge */
  }),
  onSubmit: async (values) => {
    await api.save(values)
  },
})
```

## Modes

`create` | `edit` | `detail` share one form instance:

```ts
form.load('create')
form.load('edit', detail)
form.load('detail', detail)
```

## Related

| Package | Role |
|---|---|
| `@vformjs/core` | Headless core |
| `@vformjs/zod` | Zod bridge |
| `@vformjs/element-plus` | Element Plus adapter |
| `@vformjs/element-ui` | element-ui adapter |

MIT · [Repo](https://github.com/daguanren21/vformjs)
