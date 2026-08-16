# 快速开始

这页用 Element Plus 跑通一张可提交表单。Vue 2.7 + element-ui 的 API 相同，只需要换安装包。

## 安装

```bash
pnpm add @vformjs/element-plus element-plus vue
```

Vue 2.7 项目：

```bash
pnpm add @vformjs/element-ui element-ui vue@^2.7
```

Vue 3 + Naive UI 或 Ant Design Vue：

```bash
pnpm add @vformjs/naive-ui naive-ui vue
# pnpm add @vformjs/ant-design-vue ant-design-vue vue
```

对应入口是 `useNaiveForm`、`useAntdForm`；Zod 子路径分别是
`@vformjs/naive-ui/zod`、`@vformjs/ant-design-vue/zod`。这两套包已经内置宿主 adapter。

## 每套 UI 只用一个入口

Element Plus 和 element-ui 使用 `useElForm`，Naive UI 使用
`useNaiveForm`，Ant Design Vue 使用 `useAntdForm`。三者的参数和返回
结构一致，不再区分基础、CRUD、动态表单。

生命周期与高级能力都直接放在同一个 `form` 上；页面按需调用方法或增加
顶层配置，不再经过 `values`、`fields`、`validation`、`draft` 二级入口，
也不用先给表单或开发者分类。

`defaults` 会推导 `form.model` 和 `onSubmit(values)` 的类型。
在新建/编辑弹窗中，凡是需要在 `form.load('create')` 时被清除的字段，
都要保留在 defaults 基线里，即使它的新建初始值是 `undefined`。
空值后续会接收其他类型时，建议显式声明表单模型：

```ts
interface PostFormValues {
  postId: number | undefined
  postCode: string | undefined
  postName: string | undefined
  postSort: number
  status: string
  remark: string | undefined
}

const form = useElForm<PostFormValues>({
  defaults: {
    postId: undefined,
    postCode: undefined,
    postName: undefined,
    postSort: 0,
    status: '0',
    remark: undefined,
  },
})
```

因此，`postId: undefined` 是有意保留的：`form.load('edit', detail)`
之后再次执行 `form.load('create')` 时，它会恢复为 `undefined`，不会把已编辑记录的
标识符遗留在 model 中。

```ts
import { r, useElForm } from '@vformjs/element-plus'

const form = useElForm({
  defaults: {
    name: '',
    email: '',
  },
  rules: {
    name: [r.required(), r.min(2)],
    email: [r.required(), r.email()],
  },
  onSubmit: async (values) => {
    await api.save(values)
  },
})
```

需要英文规则消息时创建独立实例，不修改全局状态：

```ts
import { createRuleBuilders, enUSRuleMessages } from '@vformjs/element-plus'
const en = createRuleBuilders(enUSRuleMessages)
en.required() // Required
```

## 绑定现有 Form

`form.host` 包含宿主需要的 `ref`、`model`、`rules`。宿主原生 `prop`
能满足 UI 自身校验；core 或 API 字段错误需要投影到 FormItem 时，使用
`form.item(path)`。

```vue
<template>
  <el-form v-bind="form.host" label-width="96px">
    <el-form-item label="姓名" prop="name">
      <el-input v-model="form.model.name" />
    </el-form-item>

    <el-form-item label="邮箱" prop="email">
      <el-input v-model="form.model.email" />
    </el-form-item>

    <el-button
      type="primary"
      :loading="form.submitting"
      @click="form.submit()"
    >
      提交
    </el-button>
  </el-form>
</template>
```

## 新建、编辑、详情

form 实例放在弹窗或表单页里。列表页只负责打开弹窗或跳转路由。

```ts
form.load('create')
form.load('edit', detail)
form.load('detail', detail)
```

```vue
<el-form v-if="form.editable" v-bind="form.host">
  <!-- inputs -->
</el-form>

<el-descriptions v-else border>
  <el-descriptions-item label="姓名">
    {{ form.model.name }}
  </el-descriptions-item>
</el-descriptions>
```

详情页直接展示文本。整张 disabled form 会保留多余的输入框视觉和交互语义。

## 接口错误和未保存状态

