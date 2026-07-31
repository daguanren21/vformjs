# 表单场景清单

下面按业务里常见的写法列场景。官方主路径是 **Element UI / Element Plus + `useElForm` / `useZodForm`**；校验状态、联动、数组、模式机都在 core/vue 层，UI 库只负责画控件和跑 rules。

---

## 1. 列表 + 弹窗新增 / 编辑 / 详情

| 谁持有 form | 列表页 | 弹窗 |
|-----------|--------|------|
| 正确 | 不 `useForm` | Dialog 内部 `useElForm`，`openCreate/Edit/Detail` 里 `load` |

```ts
// ListPage — 无 form
dialogRef.value?.openEdit(row.id)

// TaskDialog
const form = useElForm({ defaults, rules, onSubmit })
async function openEdit(id: string) {
  visible.value = true
  form.load('edit', await api.get(id))
}
```

详情用 `el-descriptions` 展示，不要整表 `:disabled="true"`。  
完整约定见 [use-form-modes.md](./use-form-modes.md)。

Playground：`弹窗 新增/编辑/详情`。

---

## 2. 独立路由页 create / edit / detail

```
/tasks           List（无 form）
/tasks/create    FormPage  load('create')
/tasks/:id/edit  FormPage  load('edit', detail)
/tasks/:id       DetailPage  纯展示，可不建 form
```

`load('edit')` 会从工厂默认值再套 payload，避免上一条记录字段漏到下一条。  
`load('create')` 恢复工厂默认值，不会被上一次 edit 的 baseline 污染。

Playground：`页面 新增/编辑/详情`。

---

## 3. 基础校验 + 提交

```ts
const form = useElForm({
  defaults: { name: '', email: '' },
  rules: {
    name: [r.required(), r.min(2)],
    email: [r.required(), r.email()],
  },
  onSubmit: async (values) => api.save(values),
})
// <el-form v-bind="form.el">
// form.submit() → { ok, values, errors? }
```

`form.submitting` 在 submit 生命周期里自动翻转。

Playground：`基础表单`。

---

## 4. 规则助手 `r.*` / 异步校验

| 场景 | 写法 |
|------|------|
| 必填 / 长度 / 邮箱 / 手机 | `r.required()` `r.min` `r.email` `r.phone` |
| 正则 | `r.pattern(/.../)` |
| 数字区间 | `r.numberRange(1, 100)` |
| 确认密码 | `r.equalTo(() => form.model.password)` |
| 远程唯一 | `r.custom(async (_r, v, cb) => { ... })` |

异步规则里用 callback 或返回 Promise 都可以；Element Plus 对 Promise 更稳。

Playground：`自定义 Rules`、`跨字段校验`。

---

## 5. 条件显隐 / 条件规则

```ts
useElForm({
  defaults: { needInvoice: false, invoiceTitle: '', payType: 'bank', account: '' },
  when: {
    invoiceTitle: v => v.needInvoice,
  },
  whenRules: {
    account: v => v.payType === 'email'
      ? [r.required(), r.email()]
      : [r.required()],
  },
  rules: { /* 基础规则 */ },
})
```

隐藏字段会清规则并 `clearValidate`。模板里用 `v-if` 配合 `form.hidden('path')` 或自己写条件。

Playground：`条件显隐联动`。

---

## 6. 动态数组 `form.list`

```ts
const members = form.list('members', {
  defaultItem: () => ({ name: '', role: 'dev' }),
})
// members.append() / remove(i)
// prop: fieldPath('members', index, 'name')
```

Zod 路径下 `z.array(z.object(...))` 会生成 `members.0.name` 规则，长度变化后自动重建。

Playground：`动态数组`、`Zod 动态数组`。

---

## 7. 嵌套对象

`prop` 用点路径：`profile.email`。  
Zod 默认 deep 自动展开嵌套 object。

---

## 8. Schema 驱动（Zod）

```ts
const form = useZodForm({
  schema,
  defaults: { ... }, // z.input
  onSubmit: async (values) => { /* values 是 z.output */ },
})
```

字段 blur / 整表 submit 都跑全量 schema，`refine` 挂在对应 `prop`。  
整表校验 wave 内共享一次 `safeParse`。

Playground：`Zod Schema`、`Zod 动态数组`。

---

## 9. 接口错误回填

```ts
try {
  await form.submit()
}
catch (e) {
  // 字段级
  form.raw.setFieldError('email', e.fields.email)
  // 表级
  form.raw.setFieldError('_form', e.message)
}
```

注意：`setFieldError` 写入 core 错误图；要让 ElForm 显示红字，需要宿主再跑一遍对应字段的 rules，或在 adapter 里接 `setFieldError` 映射（Element 官方 adapter 依赖 rules 路径）。业务上常见做法是接口错误转成临时 rules / 调 `validateField`。

---

## 10. 只读 / 禁用 / meta

```ts
form.raw.setDisabled('price', true)
form.raw.setHidden('coupon', true)
form.getMeta('price') // { hidden, disabled, options? }
```

联动里用 `setHidden` / `setDisabled` / `setOptions`。

---

## 11. 提交前 trim / 隐藏字段不提交

```ts
useElForm({
  defaults,
  rules,
  trimOnSuccess: true,      // 顶层 string trim
  hiddenValues: 'omit',     // getValues/submit 丢掉 hidden
})
```

---

## 12. 局部校验

```ts
await form.validate('email')
await form.validate(['name', 'email'])
await form.validateField('password')
```

---

## 13. 接入其它 UI 库

官方不提供全库 adapter 包。  
你自己 `defineAdapter`，再 `useForm({ adapter, defaultValues, rules })`。

- 写法：[custom-adapter.md](./custom-adapter.md)  
- **主流库能不能接、难度多大**：[ecosystem-adapters.md](./ecosystem-adapters.md)  
- 可运行：`pnpm dev:naive` / `pnpm dev:antd`

Playground：`自定义 Adapter`（用最小宿主模拟「非 Element 表单」）。

---

## 14. 建议优先级（落地时）

1. 先定 **谁持有 form**（弹窗 / 页面），列表不持 form  
2. create/edit 用 `load`，详情用展示组件  
3. 规则用 `r.*` 或 Zod，二选一为主，混用时想清楚字段 owner  
4. 数组、联动、跨字段按需加  
5. 只有要换 UI 库时才写 adapter  

---

## 对照表

| 场景 | API / 文档 | Demo |
|------|------------|------|
| 弹窗 CRUD | `load` / modes | 弹窗 新增/编辑/详情 |
| 路由 CRUD | modes | 页面 新增/编辑/详情 |
| 基础提交 | `useElForm` `submit` | 基础表单 |
| 规则库 | `r.*` | 自定义 Rules |
| 跨字段 | `r.equalTo` | 跨字段校验 |
| 显隐联动 | `when` `whenRules` | 条件显隐联动 |
| 动态行 | `form.list` `fieldPath` | 动态数组 |
| Zod | `useZodForm` | Zod Schema / Zod 动态数组 |
| 自定义 UI | `defineAdapter` / ecosystem 评估 | 自定义 Adapter / Naive / Antd |
