# 自定义 Adapter（defineAdapter）

官方只内置 Element。换 Naive / Ant Design Vue / 自研壳时，用 `defineAdapter`：声明 hook，生命周期框架管。

```bash
pnpm dev:naive   # http://127.0.0.1:5285  Naive
pnpm dev:antd    # http://127.0.0.1:5286  Ant Design Vue
```

| 库 | 代码 |
|----|------|
| Naive | `playgrounds/vue3-naive-ui/src/form/` |
| Ant Design Vue | `playgrounds/vue3-antd-vue/src/form/` |

**全库接入评估**（Vuetify / Quasar / TDesign / Arco / Vant …）：见 [ecosystem-adapters.md](./ecosystem-adapters.md)。

**Agent Skill**（强制决策树 + D 禁止 adapter）：`skills/vformjs/`。

---

## 以前 vs 现在

| 以前 | 现在 |
|------|------|
| 自己存 host、判未绑定 | `defineAdapter` 管 bind |
| 自己拆各种错误形状 | `normalizeHostErrors` 默认处理 |
| 完整实现 `FormHostAdapter` | 只写 validate / clear 等 hook |

---

## API

```ts
defineAdapter<THost>({
  name?: string
  validate(host, { paths? }): void | HostValidateResult | Promise<...>
  clearValidate?(host, paths?)
  scrollToField?(host, path)
  afterModelReset?(host)       // 默认走 clearValidate
  mapErrors?(err): FormErrors  // 默认 normalizeHostErrors
  unboundMessage?: string
})
```

返回**工厂**：每次 `createXxxAdapter()` 新建，多表单互不抢 host。

validate：

- 宿主失败 **throw** → 自动 `mapErrors`
- 或 `return adapterFail({ email: ['x'] })` / `adapterOk()`

`normalizeHostErrors` 已覆盖：

- Naive：`ValidateError[][]`（field + message）
- Ant Design Vue：`{ errorFields: [{ name, errors }] }`
- Record / Error / string

---

## Naive（可运行）

```ts
import { defineAdapter } from '@vformjs/vue'
import type { FormInst, FormItemRule } from 'naive-ui'

export const createNaiveAdapter = defineAdapter<FormInst>({
  name: 'naive-ui',
  async validate(host, { paths }) {
    if (paths?.length) {
      const set = new Set(paths)
      await host.validate(undefined, (rule: FormItemRule) => {
        const field = String(rule.key ?? '')
        return !field || set.has(field)
      })
      return
    }
    await host.validate()
  },
  clearValidate(host) {
    host.restoreValidation()
  },
})
```

模板：`path` + `v-model:value` + `form.bindHost(inst)`。

---

## Ant Design Vue（可运行）

```ts
import { defineAdapter } from '@vformjs/vue'
import type { FormInstance } from 'ant-design-vue/es/form'
import type { NamePath } from 'ant-design-vue/es/form/interface'

export const createAntdAdapter = defineAdapter<FormInstance>({
  name: 'ant-design-vue',
  async validate(host, { paths }) {
    if (paths?.length)
      await host.validateFields(paths as NamePath[])
    else
      await host.validateFields()
  },
  clearValidate(host, paths) {
    if (paths?.length) {
      for (const p of paths)
        host.clearValidate(p as NamePath)
      return
    }
    host.clearValidate()
  },
  scrollToField(host, path) {
    host.scrollToField(path as NamePath)
  },
})
```

模板：

| Element | Naive | Ant Design Vue |
|---------|-------|----------------|
| `prop` | `path` | **`name`** |
| `v-model` | `v-model:value` | `v-model:value` |
| `clearValidate` | `restoreValidation` | `clearValidate` |
| 校验 API | `validate` | **`validateFields`** |

```vue
<a-form :ref="setFormRef" :model="form.model" :rules="form.rules">
  <a-form-item label="姓名" name="name">
    <a-input v-model:value="form.model.name" />
  </a-form-item>
</a-form>
```

---

## 业务封装

```ts
export function useAntdForm(options) {
  const defaults = options.defaults ?? options.defaultValues
  if (defaults == null)
    throw new Error('requires defaults')
  return useForm({
    ...options,
    defaultValues: defaults,
    adapter: createAntdAdapter(),
  })
}
```

Zod：

```ts
import { useZodForm } from '@vformjs/zod'

const form = useZodForm({
  schema,
  defaults,
  adapter: createAntdAdapter(), // 或 createNaiveAdapter()
  onSubmit,
})
```

不要用 `element-plus` 的 `useZodForm`（写死 Element）。

---

## 对照 Vite plugin

```ts
// vite: { name, transform, buildEnd }
// form: { name, validate, clearValidate, scrollToField? }
```

---

## 检查清单

1. ref 回调 `bindHost`，卸载 `null`  
2. 空提交有红字 + `submit().errors`  
3. `reset` 后红字消失  
4. `validate(['email'])` 局部  
5. Zod refine 挂对字段  

---

## 入口

| 命令 | 地址 |
|------|------|
| `pnpm dev:vue3` | :5283 Element Plus |
| `pnpm dev:naive` | :5285 Naive |
| `pnpm dev:antd` | :5286 Ant Design Vue |