```ts
import { submitFail } from '@vformjs/element-plus'
const result = await form.submit(async (values) => {
  const response = await api.save(values)
  if (!response.ok) {
    return submitFail(response.error, {
      errors: response.fieldErrors,
    })
  }
})

if (!result.ok && 'submitError' in result)
  result.submitError // 保留 API 错误的具体类型
```

`submitFail` 会把可选字段错误同步到响应式 `form.errors`。校验失败仍是原来的
`{ ok: false, values, errors }` 分支。handler 抛出或 reject 时仍然按异常传播；
可预期的 API 失败需要显式转换。
提交失败默认滚动到第一个字段错误；只有页面自行处理错误导航时才设置
`scrollToError: false`。

```ts
form.dirty        // 是否偏离当前重置基线
form.changedPaths // 例如 ['email']
```

字段值变化后，对应的旧接口错误会自动清掉。`load('edit')`、
`load('detail')`、`form.rebase()`、`reset()` 都会更新基线。

大型表单可设置 `tracking: 'explicit'`，并用
`form.field('profile.email')` 获得类型安全的可写 computed。此模式不会全量
deep watch / clone 模型；更新必须经过 `form.field`、`form.set` 或字段数组方法。

## 条件字段

```ts
const form = useElForm({
  defaults: { type: 'normal', extra: '' },
  rules: {
    extra: ({ values }) =>
      values.type === 'other' ? r.required() : null,
  },
  when: {
    extra: values => values.type === 'other',
  },
})
```

```vue
<el-form-item
  v-if="!form.hidden('extra').value"
  label="补充说明"
  prop="extra"
>
  <el-input v-model="form.model.extra" />
</el-form-item>
```

## 动态数组

```ts
const contacts = form.list<{ name: string, phone: string }>('contacts', {
  defaultItem: () => ({ name: '', phone: '' }),
})

contacts.append()
contacts.remove(0)
contacts.move(1, 0)
```

`contacts.fields` 提供稳定 key 和当前 index，key 不会写入业务数据。

行规则可写成 `'contacts.*.name': r.required()`。条件规则回调接收
`{ values, item, index, path }`，可读取当前行和展开后的宿主路径。

多个独立宿主表单使用 `useFormGroup({ base, details, fees })` 显式组合；
group 聚合 `validate`、`submit`、`dirty`、`changedPaths`、错误滚动和 `reset`。

## Zod

没有 UI 宿主，或者提交值需要 coerce / transform 时，可以让 Zod 管校验。

```ts
import { z } from 'zod'
import { useZodForm } from '@vformjs/element-plus/zod'

const form = useZodForm({
  schema: z.object({
    email: z.email(),
    age: z.coerce.number().min(0),
  }),
  defaults: { email: '', age: 0 },
  onSubmit: async (values) => {
    await api.save(values)
  },
})
```

Naive UI 与 Ant Design Vue 项目只需把导入路径换成各自官方包的 `/zod` 子路径。

Zod 是 core 的唯一 resolver，支持异步 refine；UI adapter 只处理宿主绑定、错误展示和滚动。

## Agent CLI

```bash
pnpm dlx vformjs init
pnpm dlx vformjs add form profile
pnpm dlx vformjs audit forms --json
pnpm dlx vformjs doctor
pnpm dlx vformjs migrate vue2-to-vue3 --dry-run --json
pnpm dlx vformjs skill install
```

CLI 根据 `package.json` 选择官方 adapter。生成模块包含类型安全路径、类型化提交结果、独立语言规则，以及唯一的 `form.host` / `form.item(path)` 绑定；Zod 只从 `/zod` 子入口导入。`init`、`add` 可重复执行，已编辑文件默认拒绝覆盖。

`audit forms` 会解析 Vue SFC 模板并识别精确的单/多宿主、自定义宿主和
Options API。只有包含 FormItem 的条件与循环才会标为条件字段或动态数组；
外部模型也必须实际绑定到宿主 Form。命令只读源码并给出保守的自动/人工
分类。私有 UI 包不做自动检测；使用 `--adapter-package` 和
`--form-factory` 显式配置业务 preset。

完整类型和底层方法见 [API 速查](/zh/api)。英文完整指南保留在 [Guide](/guide)。
