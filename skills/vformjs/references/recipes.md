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

`rules` 支持静态规则、字段条件回调，或整个 `(values) => rules`。
跨字段规则优先从回调上下文读取 `values`，不在创建后修改底层规则。

## 条件显隐

```ts
useElForm({
  defaults: { type: 'a', extra: '' },
  // 条件规则返回 RuleInput；不需要时用 null
  rules: {
    extra: ({ values }) => values.type === 'b' ? r.required() : null,
  },
  // key = 字段 path；predicate 为 true 时显示该字段
  when: {
    extra: values => values.type === 'b',
  },
})
```

隐藏字段会自动摘掉 rules 并清校验。模板：`v-if="!form.hidden('extra').value"`。

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
import { useZodForm } from '@vformjs/element-plus/zod'
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

非 Element 宿主：使用对应 UI 包的 `/zod` 子入口；无 UI 时直接使用 `@vformjs/zod`，不传 adapter。

## 服务端错误

接口错误放在 **`onSubmit` 内**（或 `submit(handler)` 单次 handler），不要 `submit()` 成功后再 `api.save` 第二次。

```ts
const form = useElForm({
  defaults,
  rules,
  onSubmit: async (values) => {
    const response = await api.save(values)
    if (!response.ok) {
      return submitFail(response.error, {
        errors: response.fieldErrors,
      })
    }
  },
})
```

## Naive / Antd 官方入口

Naive UI 使用 `useNaiveForm`，Ant Design Vue 使用 `useAntdForm`；两者与
`useElForm` 使用相同的 facade 和 `defaults` 参数。

```ts
import { r, useNaiveForm } from '@vformjs/naive-ui'

const form = useNaiveForm({
  defaults,
  rules: { name: [r.required()] },
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
