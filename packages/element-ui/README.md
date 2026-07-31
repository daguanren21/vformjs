# @vformjs/element-ui

Vue 2.7 + [element-ui](https://element.eleme.io/) adapter for [vformjs](https://github.com/daguanren21/vformjs).

## Install

```bash
pnpm add @vformjs/element-ui element-ui vue@^2.7
```

## Quick start

```ts
import { useElForm, r } from '@vformjs/element-ui'

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
  </el-form>
</template>
```

## Zod

```ts
import { useZodForm } from '@vformjs/element-ui/zod'
// or: import { useZodForm } from '@vformjs/element-ui'
```

## Related

| Package | Role |
|---|---|
| `@vformjs/element-plus` | Vue 3 + Element Plus |
| `@vformjs/vue` | Headless `useForm` / `defineAdapter` |
| `@vformjs/zod` | Zod bridge |

MIT · [Repo](https://github.com/daguanren21/vformjs)
