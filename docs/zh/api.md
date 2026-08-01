# API 速查

日常业务优先从 UI 入口导入：Element Plus 用 `@vformjs/element-plus`，Vue 2.7 用 `@vformjs/element-ui`，Naive UI 和 Ant Design Vue 使用各自同名官方包。

## 常用导入

```ts
import {
  useElForm,
  useZodForm,
  r,
  fieldPath,
  type FormErrors,
  type FormMode,
  type UseFormReturn,
} from '@vformjs/element-plus'
```

Naive UI 使用 `useNaiveForm`，Ant Design Vue 使用 `useAntdForm`；两个包都提供 `/zod` 子路径。

自定义 UI：

```ts
import {
  useForm,
  defineAdapter,
  adapterOk,
  adapterFail,
  r,
} from '@vformjs/vue'
```

## 状态

| 成员 | 说明 |
|---|---|
| `model` | 响应式表单模型 |
| `rules` | 当前归一化宿主规则 |
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
