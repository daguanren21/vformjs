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
import { useSchemaForm } from '@vformjs/element-plus/schema'
```

Naive UI 使用 `useNaiveForm`，Ant Design Vue 使用 `useAntdForm`；各官方包
都提供通用 `/schema` 和 Zod 专用 `/zod` 子路径。

## 一个表单入口

官方 UI 包只暴露一个业务 hook，返回一层脚本 API。Template 继续使用宿主
Form 和字段组件，不引入 renderer：

```ts
form.model
form.host
form.item('email')
form.load('edit', detail)
form.submit()
form.reset()

form.get()
form.get('profile.email')
form.set('profile.email', 'name@example.com')
form.list('contacts')
form.validate()
form.snapshotDraft()
```

配置也保持一层：

```ts
const form = useElForm({
  defaults,
  tracking: 'explicit',
  rules: {
    name: r.required(),
    extra: ({ values }) => values.type === 'other' ? r.required() : null,
  },
  when,
  linkage,
  options,
  hiddenValues: 'omit',
  submitPolicy: 'join',
  throwOnInvalid: false,
  onSubmit,
})
```

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

## 状态与生命周期

| 成员 | 说明 |
|---|---|
| `model` | 响应式表单模型 |
| `host` | 统一绑定宿主的 `ref`、`model`、`rules` |
| `validating` | resolver 或宿主校验执行中 |
| `item(path)` | 映射宿主字段属性与接口错误 |
| `errors` | 响应式 core / 接口错误 |
| `submitting` | submit 执行中 |
| `submitCount` | 最近一次全量 reset 或 load 后的逻辑提交次数 |
| `submitOk` | 最近一次提交是否成功完成 |
| `dirty` | 当前值是否偏离重置基线 |
| `changedPaths` | 发生变化的 dotted paths |
| `mode` | `create` / `edit` / `detail` |
| `editable` | 新建和编辑时为 true |
| `readonly` | 详情时为 true |
| `load(mode, values?)` | 切换模式；edit/detail 数据成为 clean baseline |
| `submit(handler?)` | 校验、转换并执行提交 |
| `reset(paths?)` | 全量或按路径恢复基线 |
| `subscribe(options)` | 按事件类型和 value/meta 路径订阅 |

## 值与基线

```ts
form.get()
form.set({ name: 'Lin' })
form.get('profile.email')
form.set('profile.email', 'name@example.com')

form.reset()
form.reset('profile.email')
form.rebase(detail)
```

`get(path)` / `set(path, value)` 会根据 `defaults` 检查固定 dotted path 与
字段值类型。动态路径继续使用 `fieldPath()` 生成。

外部响应式模型和精确路径模式：

```ts
const form = useElForm({
  defaults,
  model: externalReactiveModel,
  tracking: 'explicit',
  submitPolicy: 'join',
  valuePolicy,
})

const email = form.field('profile.email') // WritableComputedRef<string>
```

`explicit` 模式不做整棵模型的 deep watch / clone / diff。字段必须通过
`form.field`、`form.set` 或 `form.list` 更新。

## 精确订阅

```ts
const stop = form.subscribe({
  events: ['values', 'meta'],
  paths: ['profile', 'members.*.email'],
  callback(event) {
    console.log(event)
  },
})

stop()
```

`paths` 支持具体前缀和 wildcard 路径；`exact: true` 关闭父子路径匹配。
只配置 `paths` 时，仅接收 values 和 meta 事件。`reset`、`submit-end`
等全局生命周期事件必须通过 `events` 显式选择。

## 草稿

```ts
// 保存：版本化、可 JSON 序列化
localStorage.setItem('draft', JSON.stringify(form.snapshotDraft()))

// 恢复：结构化结果，绝不抛异常
const result = form.restoreDraft(
  JSON.parse(localStorage.getItem('draft') ?? 'null'),
)
```

`result.status` 三态：

- `'restored'` — 草稿与当前基线结构完全一致
- `'healed'` — 丢弃旧路径并用基线值补齐缺失路径
- `'fresh'` — 草稿为空、格式错误或版本不支持，当前值不变

恢复不会重置基线：草稿仍是未保存输入，`dirty` / `changedPaths` 会如实
反映，`reset()` 仍回到基线。恢复时清空错误。

## 模式

```ts
form.load('create')
form.load('edit', detail)
form.load('detail', detail)
```

`load('edit')` 和 `load('detail')` 会把载入记录设成 clean baseline。

## 校验与提交

```ts
const validated = await form.validate()
const emailResult = await form.validateField('email')
const rowResult = await form.validateField('members.*.email')
const submitted = await form.submit()

form.clearValidate()
form.clearValidate(['email', 'name'])
```

`validateField()` 接受具体路径和 wildcard 路径。比如
`members.*.email` 会按当前数组展开为每一行的邮箱字段，不需要业务代码
手工拼接行下标。

按路径校验成功时返回当前输入模型，不会声称整张表单已经完成 transform。
输入输出类型不同时，只有无参数 `validate()` 或 `submit()` 返回 resolver
转换后的完整输出。

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

const form = useElForm({
  defaults: { email: '' },
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

`submitCount` 按逻辑提交计数，复用同一个 Promise 的重复调用只计一次。
新提交开始时 `submitOk` 立即变回 `false`，只有校验和 handler 都成功后才
变为 `true`；全量 `reset()` 或 `load()` 会清空这两个状态。

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
  rules: { type: 'array', min: 1, message: '至少添加一位联系人' },
  focus: 'name',
})

list.append()
list.prepend(undefined, { focus: false })
list.insert(1, undefined, { focus: 'phone' })
list.remove(0)
list.move(1, 0)
list.update(0, { name: 'Lin' })
list.clear()
```


`rules` 注册在数组根路径；挂载 `form.item('contacts')` 显示错误。`focus`
是新增行内的相对路径，在宿主挂载后执行。

数组规则可使用通配路径，只声明一次：

```ts
const form = useElForm({
  defaults: { contacts: [] as Contact[] },
  rules: {
    'contacts.*.name': r.required(),
    'contacts.*.phone': ({ item }) =>
      (item as Contact).phoneRequired ? r.required() : null,
  },
})
```

运行时会展开成 `contacts.0.name` 等宿主路径；固定路径优先于通配规则。

## 组合表单

```ts
const group = useFormGroup({
  base: baseForm,
  details: detailsForm,
})

group.dirty
group.validating
group.changedPaths
group.submitCount
group.submitOk
await group.validate()
await group.submit(async values => api.save(values))
group.reset()
```

每个成员保留自己的宿主和错误；group 聚合校验、滚动、提交、dirty 与
reset。`submitCount` 和 `submitOk` 的 reset / load 语义与单个 form 一致。

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

`FormRulesMap` 交给真实 UI Form 执行。有 active rules 却没有 adapter 时，`form.validate()` 和 `form.submit()` 会返回宿主未绑定错误。没有 UI 宿主的 schema 校验使用 `useZodForm`。

完整选项、rule builders、adapter 契约和类型定义见英文 [API Reference](/api)。
