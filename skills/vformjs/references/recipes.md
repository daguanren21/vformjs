# 菜谱

## 基础提交（Element Plus）

```ts
import { useElForm, r } from '@vformjs/element-plus'

const form = useElForm({
  defaults: { title: '', owner: '' },
  rules: {
    title: [r.required('请输入标题'), r.min(2)],
    owner: [r.required()],
  },
  onSubmit: async (values) => api.create(values),
})
```

## 跨字段

```ts
const defaults = { password: '', confirm: '' }
const form = useElForm({
  defaults,
  rules: (values) => ({
    password: [r.required()],
    confirm: [r.required(), r.equalTo(() => values.password, '两次不一致')],
  }),
  onSubmit,
})
```

`rules` 支持 `RulesSource`：对象或 `(values) => rules`。  
也可先建 form 再 `form.raw.setRules(...)`，`equalTo` 读 `form.model`。

## 条件显隐

```ts
useElForm({
  defaults: { type: 'a', extra: '' },
  rules: { extra: [r.required()] },
  // key = 字段 path；predicate 为 true 时显示该字段
  when: {
    extra: (m) => m.type === 'b',
  },
  // 可选：条件规则（返回 RuleInput；不需要时 [] 或 null）
  whenRules: {
    extra: (m) => (m.type === 'b' ? [r.required()] : []),
  },
})
```

隐藏字段会自动摘掉 rules 并清校验。模板：`v-if="!form.hidden('extra').value"` 或读 meta。

## 动态数组

```ts
import { useElForm, r, fieldPath } from '@vformjs/element-plus'

const form = useElForm({ /* ... */ })
const members = form.list('members', {
  defaultItem: () => ({ name: '', role: '' }),
})
// members.append() remove() fields
// prop: fieldPath('members', index, 'name')
```

## Zod

```ts
import { useZodForm } from '@vformjs/element-plus'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0),
})
const form = useZodForm({
  schema,
  defaults: { email: '', age: 0 },
  onSubmit: async (values) => { /* z.output */ },
})
```

非 Element：`import { useZodForm } from '@vformjs/zod'` + **必传** `adapter`（否则无宿主校验/红字路径）。

## 服务端错误

接口错误放在 **`onSubmit` 内**（或 `submit(handler)` 单次 handler），不要 `submit()` 成功后再 `api.save` 第二次。

```ts
const form = useElForm({
  defaults,
  rules,
  onSubmit: async (values) => {
    try {
      await api.save(values)
    }
    catch (e: unknown) {
      const err = e as { fields?: Record<string, string>, message?: string }
      if (err.fields?.email)
        form.raw.setFieldError('email', err.fields.email)
      else
        form.raw.setFieldError('_form', err.message ?? '保存失败')
      // setFieldError 写 core errors；Element 红字仍依赖 prop rules。
      // 常见：再 validateField，或把接口错误映射进临时 rules。
      throw e // 让 submit 以异常结束，避免当成成功
    }
  },
})
```

## Naive / Antd 最小 useForm

注意：通用 `useForm` 选项名是 **`defaultValues`**（不是 `useElForm` 的 `defaults`）。

```ts
import { useForm, r } from '@vformjs/vue'

const form = useForm({
  defaultValues: defaults,
  rules: { name: [r.required()] },
  adapter: createNaiveAdapter(), // or createAntdAdapter()
  onSubmit,
})
```

模板字段名：Naive `path`，Antd `name`。复制 playground 绑定方式。

## 明确拒绝 D

用户：「帮我写 vee-validate 的 vformjs adapter」

Agent 回复：

> vee-validate 是完整校验引擎（D），与本库并列。不应写 defineAdapter。  
> 请选择：  
> 1) 只用 vee-validate  
> 2) 只用 vformjs + UI 控件（A/B 宿主）或 Zod  
> 不能双状态机，也不能「无 adapter + 仅 r.*」。
