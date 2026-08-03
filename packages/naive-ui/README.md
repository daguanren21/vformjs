# @vformjs/naive-ui

Vue 3 + [Naive UI](https://www.naiveui.com/) adapter for [vformjs](https://github.com/daguanren21/vformjs).

## Install

```bash
pnpm add @vformjs/naive-ui naive-ui vue
```

## Quick start

```ts
import { r, submitFail, useNaiveForm } from '@vformjs/naive-ui'

const form = useNaiveForm({
  defaults: { name: '', email: '' },
  rules: {
    name: [r.required(), r.min(2)],
    email: [r.required(), r.email()],
  },
  onSubmit: async (values) => {
    const result = await api.save(values)
    if (!result.ok)
      return submitFail(result.error, { errors: result.fieldErrors })
  },
})
```

`submitFail` keeps expected API errors typed as `result.submitError` and copies optional field
errors into reactive `form.errors`.

```vue
<n-form v-bind="form.host">
  <n-form-item label="Name" v-bind="form.item('name')">
    <n-input v-model:value="form.model.name" />
  </n-form-item>
  <n-button type="primary" :loading="form.submitting" @click="form.submit()">
    Submit
  </n-button>
</n-form>
```

The package also exports `createNaiveAdapter` for direct `useForm` integration. For Zod, import `useZodForm` only from `@vformjs/naive-ui/zod`.

MIT · [Docs](https://vformjs.vercel.app/guide) · [Repo](https://github.com/daguanren21/vformjs)
