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

## 写表单实例

`defaults` 会推导 `form.model` 和 `onSubmit(values)` 的类型。

```ts
import { useElForm, r } from '@vformjs/element-plus'

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

## 绑定现有 Form

`form.el` 包含宿主需要的 `ref`、`model`、`rules`。

```vue
<template>
  <el-form v-bind="form.el" label-width="96px">
    <el-form-item label="姓名" prop="name">
      <el-input v-model="form.model.name" />
    </el-form-item>

    <el-form-item
      label="邮箱"
      prop="email"
      :error="form.errors.email?.[0]"
    >
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
<el-form v-if="form.editable" v-bind="form.el">
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
const result = await api.save(form.getValues())

if (!result.ok) {
  form.setErrors(result.fieldErrors)
  form.scrollToFirstError()
}

form.dirty        // 是否偏离当前重置基线
form.changedPaths // 例如 ['email']
```

字段值变化后，对应的旧接口错误会自动清掉。`load('edit')`、`load('detail')`、`rebaseDefaults()`、`reset()` 都会更新基线。

## 条件字段

```ts
const form = useElForm({
  defaults: { type: 'normal', extra: '' },
  when: {
    extra: values => values.type === 'other',
  },
  whenRules: {
    extra: values => values.type === 'other' ? [r.required()] : null,
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

`contacts.fields.value` 提供稳定 key 和当前 index。

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

## Agent CLI

```bash
pnpm dlx vformjs init
pnpm dlx vformjs add form profile
pnpm dlx vformjs doctor
pnpm dlx vformjs migrate vue2-to-vue3 --dry-run --json
pnpm dlx vformjs skill install
```

CLI 根据 `package.json` 选择官方 adapter，并生成带类型的 form 模块。`init`、`add` 重复执行结果一致；文件被修改后默认拒绝覆盖。自动化流程先用 `--dry-run --json` 查看计划。

完整类型和底层方法见 [API 速查](/zh/api)。英文完整指南保留在 [Guide](/guide)。
