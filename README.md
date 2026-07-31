# veform

Vue 表单状态与校验（Vue 2.7 / Vue 3）。UI 用 adapter 接入。

```bash
pnpm add @veform/element-plus   # Vue3 + Element Plus
# pnpm add @veform/element-ui  # Vue2.7 + element-ui
# pnpm add @veform/vue         # 通用 useForm / defineAdapter
```

```ts
import { useElForm, r } from '@veform/element-plus'

const form = useElForm({
  defaults: { name: '', email: '' },
  rules: {
    name: [r.required(), r.min(2)],
    email: [r.required(), r.email()],
  },
  onSubmit: async (values) => api.save(values),
})
```

```vue
<el-form v-bind="form.el">
  <el-form-item label="姓名" prop="name">
    <el-input v-model="form.model.name" />
  </el-form-item>
  <el-button :loading="form.submitting" @click="form.submit()">提交</el-button>
</el-form>
```

```bash
pnpm install
pnpm test
pnpm dev:vue3   # Element Plus playground
pnpm dev:vue2   # element-ui playground
```

MIT
