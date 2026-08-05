# API 速查

日常业务优先从 UI 入口导入：Element Plus 用 `@vformjs/element-plus`，Vue 2.7 用 `@vformjs/element-ui`，Naive UI 和 Ant Design Vue 使用各自同名官方包。

## 常用导入

```ts
import {
  createFieldPath,
  useElForm,
  r,
  fieldPath,
  type FormErrors,
  type FormMode,
  type UseFormReturn,
} from '@vformjs/element-plus'
import { useZodForm } from '@vformjs/element-plus/zod'
```

Naive UI 使用 `useNaiveForm`，Ant Design Vue 使用 `useAntdForm`；两个包都提供 `/zod` 子路径。

自定义 UI：

```ts
import {
  useForm,
  defineAdapter,
  adapterOk,
  adapterFail,
  submitFail,
  r,
} from '@vformjs/vue'
```

## 状态

| 成员 | 说明 |
|---|---|
| `model` | 响应式表单模型 |
| `rules` | 当前归一化宿主规则 |
| `host` | 统一绑定宿主的 `ref`、`model`、`rules` |
| `item(path)` | 映射宿主字段属性与接口错误 |
| `field(path)` | 精确路径的可写 computed；适合大型表单 |
| `errors` | 响应式 core / 接口错误 |
| `submitting` | submit 执行中 |
| `dirty` | 当前值是否偏离重置基线 |
| `changedPaths` | 发生变化的 dotted paths |
| `mode` | `create` / `edit` / `detail` |
| `editable` | 新建和编辑时为 true |
| `readonly` | 详情时为 true |

## 值与基线

```ts
form.getValues()
form.setValues({ name: 'Lin' })
form.getFieldValue('profile.email')
form.setFieldValue('profile.email', 'name@example.com')

form.reset()
form.reset('profile.email')
form.rebaseDefaults(detail)
```

类型安全的固定路径：

```ts
const path = createFieldPath<FormValues>()
form.getFieldValue(path('profile.email'))
```

外部响应式模型和精确路径模式：

```ts
const form = useForm({
  defaultValues,
  model: externalReactiveModel,
  modelTracking: 'explicit',
  submitPolicy: 'join',
  valuePolicy,
})

const email = form.field('profile.email') // WritableComputedRef<string>
```

`explicit` 模式不做整棵模型的 deep watch / clone / diff。字段必须通过
`field(path)`、`setFieldValue`、`setValues` 或数组方法更新。

## 草稿

```ts
// 保存:版本化、可 JSON 序列化
localStorage.setItem('draft', JSON.stringify(form.snapshotDraft()))

// 恢复:结构化结果,绝不抛异常
const result = form.restoreDraft(JSON.parse(localStorage.getItem('draft') ?? 'null'))
```

`result.status` 三态:

- `'restored'` — 草稿与当前基线结构完全一致
- `'healed'` — 已应用,但丢弃了基线中不存在的路径(`droppedPaths`),并用基线值补齐缺失路径(`filledPaths`)
- `'fresh'` — 草稿被拒绝(`reason`: `empty` / `malformed` / `unsupported-version`),当前值不变

恢复**不会**重置基线:草稿是未保存的用户输入,`dirty` / `changedPaths` 会如实反映,`reset()` 仍回到基线。恢复时清空错误。

## 模式

```ts
form.load('create')
form.load('edit', detail)
form.load('detail', detail)
form.setMode('edit')
```

`load('edit')` 和 `load('detail')` 会把载入记录设成 clean baseline。

## 校验与提交

```ts
const validated = await form.validate()
const emailResult = await form.validateField('email')
const submitted = await form.submit()

form.clearValidate()
form.clearValidate(['email', 'name'])
```

返回值：

```ts
type FormResult<T> =
  | { ok: true, values: T }
  | { ok: false, values: T, errors: FormErrors }
```

API 可预期失败由 `submitFail(error)` 返回。错误类型会推导到
`SubmitResult<T, E>`；可选字段错误会同步写入响应式 `form.errors`。

```ts
type SaveUserError =
  | { kind: 'EmailTaken' }
  | { kind: 'ServiceUnavailable', retryable: true }

const form = useForm({
  defaultValues: { email: '' },
  onSubmit: async (values) => {
    const response = await api.save(values)
    if (!response.ok) {
      return submitFail<SaveUserError>(response.error, {
        errors: response.fieldErrors,
      })
    }
  },
})

const result = await form.submit()
if (!result.ok && 'submitError' in result)
  result.submitError // SaveUserError
```

```ts
type SubmitOutcome<E> =
  | { ok: true }
  | { ok: false, error: E, errors?: FormErrors }

type SubmitResult<T, E = never> =
  | FormResult<T>
  | { ok: false, values: T, submitError: E, errors?: FormErrors }
```

返回 `void` 或 `submitOk()` 表示 API 成功。handler 抛出或 reject 时，
`submit()` 仍然 reject：可预期失败应转换成 `submitFail`，意外缺陷继续抛出。
未配置提交错误类型时，`submit()` 仍是 `Promise<FormResult<T>>`。

`submit()` 默认滚动到第一个字段错误；页面自行管理错误导航时可设置
`scrollToError: false`。
重复调用 `submit()` 默认复用正在执行的 Promise，handler 只运行一次；
只有明确设置 `submitPolicy: 'parallel'` 才会并发提交。

## 接口错误

```ts
form.setErrors({
  email: ['邮箱已注册'],
})
form.setFieldError('name', '姓名不可用')
form.clearErrors('email')
form.scrollToFirstError()
```

字段发生变化时，对应的旧 core / 接口错误会自动清掉。

## 动态数组

```ts
const list = form.list('contacts', {
  defaultItem: () => ({ name: '', phone: '' }),
})

list.append()
list.prepend()
list.insert(1)
list.remove(0)
list.move(1, 0)
list.update(0, { name: 'Lin' })
list.clear()
```

数组规则可使用通配路径，只声明一次：

```ts
rules: {
  'contacts.*.name': [r.required()],
},
whenRules: {
  'contacts.*.phone': (_values, { item, index, path }) =>
    (item as Contact).phoneRequired ? [r.required()] : null,
}
```

运行时会展开成 `contacts.0.name` 等宿主路径；固定路径优先于通配规则。

## 组合表单

```ts
const group = useFormGroup({
  base: baseForm,
  details: detailsForm,
})

group.dirty
group.changedPaths
await group.validate()
await group.submit(async values => api.save(values))
group.reset()
```

每个成员保留自己的宿主和错误；group 聚合校验、滚动、提交、dirty 与 reset。

## 联动

```ts
linkage: [
  {
    deps: ['city'],
    run: ({ get, set, setOptions, clearValidate }) => {
      const city = get('city')
      set('district', '')
      setOptions('district', districtsOf(city))
      clearValidate('district')
    },
  },
]
```

## 无宿主校验

`FormRulesMap` 交给真实 UI Form 执行。有 active rules 却没有 adapter 时，`validate()` 和 `submit()` 会返回宿主未绑定错误。没有 UI 宿主的 schema 校验使用 `useZodForm`。

完整选项、rule builders、adapter 契约和类型定义见英文 [API Reference](/api)。
