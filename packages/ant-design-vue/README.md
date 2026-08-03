# @vformjs/ant-design-vue

Vue 3 + [Ant Design Vue](https://antdv.com/) adapter for [vformjs](https://github.com/daguanren21/vformjs).

## Install

```bash
pnpm add @vformjs/ant-design-vue ant-design-vue vue
```

## Quick start

```ts
import { r, submitFail, useAntdForm } from '@vformjs/ant-design-vue'

const form = useAntdForm({
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
<a-form v-bind="form.host">
  <a-form-item label="Name" v-bind="form.item('name')">
    <a-input v-model:value="form.model.name" />
  </a-form-item>
  <a-button type="primary" :loading="form.submitting" @click="form.submit()">
    Submit
  </a-button>
</a-form>
```

The package also exports `createAntdAdapter` for direct `useForm` integration. For Zod, import `useZodForm` only from `@vformjs/ant-design-vue/zod`.

MIT · [Docs](https://vformjs.vercel.app/guide) · [Repo](https://github.com/daguanren21/vformjs)
