# @vformjs/naive-ui

Vue 3 + [Naive UI](https://www.naiveui.com/) adapter for [vformjs](https://github.com/daguanren21/vformjs).

## Install

```bash
pnpm add @vformjs/naive-ui naive-ui vue
```

## Quick start

```ts
import { r, useNaiveForm } from '@vformjs/naive-ui'

const form = useNaiveForm({
  defaults: { name: '', email: '' },
  rules: {
    name: [r.required(), r.min(2)],
    email: [r.required(), r.email()],
  },
  onSubmit: async values => api.save(values),
})
```

```vue
<n-form :ref="form.bindHost" :model="form.model" :rules="form.rules">
  <n-form-item label="Name" path="name" data-vform-path="name">
    <n-input v-model:value="form.model.name" />
  </n-form-item>
  <n-button type="primary" :loading="form.submitting" @click="form.submit()">
    Submit
  </n-button>
</n-form>
```

The package also exports `createNaiveAdapter` for direct `useForm` integration. For Zod, import `useZodForm` from `@vformjs/naive-ui/zod` or the package root.

MIT · [Docs](https://vformjs.vercel.app/guide) · [Repo](https://github.com/daguanren21/vformjs)
