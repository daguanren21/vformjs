# @vformjs/element-plus

Vue 3 + [Element Plus](https://element-plus.org/) adapter for [vformjs](https://github.com/daguanren21/vformjs).

## Install

```bash
pnpm add @vformjs/element-plus element-plus vue
```

## Quick start

```ts
import { useElForm, r } from '@vformjs/element-plus'

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
import { useZodForm } from '@vformjs/element-plus/zod'
// or: import { useZodForm } from '@vformjs/element-plus'
```

## Related

| Package | Role |
|---|---|
| `@vformjs/element-ui` | Vue 2.7 + element-ui |
| `@vformjs/vue` | Headless `useForm` / `defineAdapter` |
| `@vformjs/zod` | Zod bridge |
| `@vformjs/core` | Headless core (transitive) |

MIT · [Repo](https://github.com/daguanren21/vformjs)
