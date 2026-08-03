# @vformjs/element-ui

Vue 2.7 + [element-ui](https://element.eleme.io/) adapter for [vformjs](https://github.com/daguanren21/vformjs).

## Install

```bash
pnpm add @vformjs/element-ui element-ui vue@^2.7
```

## Quick start

```ts
import { r, submitFail, useElForm } from '@vformjs/element-ui'

const form = useElForm({
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
<template>
  <el-form v-bind="form.host" label-width="100px">
    <el-form-item label="Name" v-bind="form.item('name')">
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

Reactive production state:

```ts
form.errors
form.setErrors({ email: ['Already registered'] })
form.scrollToFirstError()
form.dirty
form.changedPaths
```

## Zod

```ts
import { useZodForm } from '@vformjs/element-ui/zod'
```

## Related

| Package | Role |
|---|---|
| `@vformjs/element-plus` | Vue 3 + Element Plus |
| `@vformjs/naive-ui` | Vue 3 + Naive UI |
| `@vformjs/ant-design-vue` | Vue 3 + Ant Design Vue |
| `@vformjs/vue` | Headless `useForm` / `defineAdapter` |
| `@vformjs/zod` | Zod bridge |

MIT · [Repo](https://github.com/daguanren21/vformjs)
