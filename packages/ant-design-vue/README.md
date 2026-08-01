# @vformjs/ant-design-vue

Vue 3 + [Ant Design Vue](https://antdv.com/) adapter for [vformjs](https://github.com/daguanren21/vformjs).

## Install

```bash
pnpm add @vformjs/ant-design-vue ant-design-vue vue
```

## Quick start

```ts
import { r, useAntdForm } from '@vformjs/ant-design-vue'

const form = useAntdForm({
  defaults: { name: '', email: '' },
  rules: {
    name: [r.required(), r.min(2)],
    email: [r.required(), r.email()],
  },
  onSubmit: async values => api.save(values),
})
```

```vue
<a-form :ref="form.bindHost" :model="form.model" :rules="form.rules">
  <a-form-item label="Name" name="name">
    <a-input v-model:value="form.model.name" />
  </a-form-item>
  <a-button type="primary" :loading="form.submitting" @click="form.submit()">
    Submit
  </a-button>
</a-form>
```

The package also exports `createAntdAdapter` for direct `useForm` integration. For Zod, import `useZodForm` from `@vformjs/ant-design-vue/zod` or the package root.

MIT · [Docs](https://vformjs.vercel.app/guide) · [Repo](https://github.com/daguanren21/vformjs)
